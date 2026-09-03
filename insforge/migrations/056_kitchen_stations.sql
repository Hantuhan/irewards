-- Prep stations (bar / kitchen / pass). Empty station list = single-pass cafe,
-- which is the existing behaviour and stays the default.
alter table merchants
  add column if not exists kitchen_stations_json jsonb not null default '[]'::jsonb;

-- Which station prepares a category. Null = unrouted, shown to every station.
alter table menu_categories
  add column if not exists station_id text;

-- Station snapshot at order time, so re-routing a category later never
-- rewrites what an old ticket said.
alter table order_items
  add column if not exists station_id text;

-- Per-station progress, e.g. {"bar":"ready","kitchen":"preparing"}.
-- orders.kitchen_status stays the overall status (the least advanced station).
alter table orders
  add column if not exists station_status_json jsonb not null default '{}'::jsonb;

create index if not exists menu_categories_station_idx
  on menu_categories (merchant_id, station_id);

notify pgrst, 'reload schema';
