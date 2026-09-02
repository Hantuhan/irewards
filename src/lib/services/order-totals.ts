import type { MerchantRow } from "@/lib/db/types";

export type MerchantChargeSettings = {
  currency: "MYR" | "SGD";
  serviceChargeEnabled: boolean;
  serviceChargePercent: number;
  sstEnabled: boolean;
  sstRatePercent: number;
  gstEnabled: boolean;
  gstRatePercent: number;
};

export type OrderTotals = {
  subtotalCents: number;
  serviceChargeCents: number;
  serviceChargeLabel: string | null;
  taxCents: number;
  taxLabel: string | null;
  discountCents: number;
  totalCents: number;
};

export function merchantChargeSettingsFromRow(merchant: MerchantRow): MerchantChargeSettings {
  return {
    currency: merchant.currency,
    serviceChargeEnabled: merchant.service_charge_enabled ?? false,
    serviceChargePercent: Number(merchant.service_charge_percent ?? 10),
    sstEnabled: merchant.sst_enabled ?? false,
    sstRatePercent: Number(merchant.sst_rate_percent ?? 6),
    gstEnabled: merchant.gst_enabled ?? false,
    gstRatePercent: Number(merchant.gst_rate_percent ?? 9),
  };
}

/** Subtotal → service charge → tax (SST/GST) → discounts. */
export function calculateOrderTotals(
  subtotalCents: number,
  discountCents: number,
  settings: MerchantChargeSettings,
): OrderTotals {
  const serviceChargeCents = settings.serviceChargeEnabled
    ? Math.round(subtotalCents * (settings.serviceChargePercent / 100))
    : 0;

  const taxableBase = subtotalCents + serviceChargeCents;

  let taxCents = 0;
  let taxLabel: string | null = null;

  if (settings.currency === "MYR" && settings.sstEnabled) {
    taxCents = Math.round(taxableBase * (settings.sstRatePercent / 100));
    taxLabel = `SST (${settings.sstRatePercent}%)`;
  } else if (settings.currency === "SGD" && settings.gstEnabled) {
    taxCents = Math.round(taxableBase * (settings.gstRatePercent / 100));
    taxLabel = `GST (${settings.gstRatePercent}%)`;
  }

  const serviceChargeLabel = settings.serviceChargeEnabled
    ? `Service charge (${settings.serviceChargePercent}%)`
    : null;

  const grossCents = taxableBase + taxCents;
  const cappedDiscount = Math.min(discountCents, grossCents);
  const totalCents = Math.max(0, grossCents - cappedDiscount);

  return {
    subtotalCents,
    serviceChargeCents,
    serviceChargeLabel,
    taxCents,
    taxLabel,
    discountCents: cappedDiscount,
    totalCents,
  };
}
