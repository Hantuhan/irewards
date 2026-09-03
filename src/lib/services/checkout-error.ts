/**
 * A checkout problem the diner can act on — an item that just sold out, a
 * promo that no longer applies, options that don't match the menu.
 *
 * Everything else (a database fault, a payment provider outage) is ours to
 * debug and must not be echoed onto a diner's phone, so the checkout route
 * only forwards messages of this type.
 */
export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}
