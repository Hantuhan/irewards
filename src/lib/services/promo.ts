import type { PromoRow } from "@/lib/db/types";

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
