export type MerchantCurrency = "MYR" | "SGD";

export type TaxFlags = {
  sstEnabled: boolean;
  gstEnabled: boolean;
};

/** Enable SST for MYR merchants, GST for SGD merchants. */
export function syncTaxFlagsForCurrency(currency: MerchantCurrency): TaxFlags {
  if (currency === "MYR") {
    return { sstEnabled: true, gstEnabled: false };
  }
  return { sstEnabled: false, gstEnabled: true };
}
