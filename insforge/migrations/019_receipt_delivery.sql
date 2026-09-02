-- Receipt delivery: merchant channels, customer prefs, order send tracking

alter table merchants
  add column if not exists receipt_delivery_email boolean not null default true,
  add column if not exists receipt_delivery_whatsapp boolean not null default true;

alter table customers
  add column if not exists email text,
  add column if not exists receipt_delivery_preference text
    check (receipt_delivery_preference in ('email', 'whatsapp'));

alter table orders
  add column if not exists receipt_requested boolean not null default false,
  add column if not exists receipt_sent_at timestamptz,
  add column if not exists receipt_delivery_method text
    check (receipt_delivery_method in ('email', 'whatsapp')),
  add column if not exists receipt_destination text;

create index if not exists customers_merchant_email_idx
  on customers (merchant_id, lower(email))
  where email is not null;
