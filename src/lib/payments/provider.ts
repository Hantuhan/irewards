/**
 * Which gateway handles a payment.
 *
 * Two rules, and they answer different questions:
 *
 *   - Taking money asks "who should charge this?" — the configured provider,
 *     unless it cannot settle the merchant's currency.
 *   - Giving it back asks "who already charged this?" — recorded on the order
 *     at checkout. A merchant that moves from HitPay to CHIP still has last
 *     week's orders sitting in HitPay, and those refunds have to go there.
 */

import { chipProvider } from "./chip";
import { hitPayProvider } from "./hitpay";
import type { PaymentCurrency, PaymentProvider } from "./types";

const PROVIDERS: readonly PaymentProvider[] = [chipProvider, hitPayProvider];

export function configuredProviderName(): string {
  return process.env.PAYMENT_PROVIDER ?? "dev";
}

export function getProviderByName(name: string): PaymentProvider | null {
  return PROVIDERS.find((provider) => provider.name === name) ?? null;
}

/** Every provider that could receive a webhook, for signature routing. */
export function knownProviders(): readonly PaymentProvider[] {
  return PROVIDERS;
}

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

/**
 * The provider to charge a new order with.
 *
 * CHIP settles MYR only, so an SGD merchant on a CHIP-configured deployment
 * falls through to whichever configured provider can take SGD rather than
 * failing checkout. The fallback is deliberately narrow — currency, not
 * outages — because silently charging through an unexpected gateway is how
 * money ends up in an account nobody is reconciling.
 */
export function resolvePaymentProvider(currency: PaymentCurrency): PaymentProvider {
  const name = configuredProviderName();
  const configured = getProviderByName(name);

  if (!configured) {
    throw new PaymentProviderError(
      `PAYMENT_PROVIDER is "${name}", which is not a payment provider. Set it to ${PROVIDERS.map((p) => p.name).join(", ")} or dev.`,
    );
  }

  if (configured.supportsCurrency(currency)) return configured;

  const alternative = PROVIDERS.find(
    (provider) => provider.supportsCurrency(currency) && provider.isConfigured(),
  );
  if (alternative) {
    console.warn(
      `${configured.name} cannot settle ${currency}; falling back to ${alternative.name} for this order.`,
    );
    return alternative;
  }

  throw new PaymentProviderError(
    `No payment provider is configured that can settle ${currency}. ${configured.name} cannot, and no alternative has credentials set.`,
  );
}

/**
 * The gateway that took an order's payment, or `null` when no gateway did.
 *
 * `null` is the dev-mode answer: nothing was ever charged, so there is nothing
 * to send a refund to. It is a real outcome rather than an error, and the
 * caller is expected to report the refund as skipped instead of pretending
 * money moved.
 *
 * Orders created before providers were recorded have no `payment_provider`;
 * HitPay was the only gateway that existed then, so that is what they were
 * charged through. Migration 063 backfills the column for the same reason —
 * this is the belt to its braces, for a row that slipped through.
 */
export function providerForOrder(
  paymentProvider: string | null | undefined,
): PaymentProvider | null {
  const name = paymentProvider ?? "hitpay";
  if (name === "dev") return null;

  const provider = getProviderByName(name);
  if (!provider) {
    throw new PaymentProviderError(
      `This order was paid through "${name}", which is no longer available. Refund it in that provider's dashboard.`,
    );
  }
  return provider;
}
