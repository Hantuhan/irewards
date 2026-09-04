/**
 * CHIP Collect (chip-in.asia) — the Malaysian gateway iRewards bills through.
 *
 * Chosen over HitPay on cafe economics: DuitNow QR at 1.0% against 1.2%, TNG
 * and GrabPay at 1.4% against 1.9-2.0%, and — the one that actually decides it
 * — no flat per-card fee. HitPay adds RM1 to every card payment, which is 8%
 * of a RM12 coffee. CHIP's card rate is purely proportional.
 *
 * API shape differs from HitPay in three ways worth knowing before editing:
 *   - Money is already in cents, so no float round-tripping.
 *   - Callbacks are signed with RSA, not HMAC: the signature is verified
 *     against a company public key fetched from the API, not a shared salt.
 *   - Paths are plural with a trailing slash (`/purchases/{id}/refund/`).
 *     Dropping the slash 404s.
 */

import { createPublicKey, createVerify } from "crypto";
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

const CHIP_API_BASE = process.env.CHIP_API_BASE ?? "https://gate.chip-in.asia/api/v1";

function apiKey() {
  const key = process.env.PAYMENT_API_KEY;
  if (!key) throw new Error("Missing PAYMENT_API_KEY for CHIP");
  return key;
}

function brandId() {
  const id = process.env.CHIP_BRAND_ID;
  if (!id) throw new Error("Missing CHIP_BRAND_ID");
  return id;
}

/**
 * Storefront picker → CHIP `payment_method_whitelist[]`.
 *
 * `duitnow_qr` and `dnqr` are the same rail behind two acquirers and a given
 * brand may only have one enabled, so both go in; the whitelist is a filter,
 * and an entry the account lacks is simply not offered.
 */
export function chipMethodsForStorefront(method: StorefrontPaymentMethod): string[] {
  if (method === "card") return ["visa", "mastercard", "maestro"];
  if (method === "wallet") {
    return ["razer_tng", "razer_grabpay", "razer_shopeepay", "shopee_pay"];
  }
  return ["duitnow_qr", "dnqr", "fpx"];
}

/**
 * CHIP requires a payer email on every purchase, but a diner ordering from a
 * table QR is identified by phone, and often not at all. Rather than invent a
 * plausible-looking address we send an unroutable one derived from the order
 * and turn the receipt email off, so nothing is ever sent to it.
 */
function payerEmail(input: CreatePaymentInput) {
  const supplied = input.customerEmail?.trim();
  if (supplied) return supplied;
  return `order-${input.orderId}@no-reply.invalid`;
}

export async function createChipPurchase(
  input: CreatePaymentInput,
): Promise<PaymentRequest> {
  async function request(methods?: string[]) {
    const body: Record<string, unknown> = {
      brand_id: brandId(),
      client: { email: payerEmail(input) },
      purchase: {
        currency: input.currency,
        products: [
          {
            name: `iRewards order ${input.orderId}`.slice(0, 256),
            price: input.amountCents,
          },
        ],
      },
      reference: input.orderId,
      send_receipt: false,
      success_redirect: input.redirectUrl,
      failure_redirect: input.redirectUrl,
      success_callback: input.webhookUrl,
      platform: "api",
      creator_agent: "irewards",
    };
    if (methods && methods.length > 0) {
      body.payment_method_whitelist = methods;
    }

    const response = await fetch(`${CHIP_API_BASE}/purchases/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CHIP error: ${response.status} ${text}`);
    }

    const json = (await response.json()) as {
      id: string;
      checkout_url?: string;
      reference?: string;
    };

    if (!json.checkout_url) {
      throw new Error("CHIP returned a purchase with no checkout_url");
    }

    return {
      id: json.id,
      url: json.checkout_url,
      reference: json.reference ?? input.orderId,
    };
  }

  const preferred = chipMethodsForStorefront(input.method);
  try {
    return await request(preferred);
  } catch {
    // The brand may not have the preferred rail enabled. Better to show the
    // diner every method CHIP will accept than to fail their checkout.
    return request();
  }
}

/**
 * CHIP signs callbacks with a company-wide RSA key pair, so verification needs
 * the public half. It changes about never, and a webhook that arrives while
 * the fetch is failing must not be treated as valid, so it is cached on
 * success only — a failed fetch retries on the next callback.
 */
let cachedPublicKey: string | null = null;

export async function getChipPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;

  const response = await fetch(`${CHIP_API_BASE}/public_key/`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  if (!response.ok) {
    throw new Error(`CHIP public key fetch failed: ${response.status}`);
  }

  // The body is a JSON-encoded PEM string, quotes and all — not a bare PEM
  // and not an object with a `key` field.
  const pem = (await response.json()) as unknown;
  if (typeof pem !== "string" || !pem.includes("BEGIN PUBLIC KEY")) {
    throw new Error("CHIP public key response was not a PEM string");
  }

  cachedPublicKey = pem;
  return pem;
}

/** Exposed for tests; production callers go through `getChipPublicKey`. */
export function resetChipPublicKeyCache() {
  cachedPublicKey = null;
}

export async function verifyChipSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature) return false;

  try {
    const key = createPublicKey(await getChipPublicKey());
    const verifier = createVerify("sha256");
    verifier.update(rawBody);
    verifier.end();
    return verifier.verify(key, Buffer.from(signature, "base64"));
  } catch (error) {
    console.error("CHIP signature verification failed:", error);
    return false;
  }
}

/**
 * The callback body is a whole Purchase object. `reference` is the order id we
 * set at creation; `id` is CHIP's purchase id, which is also what the refund
 * endpoint takes, so that is what gets stored as the payment ref.
 */
export function parseChipWebhook(rawBody: string): PaymentWebhookPayload | null {
  const json = JSON.parse(rawBody) as {
    id?: string;
    reference?: string;
    status?: string;
    event_type?: string;
    purchase?: { total?: number; currency?: string };
  };

  const orderId = json.reference;
  if (!orderId) return null;

  // `purchase.paid` is the event that matters. Everything else — created,
  // viewed, payment_failure — is not money in the bank.
  const paid =
    json.status === "paid" ||
    json.event_type === "purchase.paid" ||
    json.event_type === "purchase.captured";

  return {
    provider: "chip",
    externalId: json.id ?? orderId,
    orderId,
    amountCents: Math.round(json.purchase?.total ?? 0),
    currency: (json.purchase?.currency ?? "MYR") as PaymentCurrency,
    status: paid ? "paid" : "failed",
  };
}

export async function refundChipPurchase(input: RefundInput): Promise<RefundResult> {
  if (isDevPaymentMode()) {
    console.info("[payments:dev] refund →", input.paymentRef, input.amountCents);
    return { status: "skipped", reference: null };
  }

  const response = await fetch(
    `${CHIP_API_BASE}/purchases/${encodeURIComponent(input.paymentRef)}/refund/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      // CHIP takes minor units directly, so no cents-to-decimal round trip.
      body: JSON.stringify({ amount: input.amountCents }),
    },
  );

  const json = (await response.json().catch(() => ({}))) as {
    id?: string;
    detail?: string;
    message?: string;
  };

  if (!response.ok) {
    const detail = json.detail ?? json.message;
    throw new Error(
      detail
        ? `The payment provider refused the refund: ${detail}`
        : `The payment provider refused the refund (${response.status}).`,
    );
  }

  return { status: "refunded", reference: json.id ?? null };
}

export const chipProvider: PaymentProvider = {
  name: "chip",
  // CHIP settles into Malaysian accounts and prices in MYR only.
  supportsCurrency: (currency) => currency === "MYR",
  isConfigured: () => Boolean(process.env.PAYMENT_API_KEY && process.env.CHIP_BRAND_ID),
  createPaymentRequest: createChipPurchase,
  ownsWebhook: (headers) => Boolean(headers.get("x-signature")),
  verifyWebhook: (rawBody, headers) =>
    verifyChipSignature(rawBody, headers.get("x-signature")),
  parseWebhook: parseChipWebhook,
  refund: refundChipPurchase,
};
