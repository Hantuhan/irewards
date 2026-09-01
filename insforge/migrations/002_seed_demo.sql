-- Demo merchant for local development and weekend pilot

insert into merchants (slug, name, currency, whatsapp_number)
values ('demo-cafe', 'Demo Cafe', 'MYR', '60123456789')
on conflict (slug) do nothing;

insert into venue_tables (merchant_id, table_number)
select id, '1'
from merchants
where slug = 'demo-cafe'
on conflict (merchant_id, table_number) do nothing;

insert into venue_tables (merchant_id, table_number)
select id, '2'
from merchants
where slug = 'demo-cafe'
on conflict (merchant_id, table_number) do nothing;

insert into venue_tables (merchant_id, table_number)
select id, '3'
from merchants
where slug = 'demo-cafe'
on conflict (merchant_id, table_number) do nothing;

insert into venue_tables (merchant_id, table_number)
select id, '4'
from merchants
where slug = 'demo-cafe'
on conflict (merchant_id, table_number) do nothing;

insert into venue_tables (merchant_id, table_number)
select id, '5'
from merchants
where slug = 'demo-cafe'
on conflict (merchant_id, table_number) do nothing;

insert into venue_tables (merchant_id, table_number)
select id, '6'
from merchants
where slug = 'demo-cafe'
on conflict (merchant_id, table_number) do nothing;
