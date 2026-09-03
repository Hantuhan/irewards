import { applyLevelMultiplier } from "@/lib/loyalty/tiers";
import { pointsForPaidOrder, pointsDiscountCents } from "@/lib/loyalty/points";
import { bestPointsMultiplier, dayOfWeekId } from "@/lib/loyalty/points-rules";
import type { PointsRule } from "@/lib/loyalty/points-rules";

/** Cashback-equivalent % from earn + redeem rates (MY/SG F&B benchmark). */
export function effectiveEarnBackPercent(
  pointsPerRinggit: number,
  centsPerPoint: number,
): number {
  return pointsPerRinggit * centsPerPoint;
}

export function simulatePointsEarn(input: {
  totalCents: number;
  pointsPerRinggit: number;
  tierMultiplier: number;
  rules: PointsRule[];
  tierName: string;
  orderMenuItemIds?: string[];
  at?: Date;
  /** Merchant IANA timezone for Bonus Days (default Asia/Kuala_Lumpur). */
  timeZone?: string;
}): {
  basePoints: number;
  combinedMultiplier: number;
  finalPoints: number;
} {
  const basePoints = pointsForPaidOrder(input.totalCents, input.pointsPerRinggit);
  const combinedMultiplier = bestPointsMultiplier(
    input.rules.filter((r) => r.status === "active"),
    {
      tierName: input.tierName,
      dayOfWeek: dayOfWeekId(input.at ?? new Date(), input.timeZone ?? "Asia/Kuala_Lumpur"),
      orderMenuItemIds: input.orderMenuItemIds ?? [],
    },
    input.tierMultiplier,
  );
  const finalPoints = applyLevelMultiplier(basePoints, combinedMultiplier);
  return { basePoints, combinedMultiplier, finalPoints };
}

export function simulatePointsRedeem(input: {
  pointsToRedeem: number;
  centsPerPoint: number;
  subtotalCents: number;
  pointsBalance: number;
}): {
  pointsApplied: number;
  discountCents: number;
  cappedReason?: string;
} {
  const centsPerPoint = input.centsPerPoint > 0 ? input.centsPerPoint : 10;
  const maxBySubtotal = Math.floor(input.subtotalCents / centsPerPoint);
  const pointsApplied = Math.min(input.pointsToRedeem, input.pointsBalance, maxBySubtotal);
  let cappedReason: string | undefined;
  if (pointsApplied < input.pointsToRedeem) {
    if (pointsApplied === input.pointsBalance) cappedReason = "limited by member balance";
    else if (pointsApplied === maxBySubtotal) cappedReason = "limited by order subtotal";
  }
  return {
    pointsApplied,
    discountCents: pointsDiscountCents(pointsApplied, centsPerPoint),
    cappedReason,
  };
}
