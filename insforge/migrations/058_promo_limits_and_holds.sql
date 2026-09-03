-- Voucher abuse limits, and moving reward consumption to after payment.
--
-- Promo codes had no usage limit of any kind: a campaign voucher broadcast to
-- members could be redeemed unlimited times by anyone who saw the code. And
-- both promo redemptions and stamp rewards were consumed when the *pending*
-- order was created, so abandoning the payment screen burned them.

alter table promos
  add column if not exists usage_limit integer,
  add column if not exists per_customer_limit integer;

comment on column promos.usage_limit is
  'Max total redemptions across all members. Null = unlimited.';
comment on column promos.per_customer_limit is
  'Max redemptions by one member. Null = unlimited. Campaign vouchers default to 1.';

-- Counting redemptions per promo, and per promo+customer, is now on the
-- checkout hot path.
create index if not exists promo_redemptions_promo_idx
  on promo_redemptions (promo_id);
create index if not exists promo_redemptions_promo_customer_idx
  on promo_redemptions (promo_id, customer_id)
  where customer_id is not null;

-- Unpaid orders hold a promo/stamp reward so two open carts can't spend the
-- same one. Mirrors how points are already reserved via pending orders.
create index if not exists orders_pending_promo_idx
  on orders (promo_id)
  where status = 'pending' and promo_id is not null;

alter table orders
  add column if not exists stamp_reward_applied boolean not null default false;

comment on column orders.stamp_reward_applied is
  'This order was quoted with the member''s stamp reward. The reward is only consumed when the order is paid.';

create index if not exists orders_pending_stamp_reward_idx
  on orders (customer_id)
  where status = 'pending' and stamp_reward_applied = true;

-- Existing campaign vouchers are one-per-member from here on.
update promos set per_customer_limit = 1
where campaign_id is not null and per_customer_limit is null;

notify pgrst, 'reload schema';
