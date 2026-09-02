/**
 * Points are only awarded after payment is verified server-side.
 */

export const FIRST_JOIN_BONUS_POINTS = 1;
/** Default when merchant setting unavailable (10 sen = RM 0.10). */
export const DEFAULT_CENTS_PER_POINT = 10;

export function pointsForPaidOrder(totalCents: number, pointsPerRinggit = 0.1): number {
  const rm = totalCents / 100;
  const rate = pointsPerRinggit > 0 ? pointsPerRinggit : 0.1;
  return Math.max(1, Math.floor(rm * rate));
}

export function pointsDiscountCents(
  pointsToRedeem: number,
  centsPerPoint = DEFAULT_CENTS_PER_POINT,
): number {
  const rate = centsPerPoint > 0 ? centsPerPoint : DEFAULT_CENTS_PER_POINT;
  return Math.max(0, pointsToRedeem) * rate;
}

export function canAwardFirstJoinBonus(alreadyMember: boolean): boolean {
  return !alreadyMember;
}
