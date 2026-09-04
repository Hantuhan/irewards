export type PaymentCurrency = "MYR" | "SGD";

export type PaymentWebhookPayload = {
  provider: string;
  externalId: string;
  orderId: string;
  amountCents: number;
  currency: PaymentCurrency;
  status: "paid" | "failed";
};

/**
 * What the diner picked in the cart. Each provider maps these onto its own
 * method codes — the storefront must never learn a provider's vocabulary,
 * because that is what makes swapping one out a payments-layer change rather
 * than a UI change.
 */
export type StorefrontPaymentMethod = "duitnow" | "card" | "wallet";

export type CreatePaymentInput = {
  orderId: string;
  amountCents: number;
  currency: PaymentCurrency;
  /** Where the payer lands after paying. */
  redirectUrl: string;
  /** Where the provider posts the paid callback. */
  webhookUrl: string;
  method: StorefrontPaymentMethod;
  /** Used where a provider needs a payer identity; absent for guests. */
  customerEmail?: string | null;
};

export type PaymentRequest = {
  /** The provider's own id for the payment, stored as `orders.payment_ref`. */
  id: string;
  /** Hosted checkout page to send the payer to. */
  url: string;
  reference: string;
};

export type RefundInput = {
  paymentRef: string;
  amountCents: number;
  currency: PaymentCurrency;
};

export type RefundResult = {
  status: "refunded" | "skipped";
  reference: string | null;
};

export type PaymentProvider = {
  readonly name: string;
  /** CHIP is Malaysia-only; HitPay covers MY and SG. */
  supportsCurrency(currency: PaymentCurrency): boolean;
  /** Whether the environment actually holds credentials for this provider. */
  isConfigured(): boolean;
  createPaymentRequest(input: CreatePaymentInput): Promise<PaymentRequest>;
  /**
   * Whether this request carries this provider's signature header. Used to
   * route a webhook to the right verifier — never to trust it. A payload still
   * has to pass `verifyWebhook` before anything is marked paid.
   */
  ownsWebhook(headers: Headers): boolean;
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>;
  parseWebhook(rawBody: string): PaymentWebhookPayload | null;
  refund(input: RefundInput): Promise<RefundResult>;
};
