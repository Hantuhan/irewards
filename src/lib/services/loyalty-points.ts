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

export async function calculateOrderPointsAward(
  customer: CustomerRow,
  merchantId: string,
  totalCents: number,
  orderMenuItemIds: string[] = [],
  at = new Date(),
): Promise<number> {
  const [levels, merchant, rules] = await Promise.all([
    getRewardLevels(merchantId),
    getMerchantById(merchantId),
    listPointsRules(merchantId),
  ]);
  const level = resolveCustomerLevel(customer.lifetime_points_earned, levels);
  const rate = Number(merchant?.points_per_ringgit ?? 0.1);
  const basePoints = pointsForPaidOrder(totalCents, rate);
  const timeZone = merchant?.timezone?.trim() || "Asia/Kuala_Lumpur";
  const multiplier = bestPointsMultiplier(
    rules,
    {
      tierName: level.name,
      dayOfWeek: dayOfWeekId(at, timeZone),
      orderMenuItemIds,
    },
    Number(level.points_multiplier),
  );
  return applyLevelMultiplier(basePoints, multiplier);
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
