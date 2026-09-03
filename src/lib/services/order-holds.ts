/**
 * How long an unpaid order keeps hold of what it was quoted.
 *
 * Pending orders are never expired or cancelled, so a hold with no time bound
 * is permanent: one abandoned payment screen would reserve a diner's points —
 * or their only use of a one-per-member voucher — for good.
 *
 * A payment session lasts minutes, so anything older than this is an
 * abandoned cart. The trade is bounded and deliberate: an order paid after the
 * window can over-spend a limit by one, which is far better than locking an
 * honest diner out of their own reward forever.
 */
export const PENDING_ORDER_HOLD_MINUTES = 30;

/** ISO timestamp before which a pending order no longer holds anything. */
export function pendingHoldCutoffIso(): string {
  return new Date(Date.now() - PENDING_ORDER_HOLD_MINUTES * 60_000).toISOString();
}
