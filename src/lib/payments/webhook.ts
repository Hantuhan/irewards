import {
  isDevPaymentMode,
  parseHitPayWebhook,
  verifyHitPaySignature,
} from "@/lib/payments/hitpay";
import type { PaymentWebhookPayload } from "@/lib/payments/types";

export type { PaymentWebhookPayload };

export function verifyPaymentWebhook(
  rawBody: string,
  signature: string | null,
  headers?: Headers,
): boolean {
  if (isDevPaymentMode()) {
    return signature === "dev-signature" || !signature;
  }

  const hitpaySig =
    signature ??
    headers?.get("hitpay-signature") ??
    headers?.get("Hitpay-Signature") ??
    null;

  return verifyHitPaySignature(rawBody, hitpaySig);
}

export function parsePaymentWebhook(rawBody: string): PaymentWebhookPayload | null {
  if (isDevPaymentMode()) {
    try {
      const json = JSON.parse(rawBody) as {
        orderId: string;
        status?: string;
        externalId?: string;
        amountCents?: number;
        currency?: "MYR" | "SGD";
      };
      if (!json.orderId) return null;
      return {
        provider: "dev",
        externalId: json.externalId ?? `dev-${json.orderId}`,
        orderId: json.orderId,
        amountCents: json.amountCents ?? 0,
        currency: json.currency ?? "MYR",
        status: json.status === "failed" ? "failed" : "paid",
      };
    } catch {
      return null;
    }
  }

  return parseHitPayWebhook(rawBody);
}
