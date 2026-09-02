import type { MerchantRow, OrderRow } from "@/lib/db/types";
import {
  merchantChargeSettingsFromRow,
  type MerchantChargeSettings,
} from "@/lib/services/order-totals";
import type { ReceiptLineItem, ReceiptOrder } from "./types";

function serviceChargeLabel(
  cents: number,
  settings: MerchantChargeSettings,
): string | null {
  if (cents <= 0) return null;
  return `Service charge (${settings.serviceChargePercent}%)`;
}

function taxLabelFromSettings(
  cents: number,
  storedLabel: string | null | undefined,
  settings: MerchantChargeSettings,
): string | null {
  if (cents <= 0) return null;
  if (storedLabel?.trim()) return storedLabel.trim();
  if (settings.currency === "MYR" && settings.sstEnabled) {
    return `SST (${settings.sstRatePercent}%)`;
  }
  if (settings.currency === "SGD" && settings.gstEnabled) {
    return `GST (${settings.gstRatePercent}%)`;
  }
  return "Tax";
}

export function buildReceiptOrderFromDb(
  order: OrderRow,
  merchant: Pick<
    MerchantRow,
    | "currency"
    | "service_charge_enabled"
    | "service_charge_percent"
    | "sst_enabled"
    | "sst_rate_percent"
    | "gst_enabled"
    | "gst_rate_percent"
  >,
  items: ReceiptLineItem[],
  shortId: string,
  tableNumber: string | null,
): ReceiptOrder {
  const chargeSettings = merchantChargeSettingsFromRow(merchant as MerchantRow);
  const serviceChargeCents = order.service_charge_cents ?? 0;
  const taxCents = order.tax_cents ?? 0;

  return {
    id: order.id,
    shortId,
    tableNumber,
    paidAt: order.paid_at,
    status: order.status,
    currency: merchant.currency ?? "MYR",
    subtotalCents: order.subtotal_cents,
    serviceChargeCents,
    serviceChargeLabel: serviceChargeLabel(serviceChargeCents, chargeSettings),
    taxCents,
    taxLabel: taxLabelFromSettings(taxCents, order.tax_label, chargeSettings),
    discountCents: order.discount_cents,
    totalCents: order.total_cents,
    serviceType: order.service_type ?? "dine_in",
    items,
  };
}
