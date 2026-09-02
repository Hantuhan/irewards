/** Format multipliers and rates for display (avoids float artifacts like 1.4999999999999998). */
export function formatDecimal(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return (0).toFixed(decimals);
  return value.toFixed(decimals);
}

export function formatMultiplier(value: number, decimals = 2): string {
  return formatDecimal(value, decimals);
}
