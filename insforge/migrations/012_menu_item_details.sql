-- Rich menu item details for storefront product sheet

alter table menu_items
  add column if not exists kcal integer check (kcal is null or kcal >= 0),
  add column if not exists sugar_g numeric(6, 1) check (sugar_g is null or sugar_g >= 0),
  add column if not exists ingredients text,
  add column if not exists item_notes text,
  add column if not exists special_tags text[] not null default '{}';
