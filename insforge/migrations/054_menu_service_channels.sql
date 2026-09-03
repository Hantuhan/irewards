-- Per-item ordering channels (industry standard: Toast/Square channel visibility).
alter table menu_items
  add column if not exists available_dine_in boolean not null default true,
  add column if not exists available_takeaway boolean not null default true;
