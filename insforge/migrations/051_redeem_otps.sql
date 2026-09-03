-- WhatsApp OTP for points redeem authorization (short-lived, hashed codes).

create table if not exists redeem_otps (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  phone text not null,
  code_hash text not null,
  attempts int not null default 0 check (attempts >= 0),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists redeem_otps_customer_open_idx
  on redeem_otps (customer_id, created_at desc)
  where consumed_at is null;

create index if not exists redeem_otps_phone_created_idx
  on redeem_otps (phone, created_at desc);

grant select, insert, update, delete on redeem_otps to anon, authenticated, project_admin;

notify pgrst, 'reload schema';
