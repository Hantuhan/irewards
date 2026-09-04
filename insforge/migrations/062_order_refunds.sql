-- Voiding and refunding orders.
--
-- Until now an order could only move forward: new → preparing → ready →
-- served. Nothing could set it back. A cafe that took payment for something
-- it then could not make had no path back inside the product — the refund
-- happened in HitPay's dashboard, while iRewards went on counting the sale as
-- revenue, kept the points it had awarded, and kept the voucher it had spent.

alter table orders drop constraint if exists orders_status_check;
alter table orders
  add constraint orders_status_check
  check (status in ('pending', 'paid', 'cancelled', 'refunded'));

alter table orders
  add column if not exists refunded_at timestamptz,
  add column if not exists refunded_cents integer not null default 0,
  add column if not exists refund_reason text,
  -- Who authorised it. Refunds are the obvious way to steal from a till, so
  -- this is never inferred: the acting user is recorded or the refund fails.
  add column if not exists refunded_by_user_id uuid references merchant_users(id) on delete set null;

comment on column orders.refunded_cents is
  'Amount actually refunded, in cents. Less than total_cents for a partial refund.';
comment on column orders.status is
  'pending → paid → refunded. "cancelled" is a void: an unpaid order abandoned or killed before payment.';

create index if not exists orders_refunded_idx
  on orders (merchant_id, refunded_at)
  where refunded_at is not null;

-- Reporting must exclude refunded money without having to know the rules.
create index if not exists orders_merchant_revenue_idx
  on orders (merchant_id, status)
  where status = 'paid';

notify pgrst, 'reload schema';
