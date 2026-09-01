export type PaymentWebhookPayload = {
  provider: string;
  externalId: string;
  orderId: string;
  amountCents: number;
  currency: "MYR" | "SGD";
  status: "paid" | "failed";
};
