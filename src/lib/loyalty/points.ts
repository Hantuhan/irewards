/**
 * Points are only awarded after payment is verified server-side.
 */

export const FIRST_JOIN_BONUS_POINTS = 1;
export const POINTS_REDEEM_VALUE_CENTS = 10; // 1 point = 10 sen off

export function pointsForPaidOrder(totalCents: number, pointsPerRinggit = 0.1): number {
  const rm = totalCents / 100;
  const rate = pointsPerRinggit > 0 ? pointsPerRinggit : 0.1;
  return Math.max(1, Math.floor(rm * rate));
}

export function pointsDiscountCents(pointsToRedeem: number): number {
  return Math.max(0, pointsToRedeem) * POINTS_REDEEM_VALUE_CENTS;
}

export function canAwardFirstJoinBonus(alreadyMember: boolean): boolean {
  return !alreadyMember;
}
