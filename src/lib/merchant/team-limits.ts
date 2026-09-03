/** Max merchant logins per cafe (owner + staff). */
export const MAX_MERCHANT_USERS = 5;

export type MerchantUserSeat = {
  used: number;
  limit: number;
  remaining: number;
};

export function merchantUserSeats(
  users: Array<{ active?: boolean | null }>,
): MerchantUserSeat {
  const used = users.filter((user) => user.active !== false).length;
  return {
    used,
    limit: MAX_MERCHANT_USERS,
    remaining: Math.max(0, MAX_MERCHANT_USERS - used),
  };
}
