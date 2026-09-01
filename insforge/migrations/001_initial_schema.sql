-- iRewards initial schema (multi-tenant)

create extension if not exists "pgcrypto";

create table merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  currency text not null check (currency in ('MYR', 'SGD')),
  whatsapp_number text,
  created_at timestamptz not null default now()
);

create table venue_tables (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  table_number text not null,
  unique (merchant_id, table_number)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  phone text,
  external_user_id text,
  is_member boolean not null default false,
  points_balance integer not null default 0 check (points_balance >= 0),
  first_join_bonus_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique (merchant_id, phone)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  venue_table_id uuid references venue_tables(id),
  customer_id uuid references customers(id),
  status text not null check (status in ('pending', 'paid', 'cancelled')) default 'pending',
  total_cents integer not null check (total_cents >= 0),
  payment_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table join_tokens (
  token text primary key,
  order_id uuid not null references orders(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid references orders(id),
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table promos (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  name text not null,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric not null,
  min_spend_cents integer,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index orders_merchant_status_idx on orders (merchant_id, status);
create index customers_merchant_phone_idx on customers (merchant_id, phone);

grant usage on schema public to anon, authenticated, project_admin;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, project_admin;
grant usage, select on all sequences in schema public to anon, authenticated, project_admin;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, project_admin;

notify pgrst, 'reload schema';
