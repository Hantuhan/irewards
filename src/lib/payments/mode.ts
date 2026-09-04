/**
 * Fake payments: unsigned webhooks are accepted and `/api/orders/{id}/dev-pay`
 * marks an order paid with no authentication at all.
 *
 * Never in production, whatever the environment says. A single stray
 * `PAYMENT_PROVIDER=dev` — copied from an example file, or promoted from a
 * staging config — would otherwise let anyone mark any order paid. The
 * production env checker catches that too, but it is a manual checklist step,
 * and revenue should not depend on someone remembering to run a script.
 *
 * This lives outside the provider adapters on purpose: dev mode is the absence
 * of a provider, not a behaviour of one.
 */
export function isDevPaymentMode() {
  if (process.env.PAYMENT_PROVIDER !== "dev") return false;

  if (process.env.NODE_ENV === "production") {
    console.error(
      "PAYMENT_PROVIDER=dev is set in production and is being ignored. Real payments require PAYMENT_PROVIDER=chip or PAYMENT_PROVIDER=hitpay with that provider's credentials.",
    );
    return false;
  }

  return true;
}
