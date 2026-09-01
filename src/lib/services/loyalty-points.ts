import {
  applyLevelMultiplier,
  buildCustomerTierSnapshot,
  resolveCustomerLevel,
} from "@/lib/loyalty/tiers";
import { pointsForPaidOrder } from "@/lib/loyalty/points";
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
): Promise<number> {
  const [levels, merchant] = await Promise.all([
    getRewardLevels(merchantId),
    getMerchantById(merchantId),
  ]);
  const level = resolveCustomerLevel(customer.lifetime_points_earned, levels);
  const rate = Number(merchant?.points_per_ringgit ?? 0.1);
  const basePoints = pointsForPaidOrder(totalCents, rate);
  return applyLevelMultiplier(basePoints, Number(level.points_multiplier));
}

export async function awardOrderPointsIfEligible(input: {
  customer: CustomerRow;
  merchantId: string;
  orderId: string;
  totalCents: number;
}): Promise<number> {
  if (!input.customer.is_member) return 0;

  const alreadyAwarded = await hasPointsLedgerEntry(
    input.orderId,
    input.customer.id,
    "order_paid",
  );
  if (alreadyAwarded) return 0;

  const points = await calculateOrderPointsAward(
    input.customer,
    input.merchantId,
    input.totalCents,
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
