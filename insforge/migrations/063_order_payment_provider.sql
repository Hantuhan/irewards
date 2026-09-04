-- Which gateway took the money.
--
-- iRewards is moving from HitPay to CHIP on cost: DuitNow QR at 1.0% instead
-- of 1.2%, e-wallets at 1.4% instead of ~1.9%, and no flat RM1 on card
-- payments, which on a RM12 coffee was costing more than the coffee's margin.
--
-- The switch is what forces this column. `payment_ref` is meaningless without
-- knowing who issued it: a HitPay payment_request_id sent to CHIP's refund
-- endpoint is a 404, and every order taken before the cutover still has to be
-- refundable afterwards. Recording the provider at checkout means a refund
-- always goes back to the gateway that actually holds the money, however many
-- times the merchant switches later.
--
-- Existing rows are backfilled to 'hitpay' because that is factually who
-- charged them — there was no other provider before this migration.

alter table orders
  add column if not exists payment_provider text;

update orders
  set payment_provider = 'hitpay'
  where payment_provider is null
    and payment_ref is not null;

comment on column orders.payment_provider is
  'Gateway that took the payment (chip, hitpay, dev). Refunds must be sent back to this provider, not to whichever one is configured today.';

notify pgrst, 'reload schema';
