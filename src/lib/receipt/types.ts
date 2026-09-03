export type ReceiptLineItem = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  modifiers?: { groupName: string; optionName: string; priceDeltaCents: number }[] | null;
  /** Diner's kitchen note for this line, so the receipt confirms what was asked. */
  note?: string | null;
};

export type ReceiptMerchant = {
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  landlineNumber?: string | null;
  registrationNumber?: string | null;
  sstNumber?: string | null;
  gstNumber?: string | null;
  receiptFooterText?: string | null;
  receiptShowRegistration?: boolean;
};

export type ReceiptOrder = {
  id: string;
  shortId: string;
  tableNumber?: string | null;
  paidAt?: string | null;
  status?: "pending" | "paid" | "cancelled";
  currency: string;
  subtotalCents: number;
  serviceChargeCents: number;
  serviceChargeLabel?: string | null;
  taxCents: number;
  taxLabel?: string | null;
  discountCents: number;
  totalCents: number;
  serviceType?: "dine_in" | "takeaway";
  items: ReceiptLineItem[];
};

export function formatReceiptMoney(currency: string, cents: number): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export function formatReceiptDate(iso: string | null | undefined): string {
  if (!iso) return new Date().toLocaleString();
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const SAMPLE_RECEIPT_ORDER: ReceiptOrder = {
  id: "sample",
  shortId: "A1B2C3D4",
  tableNumber: "12",
  paidAt: new Date().toISOString(),
  status: "paid",
  currency: "MYR",
  subtotalCents: 4280,
  serviceChargeCents: 428,
  taxCents: 283,
  taxLabel: "SST (6%)",
  discountCents: 200,
  totalCents: 4791,
  items: [
    {
      name: "Flat White",
      quantity: 2,
      unitPriceCents: 1400,
      modifiers: [{ groupName: "Milk", optionName: "Oat milk", priceDeltaCents: 150 }],
    },
    {
      name: "Avocado Toast",
      quantity: 1,
      unitPriceCents: 1480,
      modifiers: null,
    },
  ],
};
