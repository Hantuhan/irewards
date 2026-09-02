-- Per-product takeaway surcharge + order service type

alter table menu_items
  add column if not exists takeaway_charge_enabled boolean not null default false,
  add column if not exists takeaway_surcharge_type text
    check (takeaway_surcharge_type is null or takeaway_surcharge_type in ('percentage', 'fixed')),
  add column if not exists takeaway_surcharge_value numeric(10, 2),
  add column if not exists takeaway_surcharge_priority integer not null default 10;

alter table orders
  add column if not exists service_type text not null default 'dine_in'
    check (service_type in ('dine_in', 'takeaway'));

alter table order_items
  add column if not exists packed_for_takeaway boolean not null default false,
  add column if not exists takeaway_surcharge_cents integer not null default 0;

-- Demo: packaging fee on mains
update menu_items mi
set
  takeaway_charge_enabled = true,
  takeaway_surcharge_type = 'fixed',
  takeaway_surcharge_value = 100,
  takeaway_surcharge_priority = 10
from merchants m
where mi.merchant_id = m.id
  and m.slug = 'demo-cafe'
  and mi.slug = 'sandwich';
