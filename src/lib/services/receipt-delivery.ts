import { sendEmailMessage } from "@/lib/email/outbound";
import { normalizePhone } from "@/lib/loyalty/phone";
import {
  formatReceiptEmailHtml,
  formatReceiptPlainText,
} from "@/lib/receipt/format-text";
import type { ReceiptMerchant, ReceiptOrder } from "@/lib/receipt/types";
import { sendWhatsAppMessage } from "@/lib/whatsapp/outbound";

export type ReceiptDeliveryMethod = "email" | "whatsapp";

export async function deliverOrderReceipt(input: {
  method: ReceiptDeliveryMethod;
  destination: string;
  /** Whose WhatsApp account the receipt sends from. */
  merchantId: string;
  merchant: ReceiptMerchant & { name: string };
  order: ReceiptOrder;
  tableNumber?: string | null;
}) {
  const text = formatReceiptPlainText(input.merchant, input.order, input.tableNumber);
  const subject = `Your receipt from ${input.merchant.name} · #${input.order.shortId}`;

  if (input.method === "email") {
    await sendEmailMessage({
      to: input.destination,
      subject,
      text,
      html: formatReceiptEmailHtml(input.merchant, input.order, input.tableNumber),
    });
    return;
  }

  const phone = normalizePhone(input.destination);
  await sendWhatsAppMessage(input.merchantId, phone, `*${input.merchant.name}*\n\n${text}`);
}

export function resolveReceiptDestination(input: {
  method: ReceiptDeliveryMethod;
  email?: string | null;
  phone?: string | null;
}): string | null {
  if (input.method === "email") {
    const email = input.email?.trim().toLowerCase();
    return email && email.includes("@") ? email : null;
  }
  const phone = input.phone?.trim();
  return phone ? normalizePhone(phone) : null;
}
