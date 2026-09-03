-- Per-merchant WhatsApp Business Accounts (Meta Embedded Signup).
--
-- Until now the platform sent every message from one WABA held in env vars.
-- That put the whole customer base behind a single quality rating — one
-- merchant sending junk would get the number restricted and messaging would
-- stop for everyone at once — and it put every message on our Meta bill.
--
-- Each merchant now connects their own WABA through Embedded Signup. Meta
-- bills them, their quality rating is their own, and a bad actor can only
-- damage themselves.

create table if not exists whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null unique references merchants(id) on delete cascade,

  -- Meta identifiers. phone_number_id is how inbound webhooks are routed back
  -- to a merchant, so it must be unique across the platform.
  waba_id text not null,
  phone_number_id text not null unique,
  display_phone_number text,
  verified_name text,
  business_id text,

  -- Encrypted at rest: this token sends messages billed to the merchant.
  -- Never select it into anything user-facing.
  access_token_cipher text not null,

  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'invalid')),
  /** Set when Meta rejects the token so the dashboard can ask for a reconnect. */
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table whatsapp_accounts is
  'One Meta WABA per merchant, connected via Embedded Signup. access_token_cipher is AES-256-GCM.';

create index if not exists whatsapp_accounts_status_idx
  on whatsapp_accounts (status) where status = 'connected';

-- Templates are approved against a specific WABA, so an approval on one
-- merchant's account says nothing about another's.
alter table whatsapp_templates
  add column if not exists waba_id text;

create index if not exists whatsapp_templates_waba_idx
  on whatsapp_templates (waba_id) where waba_id is not null;

-- Number health is per merchant now, not one platform-wide row.
alter table whatsapp_number_health
  add column if not exists merchant_id uuid references merchants(id) on delete cascade;

create index if not exists whatsapp_number_health_merchant_idx
  on whatsapp_number_health (merchant_id) where merchant_id is not null;

grant select, insert, update, delete on whatsapp_accounts to anon, authenticated, project_admin;

notify pgrst, 'reload schema';
