import { createHmac, timingSafeEqual } from "crypto";

const HITPAY_API_BASE =
  process.env.HITPAY_API_BASE ?? "https://api.sandbox.hit-pay.com/v1";

export type HitPayPaymentRequest = {
  id: string;
  url: string;
  reference_number: string;
};

export function isDevPaymentMode() {
  return process.env.PAYMENT_PROVIDER === "dev";
}

/** Storefront payment picker → HitPay `payment_methods[]` values. */
export type StorefrontPaymentMethod = "duitnow" | "card" | "wallet";

export function hitPayMethodsForStorefront(
  method: StorefrontPaymentMethod,
  currency: "MYR" | "SGD",
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

export async function createHitPayPaymentRequest(input: {
  orderId: string;
  amountCents: number;
  currency: "MYR" | "SGD";
  redirectUrl: string;
  webhookUrl: string;
  paymentMethods?: string[];
}): Promise<HitPayPaymentRequest> {
  const apiKey = process.env.PAYMENT_API_KEY;
  if (!apiKey) throw new Error("Missing PAYMENT_API_KEY");

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
        "X-BUSINESS-API-KEY": apiKey!,
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
      reference_number: json.reference_number ?? input.orderId,
    };
  }

  const preferred = input.paymentMethods?.filter(Boolean);
  if (preferred && preferred.length > 0) {
    try {
      return await request(preferred);
    } catch {
      // Method may not be enabled on the HitPay account — fall back to all methods.
      return await request();
    }
  }

  return request();
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

export function parseHitPayWebhook(rawBody: string) {
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
    provider: "hitpay" as const,
    externalId: json.payment_request_id ?? json.id ?? orderId,
    orderId,
    amountCents: Math.round(parseFloat(json.amount ?? "0") * 100),
    currency: (json.currency ?? "MYR") as "MYR" | "SGD",
    status: paid ? ("paid" as const) : ("failed" as const),
  };
}
