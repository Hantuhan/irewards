-- Per-option max quantity for modifier add-ons

alter table menu_modifier_options
  add column if not exists max_quantity integer not null default 1 check (max_quantity >= 1);
