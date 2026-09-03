import {
  applyLevelMultiplier,
  buildCustomerTierSnapshot,
  resolveCustomerLevel,
} from "@/lib/loyalty/tiers";
import { pointsForPaidOrder } from "@/lib/loyalty/points";
import { bestPointsMultiplier, dayOfWeekId } from "@/lib/loyalty/points-rules";
import { listPointsRules } from "@/lib/db/points-rules-repository";
import { getOrderItemsForOrder } from "@/lib/db/merchant-repository";
import {
  awardPointsToCustomer,
  getMerchantById,
  getRewardLevels,
  hasPointsLedgerEntry,
} from "@/lib/db/repository";
import type { CustomerRow } from "@/lib/db/types";

/**
 * Points a paid order is worth. Single source of truth — the award path and the
 * diner-facing preview both go through here so the number shown before payment
 * is the number credited after it.
 */
export async function computeOrderPoints(input: {
  merchantId: string;
  totalCents: number;
  /** Drives tier resolution; 0 for a guest who has not joined yet. */
  lifetimePointsEarned: number;
  orderMenuItemIds?: string[];
  at?: Date;
}): Promise<number> {
  const [levels, merchant, rules] = await Promise.all([
    getRewardLevels(input.merchantId),
    getMerchantById(input.merchantId),
    listPointsRules(input.merchantId),
  ]);
  const level = resolveCustomerLevel(input.lifetimePointsEarned, levels);
  const rate = Number(merchant?.points_per_ringgit ?? 0.1);
  const basePoints = pointsForPaidOrder(input.totalCents, rate);
  const timeZone = merchant?.timezone?.trim() || "Asia/Kuala_Lumpur";
  const multiplier = bestPointsMultiplier(
    rules,
    {
      tierName: level.name,
      dayOfWeek: dayOfWeekId(input.at ?? new Date(), timeZone),
      orderMenuItemIds: input.orderMenuItemIds ?? [],
    },
    Number(level.points_multiplier),
  );
  return applyLevelMultiplier(basePoints, multiplier);
}

export async function calculateOrderPointsAward(
  customer: CustomerRow,
  merchantId: string,
  totalCents: number,
  orderMenuItemIds: string[] = [],
  at = new Date(),
): Promise<number> {
  return computeOrderPoints({
    merchantId,
    totalCents,
    lifetimePointsEarned: customer.lifetime_points_earned,
    orderMenuItemIds,
    at,
  });
}

export type OrderPointsPreview = {
  /** False when the merchant has switched the points program off. */
  enabled: boolean;
  /** True when a signed-in member will be credited automatically on payment. */
  isMember: boolean;
  /** Points this order is worth. For a guest, what joining after payment claims. */
  points: number;
};

/**
 * What the diner earns on this order, for display before payment.
 *
 * A guest sees the same figure a member would at tier 1, which is truthful:
 * joining after payment awards the order's points retroactively.
 */
export async function previewOrderPoints(input: {
  merchantId: string;
  totalCents: number;
  customer: CustomerRow | null;
  orderMenuItemIds?: string[];
}): Promise<OrderPointsPreview> {
  const merchant = await getMerchantById(input.merchantId);
  if (!merchant || merchant.points_program_enabled === false) {
    return { enabled: false, isMember: false, points: 0 };
  }

  const isMember = Boolean(input.customer?.is_member);
  const points = await computeOrderPoints({
    merchantId: input.merchantId,
    totalCents: input.totalCents,
    lifetimePointsEarned: isMember ? (input.customer?.lifetime_points_earned ?? 0) : 0,
    orderMenuItemIds: input.orderMenuItemIds,
  });

  return { enabled: true, isMember, points };
}

export async function awardOrderPointsIfEligible(input: {
  customer: CustomerRow;
  merchantId: string;
  orderId: string;
  totalCents: number;
}): Promise<number> {
  if (!input.customer.is_member) return 0;

  const merchant = await getMerchantById(input.merchantId);
  if (merchant && merchant.points_program_enabled === false) return 0;

  const alreadyAwarded = await hasPointsLedgerEntry(
    input.orderId,
    input.customer.id,
    "order_paid",
  );
  if (alreadyAwarded) return 0;

  const items = await getOrderItemsForOrder(input.orderId);
  const menuIds = items
    .map((i) => i.menu_item_id)
    .filter((id): id is string => Boolean(id));

  const points = await calculateOrderPointsAward(
    input.customer,
    input.merchantId,
    input.totalCents,
    menuIds,
  );

  await awardPointsToCustomer({
    customer: input.customer,
    orderId: input.orderId,
    points,
    reason: "order_paid",
  });

  return points;
}

export async function getCustomerTierForMerchant(
  customer: CustomerRow,
  merchantId: string,
) {
  const levels = await getRewardLevels(merchantId);
  return buildCustomerTierSnapshot(customer.lifetime_points_earned, levels);
}
