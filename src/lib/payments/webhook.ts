/**
 * Verifying and parsing an inbound payment callback.
 *
 * The route is shared across providers, so the first job is working out who
 * sent it. That is done on the signature header each provider uses — CHIP
 * signs with RSA in `X-Signature`, HitPay with an HMAC in `Hitpay-Signature`.
 * Routing on a header is only ever a hint about which key to check against;
 * nothing is accepted until that provider's own verification passes, so a
 * forged header buys an attacker a failed signature check and a 401.
 */

import { isDevPaymentMode } from "./mode";
import {
  configuredProviderName,
  getProviderByName,
  knownProviders,
} from "./provider";
import type { PaymentProvider, PaymentWebhookPayload } from "./types";

export type { PaymentWebhookPayload };

/**
 * Providers that could legitimately have sent this callback: the one that
 * recognises its own signature header, preferring the configured provider when
 * more than one matches.
 */
function candidateProviders(headers: Headers): PaymentProvider[] {
  const matching = knownProviders().filter((provider) => provider.ownsWebhook(headers));
  const configured = getProviderByName(configuredProviderName());

  return matching.sort((a, b) => {
    if (a === configured) return -1;
    if (b === configured) return 1;
    return 0;
  });
}

export type VerifiedWebhook = {
  provider: string;
  payload: PaymentWebhookPayload;
};

/**
 * Returns the parsed callback only if it carried a valid signature, or `null`
 * if nothing could verify it. Verification and parsing are deliberately a
 * single step: keeping them apart is what lets a caller parse a payload it
 * never checked, and every such payload is an order marked paid for free.
 */
export async function verifyAndParseWebhook(
  rawBody: string,
  headers: Headers,
): Promise<VerifiedWebhook | null> {
  if (isDevPaymentMode()) {
    const signature =
      headers.get("x-payment-signature") ?? headers.get("hitpay-signature");
    if (signature && signature !== "dev-signature") return null;

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
        payload: {
          provider: "dev",
          externalId: json.externalId ?? `dev-${json.orderId}`,
          orderId: json.orderId,
          amountCents: json.amountCents ?? 0,
          currency: json.currency ?? "MYR",
          status: json.status === "failed" ? "failed" : "paid",
        },
      };
    } catch {
      return null;
    }
  }

  for (const provider of candidateProviders(headers)) {
    if (!(await provider.verifyWebhook(rawBody, headers))) continue;

    try {
      const payload = provider.parseWebhook(rawBody);
      if (payload) return { provider: provider.name, payload };
    } catch (error) {
      // A signature that verifies but a body we cannot read is our bug, not a
      // forgery, and it means a real payment is going unrecorded.
      console.error(`Could not parse a verified ${provider.name} webhook:`, error);
    }
  }

  return null;
}
