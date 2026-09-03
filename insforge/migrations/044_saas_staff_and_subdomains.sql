-- SaaS: multi-staff per cafe + subdomain tenancy.

alter table merchants
  add column if not exists subdomain text;

update merchants
set subdomain = slug
where subdomain is null;

alter table merchants
  alter column subdomain set not null;

create unique index if not exists merchants_subdomain_uidx
  on merchants (lower(subdomain));

alter table merchant_users
  add column if not exists role text not null default 'owner',
  add column if not exists active boolean not null default true,
  add column if not exists invited_at timestamptz,
  add column if not exists last_login_at timestamptz;

alter table merchant_users drop constraint if exists merchant_users_role_check;
alter table merchant_users
  add constraint merchant_users_role_check
  check (role in ('owner', 'manager', 'staff'));

update merchant_users set role = 'owner' where role is null or role = '';

-- Second demo staff account for the same cafe (credentials not published in UI/docs).
insert into merchant_users (merchant_id, email, password_hash, name, role, active)
select m.id,
  'staff@demo-cafe.com',
  '9c2b363568f0eff3220a6f142ed90a95:b8bc3ab0fbaef521ea37de0439d56fc8c61e4e0a11fd8ff44ac774e6279da9737f8b012fbf494c15c681cef8a0ae6abf61f7312e31dc47bcaa9690f59ee84cfa',
  'Demo Staff',
  'staff',
  true
from merchants m
where m.slug = 'demo-cafe'
on conflict (email) do nothing;

-- Pilot-ready defaults for demo cafe.
update merchants
set
  retention_enabled = true,
  google_url = coalesce(nullif(trim(google_url), ''), 'https://g.page/r/demo-cafe-review')
where slug = 'demo-cafe';

notify pgrst, 'reload schema';
