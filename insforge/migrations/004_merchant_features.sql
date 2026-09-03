-- Merchant SaaS: menu, kitchen workflow, members, campaigns, automation, auth

alter table merchants
  add column if not exists points_per_ringgit numeric not null default 0.1;

alter table customers
  add column if not exists display_name text,
  add column if not exists last_visit_at timestamptz;

alter table orders
  add column if not exists kitchen_status text
    check (kitchen_status in ('new', 'preparing', 'ready', 'served'));

create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order integer not null default 0,
  unique (merchant_id, slug)
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  unique (merchant_id, slug)
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('whatsapp', 'auto')),
  status text not null check (status in ('draft', 'active', 'scheduled', 'paused')) default 'draft',
  reach_count integer not null default 0,
  conversion_rate numeric,
  created_at timestamptz not null default now()
);

create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  rule_key text not null,
  title text not null,
  description text not null,
  enabled boolean not null default false,
  unique (merchant_id, rule_key)
);

create table if not exists merchant_users (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  name text,
  created_at timestamptz not null default now()
);

create index if not exists menu_items_merchant_active_idx on menu_items (merchant_id, active);
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists orders_merchant_kitchen_idx on orders (merchant_id, kitchen_status);

-- Demo menu for demo-cafe
insert into menu_categories (merchant_id, slug, label, sort_order)
select m.id, v.slug, v.label, v.sort_order
from merchants m
cross join (values
  ('coffee', 'Coffee', 1),
  ('pastries', 'Pastries', 2),
  ('mains', 'Mains', 3)
) as v(slug, label, sort_order)
where m.slug = 'demo-cafe'
on conflict (merchant_id, slug) do nothing;

insert into menu_items (merchant_id, category_id, slug, name, description, price_cents, sort_order)
select m.id, c.id, v.slug, v.name, v.description, v.price_cents, v.sort_order
from merchants m
cross join (values
  ('coffee', 'latte', 'Oat Milk Latte', 'Iced, less sweet. Smooth oat milk with double espresso.', 1200, 1),
  ('coffee', 'pour-over', 'Pour Over', 'Single origin Ethiopia Yirgacheffe. Floral, bright acidity.', 1400, 2),
  ('coffee', 'matcha', 'Matcha Espresso', 'Ceremonial grade matcha layered with espresso and milk.', 1700, 3),
  ('pastries', 'croissant', 'Butter Croissant', 'Flaky, buttery layers baked fresh each morning.', 800, 1),
  ('pastries', 'pain-au-chocolat', 'Pain au Chocolat', 'Dark chocolate batons in laminated pastry.', 950, 2),
  ('mains', 'sandwich', 'Club Sandwich', 'Grilled chicken, egg, lettuce, house mayo on sourdough.', 1800, 1)
) as v(cat, slug, name, description, price_cents, sort_order)
join menu_categories c on c.merchant_id = m.id and c.slug = v.cat
where m.slug = 'demo-cafe'
on conflict (merchant_id, slug) do nothing;

-- Default automation rules
insert into automation_rules (merchant_id, rule_key, title, description, enabled)
select m.id, v.rule_key, v.title, v.description, v.enabled
from merchants m
cross join (values
  ('post_payment_join', 'Post-payment WhatsApp join', 'Send join link after verified payment. Award +1 bonus point on opt-in.', true),
  ('review_nudge', 'Review nudge · 24h', 'Ask for Google review one day after first member order.', true),
  ('churn_winback', 'Churn win-back · 30 days', 'Send voucher when member has not visited in 30 days.', false),
  ('birthday_perk', 'Birthday perk', 'Free drink voucher on member birthday week.', false)
) as v(rule_key, title, description, enabled)
where m.slug = 'demo-cafe'
on conflict (merchant_id, rule_key) do nothing;

-- Demo campaigns
insert into campaigns (merchant_id, name, channel, status, reach_count, conversion_rate)
select m.id, v.name, v.channel, v.status, v.reach, v.conv
from merchants m
cross join (values
  ('Weekend latte boost', 'whatsapp', 'active', 312, 0.18),
  ('Churn win-back · 30 days', 'whatsapp', 'scheduled', 89, null),
  ('New member welcome', 'auto', 'active', 156, 0.42)
) as v(name, channel, status, reach, conv)
where m.slug = 'demo-cafe'
  and not exists (select 1 from campaigns c where c.merchant_id = m.id);

-- Demo merchant login (password set via local ops; not published in UI/docs)
insert into merchant_users (merchant_id, email, password_hash, name)
select m.id, 'owner@demo-cafe.com',
  '372e15c18c957029b9d77f332579dcd2:c058a1c48e6155e95bd650d7dc04ec3e893ab106cecb76d48bc3a2f81e235ca4c3fb35a9cda0a523f1aba67879abae40c23a4270c090ae18ad82157e063a070c',
  'Demo Owner'
from merchants m
where m.slug = 'demo-cafe'
on conflict (email) do nothing;

notify pgrst, 'reload schema';
