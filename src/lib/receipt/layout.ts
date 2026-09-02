export type ReceiptBlockType =
  | "header"
  | "date_time"
  | "meta_columns"
  | "items"
  | "service_charge"
  | "tax"
  | "totals"
  | "payment"
  | "message"
  | "barcode"
  | "divider"
  | "custom_text";

export type ReceiptBlock = {
  id: string;
  type: ReceiptBlockType;
  enabled: boolean;
  settings: Record<string, string | boolean | number>;
};

export type ReceiptStyle = {
  receiptWidthMm: number;
  fontSizePx: number;
  lineHeight: number;
  textColor: string;
  showBackground: boolean;
  backgroundStyle: "plain" | "paper-1" | "paper-2" | "paper-3";
  blockGapPx: number;
};

export type ReceiptLayout = {
  templateId: string;
  style: ReceiptStyle;
  blocks: ReceiptBlock[];
};

export const DEFAULT_RECEIPT_STYLE: ReceiptStyle = {
  receiptWidthMm: 80,
  fontSizePx: 11,
  lineHeight: 1.2,
  textColor: "#1a1a1a",
  showBackground: true,
  backgroundStyle: "paper-1",
  blockGapPx: 8,
};

export const RECEIPT_BLOCK_LABELS: Record<ReceiptBlockType, string> = {
  header: "Header",
  date_time: "Date & Time",
  meta_columns: "Columns",
  items: "Items",
  service_charge: "Service Charge",
  tax: "Tax",
  totals: "Total",
  payment: "Payment",
  message: "Message",
  barcode: "Barcode / QR",
  divider: "Divider",
  custom_text: "Custom Text",
};

export const RECEIPT_BLOCK_ICONS: Record<ReceiptBlockType, string> = {
  header: "storefront",
  date_time: "schedule",
  meta_columns: "view_column",
  items: "receipt_long",
  service_charge: "percent",
  tax: "account_balance",
  totals: "payments",
  payment: "credit_card",
  message: "chat_bubble",
  barcode: "qr_code_2",
  divider: "horizontal_rule",
  custom_text: "text_fields",
};

function block(
  type: ReceiptBlockType,
  settings: ReceiptBlock["settings"] = {},
): ReceiptBlock {
  return { id: crypto.randomUUID(), type, enabled: true, settings };
}

export const DEFAULT_RECEIPT_BLOCKS: ReceiptBlock[] = [
  block("header", {
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showRegNo: true,
    showSstNo: true,
    showGstNo: true,
  }),
  block("date_time", { showReceiptNumber: true, showTable: true, showDate: true }),
  block("divider"),
  block("items", { showModifiers: true, showQuantity: true }),
  block("divider"),
  block("totals", {
    showSubtotal: true,
    showServiceCharge: false,
    showTax: false,
    showDiscount: true,
    showGrandTotal: false,
  }),
  block("service_charge", { showRate: true }),
  block("tax", { showRate: true }),
  block("totals", {
    showSubtotal: false,
    showServiceCharge: false,
    showTax: false,
    showDiscount: false,
    showGrandTotal: true,
  }),
  block("payment", { showMethod: true, showStatus: true }),
  block("message"),
  block("barcode", { showBarcode: false, showQr: true }),
];

export const RECEIPT_TEMPLATES: {
  id: string;
  label: string;
  description: string;
  layout: ReceiptLayout;
}[] = [
  {
    id: "restaurant",
    label: "Restaurant Receipt",
    description: "Full dine-in receipt with table, charges, and payment details.",
    layout: {
      templateId: "restaurant",
      style: DEFAULT_RECEIPT_STYLE,
      blocks: DEFAULT_RECEIPT_BLOCKS,
    },
  },
  {
    id: "cafe",
    label: "Cafe Receipt",
    description: "Minimal cafe receipt — items, total, and thank-you message.",
    layout: {
      templateId: "cafe",
      style: { ...DEFAULT_RECEIPT_STYLE, fontSizePx: 10 },
      blocks: [
        block("header", {
          showLogo: true,
          showAddress: false,
          showPhone: false,
          showRegNo: false,
          showSstNo: false,
          showGstNo: false,
        }),
        block("date_time", { showReceiptNumber: true, showTable: false, showDate: true }),
        block("divider"),
        block("items", { showModifiers: true, showQuantity: true }),
        block("service_charge", { showRate: true }),
        block("tax", { showRate: true }),
        block("totals", {
          showSubtotal: false,
          showServiceCharge: false,
          showTax: false,
          showDiscount: false,
          showGrandTotal: true,
        }),
        block("message"),
      ],
    },
  },
  {
    id: "retail",
    label: "Retail Receipt",
    description: "Simple retail-style receipt with barcode.",
    layout: {
      templateId: "retail",
      style: { ...DEFAULT_RECEIPT_STYLE, receiptWidthMm: 58 },
      blocks: [
        block("header", {
          showLogo: true,
          showAddress: true,
          showPhone: true,
          showRegNo: true,
          showSstNo: true,
          showGstNo: true,
        }),
        block("date_time", { showReceiptNumber: true, showTable: false, showDate: true }),
        block("items", { showModifiers: false, showQuantity: true }),
        block("totals", {
          showSubtotal: true,
          showServiceCharge: false,
          showTax: false,
          showDiscount: true,
          showGrandTotal: false,
        }),
        block("service_charge", { showRate: true }),
        block("tax", { showRate: true }),
        block("totals", {
          showSubtotal: false,
          showServiceCharge: false,
          showTax: false,
          showDiscount: false,
          showGrandTotal: true,
        }),
        block("barcode", { showBarcode: false, showQr: true }),
        block("message"),
      ],
    },
  },
];

export function createDefaultReceiptLayout(): ReceiptLayout {
  return ensureQrOnDineInReceipt(
    ensureChargeBlocks({
      templateId: "restaurant",
      style: { ...DEFAULT_RECEIPT_STYLE },
      blocks: DEFAULT_RECEIPT_BLOCKS.map((b) => ({
        ...b,
        id: crypto.randomUUID(),
        settings: { ...b.settings },
      })),
    }),
  );
}

export function cloneReceiptLayout(layout: ReceiptLayout): ReceiptLayout {
  return {
    templateId: layout.templateId,
    style: { ...layout.style },
    blocks: layout.blocks.map((b) => ({
      ...b,
      id: crypto.randomUUID(),
      settings: { ...b.settings },
    })),
  };
}

export function parseReceiptLayout(json: unknown): ReceiptLayout | null {
  if (!json || typeof json !== "object") return null;
  const raw = json as Partial<ReceiptLayout>;
  if (!Array.isArray(raw.blocks) || !raw.style) return null;
  return ensureQrOnDineInReceipt(ensureChargeBlocks({
    templateId: raw.templateId ?? "restaurant",
    style: { ...DEFAULT_RECEIPT_STYLE, ...raw.style },
    blocks: raw.blocks.filter(
      (b): b is ReceiptBlock =>
        Boolean(b && typeof b === "object" && "type" in b && "id" in b),
    ),
  }));
}

/** Upgrade legacy dine-in layouts that used linear barcode to QR. */
export function ensureQrOnDineInReceipt(layout: ReceiptLayout): ReceiptLayout {
  if (layout.templateId === "retail") return layout;
  return {
    ...layout,
    blocks: layout.blocks.map((block) => {
      if (block.type !== "barcode") return block;
      const showQr = block.settings.showQr;
      const showBarcode = block.settings.showBarcode;
      if (showQr === true) return block;
      if (showBarcode === false && showQr === false) return block;
      return {
        ...block,
        settings: { ...block.settings, showQr: true, showBarcode: false },
      };
    }),
  };
}

/** Insert service_charge and tax blocks into older saved layouts that lack them. */
export function ensureChargeBlocks(layout: ReceiptLayout): ReceiptLayout {
  const hasService = layout.blocks.some((b) => b.type === "service_charge");
  const hasTax = layout.blocks.some((b) => b.type === "tax");
  if (hasService && hasTax) return layout;

  const blocks = [...layout.blocks];
  const grandTotalIdx = blocks.findIndex(
    (b) =>
      b.type === "totals" &&
      getBlockSetting(b, "showGrandTotal", true) &&
      !getBlockSetting(b, "showSubtotal", true),
  );
  const summaryTotalsIdx = blocks.findIndex((b) => b.type === "totals");
  const insertAt =
    grandTotalIdx >= 0 ? grandTotalIdx : summaryTotalsIdx >= 0 ? summaryTotalsIdx + 1 : blocks.length;

  const toInsert: ReceiptBlock[] = [];
  if (!hasService) {
    toInsert.push({
      id: crypto.randomUUID(),
      type: "service_charge",
      enabled: true,
      settings: { showRate: true },
    });
  }
  if (!hasTax) {
    toInsert.push({
      id: crypto.randomUUID(),
      type: "tax",
      enabled: true,
      settings: { showRate: true },
    });
  }

  blocks.splice(insertAt, 0, ...toInsert);
  return { ...layout, blocks };
}

export function getBlockSetting(
  block: ReceiptBlock,
  key: string,
  fallback: boolean,
): boolean {
  const value = block.settings[key];
  return typeof value === "boolean" ? value : fallback;
}

export function getBlockText(block: ReceiptBlock, key: string, fallback: string): string {
  const value = block.settings[key];
  return typeof value === "string" ? value : fallback;
}
