-- Cafe-menu main ingredient tags (chicken, fish, veggie…) on each product.
alter table menu_items
  add column if not exists main_ingredient_ids text[] not null default '{}';
