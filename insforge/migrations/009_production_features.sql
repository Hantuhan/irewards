-- Production features: automation jobs, promos, member prefs, merchant review settings

alter table merchants
  add column if not exists google_review_delay_minutes integer not null default 30,
  add column if not exists bounce_back_discount_percent numeric not null default 20,
  add column if not exists bounce_back_expiry_days integer not null default 14;

alter table automation_rules
  add column if not exists config jsonb not null default '{}'::jsonb;

alter table customers
  add column if not exists marketing_opt_out boolean not null default false,
  add column if not exists favorite_item_name text,
  add column if not exists usual_order jsonb;

alter table promos
  add column if not exists code text;

create unique index if not exists promos_merchant_code_idx
  on promos (merchant_id, lower(code))
  where code is not null;

alter table orders
  add column if not exists promo_id uuid references promos(id) on delete set null,
  add column if not exists points_redeemed integer not null default 0 check (points_redeemed >= 0);

create table if not exists promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references promos(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  redeemed_at timestamptz not null default now()
);

create table if not exists automation_jobs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  job_type text not null check (job_type in (
    'review_nudge', 'bounce_back', 'churn_winback', 'campaign_whatsapp', 'campaign_sms'
  )),
  run_at timestamptz not null,
  status text not null check (status in ('pending', 'sent', 'failed', 'cancelled')) default 'pending',
  payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists automation_jobs_pending_idx
  on automation_jobs (status, run_at)
  where status = 'pending';

create table if not exists campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click', 'send', 'conversion')),
  created_at timestamptz not null default now()
);

-- Update review nudge default to 30 minutes
update automation_rules
set
  title = 'Review nudge · 30 min',
  description = 'Ask for Google review 30 minutes after payment (happy → Google link).',
  config = '{"delayMinutes": 30}'::jsonb
where rule_key = 'review_nudge';

update automation_rules
set config = '{"expiryDays": 14, "discountPercent": 20}'::jsonb
where rule_key = 'churn_winback' and config = '{}'::jsonb;

-- Demo promo codes
update promos p
set code = upper(replace(p.name, ' ', ''))
from merchants m
where p.merchant_id = m.id and m.slug = 'demo-cafe' and p.code is null;

insert into promos (merchant_id, name, code, type, value, min_spend_cents, active)
select m.id, 'Welcome 10% off', 'WELCOME10', 'percentage', 10, 1500, true
from merchants m
where m.slug = 'demo-cafe'
  and not exists (select 1 from promos p where p.merchant_id = m.id and p.code = 'WELCOME10');

notify pgrst, 'reload schema';
