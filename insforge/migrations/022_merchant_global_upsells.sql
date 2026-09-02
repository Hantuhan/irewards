-- Merchant-wide checkout upsells shown on "Anything else?" before payment.
create table if not exists merchant_global_upsells (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  sort_order integer not null default 0,
  unique (merchant_id, menu_item_id)
);

create index if not exists merchant_global_upsells_merchant_id_idx
  on merchant_global_upsells(merchant_id);

-- Demo: popular pastries as global checkout add-ons
insert into merchant_global_upsells (merchant_id, menu_item_id, sort_order)
select m.id, mi.id, v.sort_order
from merchants m
join menu_items mi on mi.merchant_id = m.id
join (values
  ('pain-au-chocolat', 1),
  ('matcha', 2)
) as v(slug, sort_order) on mi.slug = v.slug
where m.slug = 'demo-cafe'
on conflict (merchant_id, menu_item_id) do nothing;
