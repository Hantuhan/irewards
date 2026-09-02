import { calculateOrderTotals } from "@/lib/services/order-totals";
import { SAMPLE_RECEIPT_ORDER, type ReceiptMerchant, type ReceiptOrder } from "./types";
import type { ReceiptLayout } from "./layout";

export type ReceiptEditorSettings = {
  name: string;
  logoUrl: string;
  address: string;
  registrationNumber: string;
  sstNumber: string;
  gstNumber: string;
  landlineNumber: string;
  currency: "MYR" | "SGD";
  serviceChargeEnabled: boolean;
  serviceChargePercent: number;
  sstEnabled: boolean;
  sstRatePercent: number;
  gstEnabled: boolean;
  gstRatePercent: number;
  receiptFooterText: string;
  receiptShowRegistration: boolean;
};

export function settingsToMerchant(settings: ReceiptEditorSettings): ReceiptMerchant {
  return {
    name: settings.name || "Your Cafe",
    slug: "demo",
    logoUrl: settings.logoUrl || null,
    address: settings.address || null,
    landlineNumber: settings.landlineNumber || null,
    registrationNumber: settings.registrationNumber || null,
    sstNumber: settings.sstNumber || null,
    gstNumber: settings.gstNumber || null,
    receiptFooterText: settings.receiptFooterText || null,
    receiptShowRegistration: settings.receiptShowRegistration,
  };
}

export function buildPreviewOrder(settings: ReceiptEditorSettings): ReceiptOrder {
  const base = { ...SAMPLE_RECEIPT_ORDER, currency: settings.currency };
  const subtotalCents = base.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  const totals = calculateOrderTotals(subtotalCents, base.discountCents, {
    currency: settings.currency,
    serviceChargeEnabled: settings.serviceChargeEnabled,
    serviceChargePercent: settings.serviceChargePercent,
    sstEnabled: settings.sstEnabled,
    sstRatePercent: settings.sstRatePercent,
    gstEnabled: settings.gstEnabled,
    gstRatePercent: settings.gstRatePercent,
  });

  return {
    ...base,
    subtotalCents: totals.subtotalCents,
    serviceChargeCents: totals.serviceChargeCents,
    serviceChargeLabel: totals.serviceChargeLabel,
    taxCents: totals.taxCents,
    taxLabel: totals.taxLabel,
    discountCents: totals.discountCents,
    totalCents: totals.totalCents,
  };
}

export type ReceiptPreviewData = {
  merchant: ReceiptMerchant;
  order: ReceiptOrder;
  layout: ReceiptLayout;
};

export function buildReceiptPreviewData(
  settings: ReceiptEditorSettings,
  layout: ReceiptLayout,
): ReceiptPreviewData {
  return {
    merchant: settingsToMerchant(settings),
    order: buildPreviewOrder(settings),
    layout,
  };
}
