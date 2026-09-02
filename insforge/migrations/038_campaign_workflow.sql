-- Campaign workflows: persist the trigger / condition / action graph built in
-- the visual editor, so campaigns can fire automatically instead of only being
-- broadcast by hand.

alter table campaigns
  add column if not exists workflow jsonb,
  add column if not exists trigger_type text;

-- trigger_type mirrors workflow->'trigger'->>'type' so the runtime can index a
-- lookup by event without scanning jsonb.
create index if not exists campaigns_trigger_idx
  on campaigns (merchant_id, trigger_type, status);

-- Existing rows predate the builder: mark them manual so nothing starts firing
-- unexpectedly after this migration.
update campaigns
set trigger_type = case when channel = 'banner' then 'storefront_opened' else 'manual' end
where trigger_type is null;

-- Log which campaign sent a message so per-campaign reporting stays accurate
-- once several workflows can message the same member.
create table if not exists campaign_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  trigger_type text not null,
  matched boolean not null,
  skip_reason text,
  created_at timestamptz not null default now()
);

create index if not exists campaign_workflow_runs_campaign_idx
  on campaign_workflow_runs (campaign_id, created_at desc);

-- A member can only enter a given campaign once per cooldown window; this index
-- backs that lookup.
create index if not exists campaign_workflow_runs_customer_idx
  on campaign_workflow_runs (campaign_id, customer_id, created_at desc);

notify pgrst, 'reload schema';
