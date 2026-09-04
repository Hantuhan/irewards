/**
 * Voiding and refunding orders.
 *
 * Giving the money back is the easy half. The hard half is that a paid order
 * has already moved loyalty: points awarded, stamps earned, a voucher spent, a
 * stamp reward consumed, points redeemed. Refunding without unwinding those
 * leaves the member holding rewards for a sale that did not happen, and the
 * merchant's reports overstating revenue forever.
 *
 * Order of operations is deliberate. The money moves first, because that is
 * the step that can fail on someone else's server; if it fails, nothing has
 * been unwound and the merchant can try again. Everything after it is our own
 * database and is reported back, including what could not be reversed.
 */

import {
  clawBackPointsFromCustomer,
  getCustomerById,
  getOrderById,
  markOrderCancelled,
  markOrderRefunded,
  restoreRedeemedPoints,
  sumPointsLedgerForOrder,
} from "@/lib/db/repository";
import { providerForOrder } from "@/lib/payments/provider";
import type { OrderRow } from "@/lib/db/types";

export class RefundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundError";
  }
}

export type RefundOutcome = {
  orderId: string;
  status: OrderRow["status"];
  refundedCents: number;
  full: boolean;
  payment: "refunded" | "skipped";
  pointsClawedBack: number;
  pointsReturned: number;
  stampsClawedBack: number;
  stampRewardRestored: boolean;
  promoReleased: boolean;
  /** Things the merchant should know but which do not fail the refund. */
  warnings: string[];
};

/** A void: an unpaid order killed before any money moved. */
export async function voidPendingOrder(input: {
  merchantId: string;
  orderId: string;
  reason: string;
  userId: string | null;
}): Promise<OrderRow> {
  const order = await getOrderById(input.orderId);
  if (!order || order.merchant_id !== input.merchantId) {
    throw new RefundError("Order not found");
  }
  if (order.status === "paid") {
    throw new RefundError("That order is already paid — refund it instead of voiding it.");
  }
  if (order.status !== "pending") {
    throw new RefundError("That order is not awaiting payment.");
  }

  // Nothing was charged and nothing was awarded, so there is nothing to
  // unwind: the promo and stamp holds are keyed off `status = 'pending'` and
  // release themselves the moment this row stops being pending.
  return markOrderCancelled({
    orderId: input.orderId,
    reason: input.reason,
    userId: input.userId,
  });
}

export async function refundPaidOrder(input: {
  merchantId: string;
  orderId: string;
  /** Omit for a full refund. */
  amountCents?: number;
  reason: string;
  userId: string | null;
  currency: "MYR" | "SGD";
}): Promise<RefundOutcome> {
  const order = await getOrderById(input.orderId);
  if (!order || order.merchant_id !== input.merchantId) {
    throw new RefundError("Order not found");
  }
  if (order.status === "refunded") {
    throw new RefundError("That order has already been fully refunded.");
  }
  if (order.status !== "paid") {
    throw new RefundError(
      order.status === "pending"
        ? "That order was never paid — void it instead of refunding it."
        : "That order cannot be refunded.",
    );
  }

  const alreadyRefunded = Number(order.refunded_cents ?? 0);
  const remaining = order.total_cents - alreadyRefunded;
  if (remaining <= 0) {
    throw new RefundError("There is nothing left to refund on that order.");
  }

  const refundCents = Math.round(input.amountCents ?? remaining);
  if (refundCents <= 0) {
    throw new RefundError("Enter a refund amount greater than zero.");
  }
  if (refundCents > remaining) {
    throw new RefundError(
      `That is more than is left on this order. At most ${(remaining / 100).toFixed(2)} can be refunded.`,
    );
  }

  const full = refundCents === remaining && alreadyRefunded === 0;
  const warnings: string[] = [];

  // 1. Money first: the only step that depends on someone else's server. If it
  //    fails nothing has been unwound and the merchant can simply try again.
  let payment: "refunded" | "skipped" = "skipped";
  // Back to whoever charged it, not to whoever is configured today. A null
  // provider means dev mode: no money was taken, so none is given back, and
  // the loyalty unwind below still has to happen.
  const chargedBy = providerForOrder(order.payment_provider);
  if (order.payment_ref && chargedBy) {
    const result = await chargedBy.refund({
      paymentRef: order.payment_ref,
      amountCents: refundCents,
      currency: input.currency,
    });
    payment = result.status;
  } else if (!order.payment_ref) {
    warnings.push("No payment reference on this order, so nothing was sent to the payment provider.");
  } else {
    warnings.push("This order was paid in dev mode, so there was no real payment to refund.");
  }

  // 2. Unwind loyalty.
  let pointsClawedBack = 0;
  let pointsReturned = 0;
  let stampsClawedBack = 0;
  let stampRewardRestored = false;
  let promoReleased = false;

  const customer = order.customer_id ? await getCustomerById(order.customer_id) : null;

  if (customer) {
    // Points earned on the order come back off, in proportion to what is being
    // refunded, so a half refund does not wipe the whole award.
    const awarded = await sumPointsLedgerForOrder(order.id, customer.id, "order_paid");
    if (awarded > 0) {
      const share = full ? awarded : Math.round((awarded * refundCents) / order.total_cents);
      const result = await clawBackPointsFromCustomer({
        customer,
        orderId: order.id,
        points: share,
        reason: "order_refunded",
      });
      pointsClawedBack = result.clawedBack;
      if (result.shortfall > 0) {
        warnings.push(
          `${result.shortfall} point${result.shortfall === 1 ? "" : "s"} could not be taken back — the member had already spent them.`,
        );
      }
    }

    // Points the member spent on this order are given back, but only on a full
    // refund: a partial refund still delivered most of the order.
    if (full && order.points_redeemed > 0) {
      const fresh = (await getCustomerById(customer.id)) ?? customer;
      await restoreRedeemedPoints({
        customer: fresh,
        orderId: order.id,
        points: order.points_redeemed,
      });
      pointsReturned = order.points_redeemed;
    }

    if (full) {
      const reversal = await reverseStampsAndVouchers(order, customer.id);
      stampsClawedBack = reversal.stampsClawedBack;
      stampRewardRestored = reversal.stampRewardRestored;
      warnings.push(...reversal.warnings);
    }
  }

  // A one-per-member voucher must become usable again — the member never got
  // what they spent it on.
  if (full && order.promo_id) {
    const { releasePromoRedemptionForOrder } = await import("@/lib/db/merchant-repository");
    promoReleased = await releasePromoRedemptionForOrder(order.id);
  }

  const updated = await markOrderRefunded({
    orderId: order.id,
    refundedCents: alreadyRefunded + refundCents,
    reason: input.reason,
    userId: input.userId,
    full,
  });

  return {
    orderId: order.id,
    status: updated.status,
    refundedCents: refundCents,
    full,
    payment,
    pointsClawedBack,
    pointsReturned,
    stampsClawedBack,
    stampRewardRestored,
    promoReleased,
    warnings,
  };
}

async function reverseStampsAndVouchers(
  order: OrderRow,
  customerId: string,
): Promise<{ stampsClawedBack: number; stampRewardRestored: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  const { reverseOrderStamps, restoreStampRewardForRefund } = await import(
    "@/lib/services/loyalty-stamps"
  );

  const stampsClawedBack = await reverseOrderStamps({
    merchantId: order.merchant_id,
    customerId,
    orderId: order.id,
  }).catch((err) => {
    warnings.push(
      `Stamps could not be reversed automatically: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return 0;
  });

  let stampRewardRestored = false;
  if (order.stamp_reward_applied) {
    stampRewardRestored = await restoreStampRewardForRefund({
      merchantId: order.merchant_id,
      customerId,
      orderId: order.id,
    }).catch((err) => {
      warnings.push(
        `The stamp reward could not be given back automatically: ${err instanceof Error ? err.message : "unknown error"}`,
      );
      return false;
    });
  }

  return { stampsClawedBack, stampRewardRestored, warnings };
}
