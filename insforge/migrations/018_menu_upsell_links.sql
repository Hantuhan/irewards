-- Merchant-configured upsell links: when item A is in cart, suggest linked items.
create table if not exists menu_upsell_links (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  upsell_item_id uuid not null references menu_items(id) on delete cascade,
  sort_order integer not null default 0,
  unique (menu_item_id, upsell_item_id),
  check (menu_item_id <> upsell_item_id)
);

create index if not exists menu_upsell_links_menu_item_id_idx
  on menu_upsell_links(menu_item_id);

-- Demo: latte pairs with croissant; club sandwich pairs with matcha
insert into menu_upsell_links (menu_item_id, upsell_item_id, sort_order)
select src.id, ups.id, 1
from menu_items src
join menu_items ups on ups.merchant_id = src.merchant_id and ups.slug = 'croissant'
join merchants m on m.id = src.merchant_id and m.slug = 'demo-cafe'
where src.slug = 'latte'
on conflict (menu_item_id, upsell_item_id) do nothing;

insert into menu_upsell_links (menu_item_id, upsell_item_id, sort_order)
select src.id, ups.id, 1
from menu_items src
join menu_items ups on ups.merchant_id = src.merchant_id and ups.slug = 'matcha'
join merchants m on m.id = src.merchant_id and m.slug = 'demo-cafe'
where src.slug = 'sandwich'
on conflict (menu_item_id, upsell_item_id) do nothing;
