/**
 * HitPay — kept alongside CHIP because it is the only one of the two that
 * settles SGD, and because a merchant with a large average ticket is not
 * obviously better off on CHIP: HitPay's flat RM1 card fee hurts a RM12 coffee
 * and barely registers on a RM150 dinner bill.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { isDevPaymentMode } from "./mode";
import type {
  CreatePaymentInput,
  PaymentCurrency,
  PaymentProvider,
  PaymentRequest,
  PaymentWebhookPayload,
  RefundInput,
  RefundResult,
  StorefrontPaymentMethod,
} from "./types";

const HITPAY_API_BASE =
  process.env.HITPAY_API_BASE ?? "https://api.sandbox.hit-pay.com/v1";

/** Storefront payment picker → HitPay `payment_methods[]` values. */
export function hitPayMethodsForStorefront(
  method: StorefrontPaymentMethod,
  currency: PaymentCurrency,
): string[] {
  if (method === "card") return ["card"];
  if (method === "wallet") {
    return currency === "SGD"
      ? ["grabpay_direct", "paynow_online", "shopee_pay"]
      : ["grabpay_direct", "shopee_pay", "touch_n_go"];
  }
  // DuitNow / local bank rails
  return currency === "SGD" ? ["paynow_online"] : ["duitnow", "fpx"];
}

export async function createHitPayPaymentRequest(
  input: CreatePaymentInput,
): Promise<PaymentRequest> {
  const key = process.env.PAYMENT_API_KEY;
  if (!key) throw new Error("Missing PAYMENT_API_KEY");

  async function request(methods?: string[]) {
    const body = new URLSearchParams({
      amount: (input.amountCents / 100).toFixed(2),
      currency: input.currency,
      reference_number: input.orderId,
      redirect_url: input.redirectUrl,
      webhook: input.webhookUrl,
      purpose: `iRewards order ${input.orderId}`,
    });
    for (const method of methods ?? []) {
      body.append("payment_methods[]", method);
    }

    const response = await fetch(`${HITPAY_API_BASE}/payment-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-BUSINESS-API-KEY": key!,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HitPay error: ${response.status} ${text}`);
    }

    const json = (await response.json()) as {
      id: string;
      url: string;
      reference_number?: string;
    };

    return {
      id: json.id,
      url: json.url,
      reference: json.reference_number ?? input.orderId,
    };
  }

  try {
    return await request(hitPayMethodsForStorefront(input.method, input.currency));
  } catch {
    // Method may not be enabled on the HitPay account — fall back to all methods.
    return request();
  }
}

export function verifyHitPaySignature(rawBody: string, signature: string | null) {
  const salt = process.env.PAYMENT_SALT;
  if (!salt || !signature) return false;

  const computed = createHmac("sha256", salt).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Refunds a HitPay payment.
 *
 * `paymentRef` is what the webhook gave us (`payment_request_id`). In dev
 * payment mode nothing was ever charged, so there is nothing to give back and
 * the refund is reported as skipped rather than pretended.
 */
export async function refundHitPayPayment(input: RefundInput): Promise<RefundResult> {
  if (isDevPaymentMode()) {
    console.info("[payments:dev] refund →", input.paymentRef, input.amountCents);
    return { status: "skipped", reference: null };
  }

  const apiKey = process.env.PAYMENT_API_KEY;
  if (!apiKey) throw new Error("Missing PAYMENT_API_KEY");

  const response = await fetch(`${HITPAY_API_BASE}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BUSINESS-API-KEY": apiKey,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({
      payment_id: input.paymentRef,
      amount: (input.amountCents / 100).toFixed(2),
    }),
  });

  const json = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    errors?: unknown;
  };

  if (!response.ok) {
    throw new Error(
      json.message
        ? `The payment provider refused the refund: ${json.message}`
        : `The payment provider refused the refund (${response.status}).`,
    );
  }

  return { status: "refunded", reference: json.id ?? null };
}

export function parseHitPayWebhook(rawBody: string): PaymentWebhookPayload | null {
  const json = JSON.parse(rawBody) as {
    id?: string;
    payment_request_id?: string;
    reference_number?: string;
    status?: string;
    amount?: string;
    currency?: string;
  };

  const orderId = json.reference_number;
  if (!orderId) return null;

  const status = (json.status ?? "").toLowerCase();
  const paid = status === "completed" || status === "paid" || status === "succeeded";

  return {
    provider: "hitpay",
    externalId: json.payment_request_id ?? json.id ?? orderId,
    orderId,
    amountCents: Math.round(parseFloat(json.amount ?? "0") * 100),
    currency: (json.currency ?? "MYR") as PaymentCurrency,
    status: paid ? "paid" : "failed",
  };
}

export const hitPayProvider: PaymentProvider = {
  name: "hitpay",
  supportsCurrency: (currency) => currency === "MYR" || currency === "SGD",
  isConfigured: () => Boolean(process.env.PAYMENT_API_KEY && process.env.PAYMENT_SALT),
  createPaymentRequest: createHitPayPaymentRequest,
  ownsWebhook: (headers) =>
    Boolean(headers.get("hitpay-signature") ?? headers.get("x-payment-signature")),
  verifyWebhook: async (rawBody, headers) =>
    verifyHitPaySignature(
      rawBody,
      headers.get("hitpay-signature") ?? headers.get("x-payment-signature"),
    ),
  parseWebhook: parseHitPayWebhook,
  refund: refundHitPayPayment,
};
