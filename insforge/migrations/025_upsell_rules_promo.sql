-- Upsell / downsell rules and promotional pricing

alter table menu_upsell_links
  add column if not exists suggest_type text not null default 'upsell'
    check (suggest_type in ('upsell', 'downsell')),
  add column if not exists promo_price_cents integer
    check (promo_price_cents is null or promo_price_cents >= 0),
  add column if not exists rule_type text not null default 'always'
    check (rule_type in ('always', 'min_cart', 'max_cart')),
  add column if not exists min_cart_cents integer
    check (min_cart_cents is null or min_cart_cents >= 0),
  add column if not exists max_cart_cents integer
    check (max_cart_cents is null or max_cart_cents >= 0),
  add column if not exists priority integer not null default 10;

alter table merchant_global_upsells
  add column if not exists suggest_type text not null default 'upsell'
    check (suggest_type in ('upsell', 'downsell')),
  add column if not exists promo_price_cents integer
    check (promo_price_cents is null or promo_price_cents >= 0),
  add column if not exists rule_type text not null default 'always'
    check (rule_type in ('always', 'min_cart', 'max_cart')),
  add column if not exists min_cart_cents integer
    check (min_cart_cents is null or min_cart_cents >= 0),
  add column if not exists max_cart_cents integer
    check (max_cart_cents is null or max_cart_cents >= 0),
  add column if not exists priority integer not null default 10;

-- Demo: croissant upsell for latte at RM 2
update menu_upsell_links
set promo_price_cents = 200, rule_type = 'always', suggest_type = 'upsell'
from menu_items src
join merchants m on m.id = src.merchant_id
join menu_items ups on ups.merchant_id = m.id and ups.slug = 'croissant'
where menu_upsell_links.menu_item_id = src.id
  and menu_upsell_links.upsell_item_id = ups.id
  and m.slug = 'demo-cafe'
  and src.slug = 'latte';
