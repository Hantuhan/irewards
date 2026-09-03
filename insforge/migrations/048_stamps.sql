-- Stamp cards: traditional cafe punch card (one program per outlet)

alter table merchants
  add column if not exists points_program_enabled boolean not null default true,
  add column if not exists stamps_program_enabled boolean not null default false;

create table if not exists stamp_programs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null unique references merchants(id) on delete cascade,
  card_size int not null default 6 check (card_size >= 2 and card_size <= 20),
  reward_type text not null default 'free_item'
    check (reward_type in ('free_item', 'percent_off', 'fixed_off')),
  reward_label text not null default 'Free drink',
  reward_menu_item_id uuid references menu_items(id) on delete set null,
  reward_percent numeric check (reward_percent is null or (reward_percent > 0 and reward_percent <= 100)),
  reward_cents int check (reward_cents is null or reward_cents >= 0),
  qualifying_menu_item_ids jsonb not null default '[]'::jsonb,
  qualifying_category_ids jsonb not null default '[]'::jsonb,
  max_stamps_per_order int check (max_stamps_per_order is null or max_stamps_per_order > 0),
  max_stamps_per_day int check (max_stamps_per_day is null or max_stamps_per_day > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_stamp_cards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  stamps_collected int not null default 0 check (stamps_collected >= 0),
  cards_completed int not null default 0 check (cards_completed >= 0),
  pending_reward boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (merchant_id, customer_id)
);

create index if not exists customer_stamp_cards_customer_idx
  on customer_stamp_cards (customer_id);

create table if not exists stamps_ledger (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  delta int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists stamps_ledger_order_reason_idx
  on stamps_ledger (order_id, customer_id, reason);

create index if not exists stamps_ledger_customer_day_idx
  on stamps_ledger (merchant_id, customer_id, created_at);

grant select, insert, update, delete on stamp_programs to anon, authenticated, project_admin;
grant select, insert, update, delete on customer_stamp_cards to anon, authenticated, project_admin;
grant select, insert, update, delete on stamps_ledger to anon, authenticated, project_admin;

notify pgrst, 'reload schema';
