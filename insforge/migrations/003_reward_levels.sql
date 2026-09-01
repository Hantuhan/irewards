-- iRewards 5-level tier system

create table reward_levels (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  level_number int not null check (level_number between 1 and 5),
  name text not null,
  min_lifetime_points int not null check (min_lifetime_points >= 0),
  points_multiplier numeric not null default 1.0 check (points_multiplier > 0),
  perk_description text,
  discount_percent numeric not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  unique (merchant_id, level_number)
);

alter table customers
  add column if not exists lifetime_points_earned int not null default 0 check (lifetime_points_earned >= 0);

alter table orders
  add column if not exists subtotal_cents int,
  add column if not exists discount_cents int not null default 0 check (discount_cents >= 0);

update orders set subtotal_cents = total_cents where subtotal_cents is null;
alter table orders alter column subtotal_cents set not null;

create index reward_levels_merchant_idx on reward_levels (merchant_id, level_number);

-- Default iRewards tiers for demo-cafe
insert into reward_levels (
  merchant_id, level_number, name, min_lifetime_points,
  points_multiplier, perk_description, discount_percent
)
select m.id, v.level_number, v.name, v.min_lifetime_points,
       v.points_multiplier, v.perk_description, v.discount_percent
from merchants m
cross join (
  values
    (1, 'Starter', 0, 1.0, 'Welcome to iRewards', 0),
    (2, 'Bronze', 50, 1.1, 'Free topping upgrade', 5),
    (3, 'Silver', 150, 1.25, 'Birthday drink', 8),
    (4, 'Gold', 400, 1.5, 'Priority queue', 12),
    (5, 'Platinum', 1000, 2.0, 'Exclusive seasonal menu', 15)
) as v(level_number, name, min_lifetime_points, points_multiplier, perk_description, discount_percent)
where m.slug = 'demo-cafe'
on conflict (merchant_id, level_number) do nothing;

grant select, insert, update, delete on reward_levels to anon, authenticated, project_admin;

notify pgrst, 'reload schema';
