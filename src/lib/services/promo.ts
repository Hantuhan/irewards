import type { PromoRow } from "@/lib/db/types";
import {
  countPendingPromoHolds,
  countPromoRedemptions,
} from "@/lib/db/merchant-repository";

export function calculatePromoDiscountCents(
  promo: PromoRow,
  subtotalCents: number,
): number {
  if (!promo.active) return 0;
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return 0;
  if (promo.min_spend_cents && subtotalCents < promo.min_spend_cents) return 0;

  if (promo.type === "percentage") {
    return Math.floor(subtotalCents * (Number(promo.value) / 100));
  }
  return Math.min(subtotalCents, Math.round(Number(promo.value) * 100));
}

export type PromoEvaluation =
  | { ok: true; discountCents: number }
  /** `reason` is shown to the diner, so it says what to do next. */
  | { ok: false; discountCents: 0; reason: string };

/** The shape checks that need no database access. */
function staticIssue(promo: PromoRow, subtotalCents: number): string | null {
  if (!promo.active) return "That promo code is no longer available.";
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return "That promo code has expired.";
  }
  if (promo.min_spend_cents && subtotalCents < promo.min_spend_cents) {
    const ringgit = (promo.min_spend_cents / 100).toFixed(2);
    return `That promo code needs a minimum spend of ${ringgit}.`;
  }
  return null;
}

/**
 * Whether this promo can be used on this order, and for how much.
 *
 * Usage limits are counted as banked redemptions plus unpaid orders already
 * quoted with the code — without the holds, two carts open at once could both
 * spend the last use of a one-per-member voucher.
 *
 * A campaign voucher goes out over WhatsApp to hundreds of members at once, so
 * "no limit" is not a safe default for anything with a code: one screenshot in
 * a group chat is otherwise unlimited free discount.
 */
export async function evaluatePromoForCheckout(input: {
  promo: PromoRow;
  subtotalCents: number;
  customerId: string | null;
  /** Set when re-checking an order that already holds this promo. */
  excludeOrderId?: string | null;
}): Promise<PromoEvaluation> {
  const { promo, subtotalCents, customerId, excludeOrderId } = input;

  const issue = staticIssue(promo, subtotalCents);
  if (issue) return { ok: false, discountCents: 0, reason: issue };

  if (promo.usage_limit != null) {
    const [used, held] = await Promise.all([
      countPromoRedemptions(promo.id),
      countPendingPromoHolds(promo.id, null, excludeOrderId),
    ]);
    if (used + held >= promo.usage_limit) {
      return {
        ok: false,
        discountCents: 0,
        reason: "That promo code has been fully claimed.",
      };
    }
  }

  if (promo.per_customer_limit != null) {
    if (!customerId) {
      return {
        ok: false,
        discountCents: 0,
        reason:
          "That promo code is for members. Load your points with your mobile number first, then apply it.",
      };
    }
    const [used, held] = await Promise.all([
      countPromoRedemptions(promo.id, customerId),
      countPendingPromoHolds(promo.id, customerId, excludeOrderId),
    ]);
    if (used + held >= promo.per_customer_limit) {
      return {
        ok: false,
        discountCents: 0,
        reason:
          promo.per_customer_limit === 1
            ? "You have already used that promo code."
            : `You have already used that promo code ${promo.per_customer_limit} times.`,
      };
    }
  }

  const discountCents = calculatePromoDiscountCents(promo, subtotalCents);
  if (discountCents <= 0) {
    return {
      ok: false,
      discountCents: 0,
      reason: "That promo code does not apply to this order.",
    };
  }

  return { ok: true, discountCents };
}
