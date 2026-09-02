import {
  formatReceiptDate,
  formatReceiptMoney,
  type ReceiptLineItem,
  type ReceiptMerchant,
  type ReceiptOrder,
} from "@/lib/receipt/types";

export function formatReceiptPlainText(
  merchant: ReceiptMerchant,
  order: ReceiptOrder,
  tableNumber?: string | null,
): string {
  const lines: string[] = [];
  lines.push(merchant.name);
  if (merchant.address) lines.push(merchant.address);
  if (merchant.landlineNumber) lines.push(`Tel: ${merchant.landlineNumber}`);
  if (merchant.receiptShowRegistration !== false && merchant.registrationNumber) {
    lines.push(`Reg: ${merchant.registrationNumber}`);
  }
  if (merchant.sstNumber?.trim()) {
    lines.push(`SST: ${merchant.sstNumber.trim()}`);
  }
  if (merchant.gstNumber?.trim()) {
    lines.push(`GST: ${merchant.gstNumber.trim()}`);
  }
  lines.push("");
  lines.push(`Order #${order.shortId}`);
  if (tableNumber) lines.push(`Table ${tableNumber}`);
  lines.push(formatReceiptDate(order.paidAt));
  lines.push("—".repeat(28));

  for (const item of order.items) {
    lines.push(formatLineItem(item, order.currency));
  }

  lines.push("—".repeat(28));
  lines.push(`Subtotal: ${formatReceiptMoney(order.currency, order.subtotalCents)}`);
  if (order.serviceChargeCents > 0) {
    lines.push(
      `Service: ${formatReceiptMoney(order.currency, order.serviceChargeCents)}`,
    );
  }
  if (order.taxCents > 0) {
    const label = order.taxLabel ?? "Tax";
    lines.push(`${label}: ${formatReceiptMoney(order.currency, order.taxCents)}`);
  }
  if (order.discountCents > 0) {
    lines.push(`Discount: -${formatReceiptMoney(order.currency, order.discountCents)}`);
  }
  lines.push(`TOTAL: ${formatReceiptMoney(order.currency, order.totalCents)}`);
  lines.push("");
  if (merchant.receiptFooterText) {
    lines.push(merchant.receiptFooterText);
    lines.push("");
  }
  lines.push("Thank you for dining with us!");

  return lines.join("\n");
}

function formatLineItem(item: ReceiptLineItem, currency: string): string {
  const base = `${item.quantity}x ${item.name}  ${formatReceiptMoney(currency, item.unitPriceCents * item.quantity)}`;
  const mods = item.modifiers?.filter((m) => m.optionName) ?? [];
  if (mods.length === 0) return base;
  const modLines = mods.map(
    (m) =>
      `   + ${m.optionName}${m.priceDeltaCents ? ` (${formatReceiptMoney(currency, m.priceDeltaCents)})` : ""}`,
  );
  return [base, ...modLines].join("\n");
}

export function formatReceiptEmailHtml(
  merchant: ReceiptMerchant,
  order: ReceiptOrder,
  tableNumber?: string | null,
): string {
  const text = formatReceiptPlainText(merchant, order, tableNumber);
  const body = text
    .split("\n")
    .map((line) => `<p style="margin:0 0 6px;font-family:monospace;font-size:13px;">${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");

  return `<!DOCTYPE html><html><body style="background:#fbfbfb;padding:24px;"><div style="max-width:360px;margin:0 auto;background:#fff;border:1px solid #eee;padding:20px;">${body}</div></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
