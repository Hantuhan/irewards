export type MerchantCurrency = "MYR" | "SGD";

export function currencyDisplayCode(currency: MerchantCurrency): string {
  return currency === "SGD" ? "SGD" : "RM";
}

export function formatMerchantPrice(cents: number, currency: MerchantCurrency): string {
  return `${currencyDisplayCode(currency)} ${(cents / 100).toFixed(2)}`;
}

export function centsToPriceInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parsePriceToCents(input: string): number {
  const normalized = input.trim().replace(/,/g, "");
  if (!normalized) return 0;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}
