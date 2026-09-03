import { createJoinTokenValue } from "@/lib/loyalty/join-token";
import {
  createJoinToken,
  deductPointsFromCustomer,
  getCustomerById,
  hasPointsLedgerEntry,
  markOrderPaid,
} from "@/lib/db/repository";
import {
  hasPromoRedemptionForOrder,
  recordPromoRedemption,
} from "@/lib/db/merchant-repository";
import { runCampaignTrigger } from "@/lib/campaigns/workflow-runtime";
import { awardOrderPointsIfEligible } from "@/lib/services/loyalty-points";
import {
  awardOrderStampsIfEligible,
  consumeStampRewardForPaidOrder,
} from "@/lib/services/loyalty-stamps";
import { updateCustomerVisitAndUsual } from "@/lib/services/automation";

export type PaymentCompletionResult = {
  orderId: string;
  joinToken: string;
  pointsAwarded: number;
  stampsAwarded: number;
};

/** Called only after payment is verified (webhook or dev-pay). */
export async function completePaidOrder(
  orderId: string,
  paymentRef: string,
): Promise<PaymentCompletionResult> {
  const order = await markOrderPaid(orderId, paymentRef);
  const joinToken = createJoinTokenValue();
  await createJoinToken(order.id, joinToken);

  let pointsAwarded = 0;
  let stampsAwarded = 0;
  let lifetimePointsBefore: number | undefined;

  // Rewards this order was quoted with are only spent now that it is paid, so
  // abandoning the payment screen costs the diner nothing. Both writes are
  // guarded, because a payment webhook can be delivered more than once.
  if (order.promo_id && !(await hasPromoRedemptionForOrder(order.id))) {
    await recordPromoRedemption({
      promoId: order.promo_id,
      customerId: order.customer_id,
      orderId: order.id,
    });
  }

  if (order.stamp_reward_applied && order.customer_id) {
    await consumeStampRewardForPaidOrder({
      merchantId: order.merchant_id,
      customerId: order.customer_id,
      orderId: order.id,
    });
  }

  if (order.customer_id) {
    let customer = await getCustomerById(order.customer_id);
    lifetimePointsBefore = customer?.lifetime_points_earned ?? undefined;
    if (customer && order.points_redeemed > 0) {
      const alreadyDeducted = await hasPointsLedgerEntry(
        order.id,
        customer.id,
        "points_redeemed",
      );
      if (!alreadyDeducted) {
        customer = await deductPointsFromCustomer({
          customer,
          orderId: order.id,
          points: order.points_redeemed,
          reason: "points_redeemed",
        });
      }
    }

    if (customer?.is_member) {
      pointsAwarded = await awardOrderPointsIfEligible({
        customer,
        merchantId: order.merchant_id,
        orderId: order.id,
        totalCents: order.total_cents,
      });
      stampsAwarded = await awardOrderStampsIfEligible({
        customer,
        merchantId: order.merchant_id,
        orderId: order.id,
      });
      await updateCustomerVisitAndUsual(order.id, customer.id);
    }
  }

  const customerAfter = order.customer_id ? await getCustomerById(order.customer_id) : null;

  await runCampaignTrigger("order_paid", {
    merchantId: order.merchant_id,
    customer: customerAfter,
    orderId: order.id,
    orderTotalCents: order.total_cents,
  });

  if (pointsAwarded > 0 && customerAfter) {
    await runCampaignTrigger("points_milestone", {
      merchantId: order.merchant_id,
      customer: customerAfter,
      orderId: order.id,
      previousLifetimePoints: lifetimePointsBefore,
    });
  }

  return { orderId: order.id, joinToken, pointsAwarded, stampsAwarded };
}
