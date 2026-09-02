-- Points rules, program settings, and tier perk matrix

alter table merchants
  add column if not exists birthday_bonus_points int not null default 50 check (birthday_bonus_points >= 0),
  add column if not exists points_expiry_days int not null default 0 check (points_expiry_days >= 0),
  add column if not exists points_redeem_cents_per_point int not null default 10 check (points_redeem_cents_per_point > 0);

alter table reward_levels
  add column if not exists tier_active boolean not null default true,
  add column if not exists point_expiry_days int,
  add column if not exists birthday_points int not null default 0,
  add column if not exists welcome_points int not null default 0,
  add column if not exists welcome_rewards int not null default 0,
  add column if not exists renew_points int not null default 0,
  add column if not exists renew_rewards int not null default 0,
  add column if not exists validity_months int;

create table if not exists points_rules (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  points_multiplier numeric not null default 2.0 check (points_multiplier > 0),
  main_conditions jsonb not null default '[]'::jsonb,
  item_conditions jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists points_rules_merchant_idx on points_rules (merchant_id, sort_order);

grant select, insert, update, delete on points_rules to anon, authenticated, project_admin;

-- Demo tier perks (Bronze–Platinum style matrix)
update reward_levels rl
set
  birthday_points = v.bday,
  welcome_points = v.welcome_pts,
  welcome_rewards = v.welcome_rw,
  renew_points = v.renew_pts,
  renew_rewards = v.renew_rw,
  point_expiry_days = v.expiry_days,
  validity_months = v.validity
from merchants m,
lateral (
  values
    (2, 90, 0, 0, 150, 1, 60, null),
    (3, 120, 0, 0, 200, 1, 90, 12),
    (4, 240, 0, 0, 350, 2, 180, 18),
    (5, 480, 0, 0, 500, 3, 60, 24)
) as v(level_number, bday, welcome_pts, welcome_rw, renew_pts, renew_rw, expiry_days, validity)
where m.slug = 'demo-cafe'
  and rl.merchant_id = m.id
  and rl.level_number = v.level_number;

update reward_levels rl
set birthday_points = 50, welcome_points = 100, welcome_rewards = 1
from merchants m
where m.slug = 'demo-cafe' and rl.merchant_id = m.id and rl.level_number = 1;

insert into points_rules (
  merchant_id, name, status, points_multiplier, main_conditions, item_conditions, sort_order
)
select
  m.id,
  'Monday double points',
  'active',
  2.0,
  '[{"field":"day_of_week","operator":"is","value":"monday"}]'::jsonb,
  '[]'::jsonb,
  1
from merchants m
where m.slug = 'demo-cafe'
  and not exists (
    select 1 from points_rules pr where pr.merchant_id = m.id and pr.name = 'Monday double points'
  );

notify pgrst, 'reload schema';
