-- Menu item modifier groups & options (onion, extras, size, etc.)

create table if not exists menu_modifier_groups (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name text not null,
  required boolean not null default false,
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  sort_order integer not null default 0
);

create table if not exists menu_modifier_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references menu_modifier_groups(id) on delete cascade,
  name text not null,
  price_delta_cents integer not null default 0,
  is_default boolean not null default false,
  sort_order integer not null default 0
);

create index if not exists menu_modifier_groups_item_idx on menu_modifier_groups (menu_item_id);
create index if not exists menu_modifier_options_group_idx on menu_modifier_options (group_id);

alter table order_items
  add column if not exists modifiers jsonb;
