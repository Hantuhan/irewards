-- Meta can pause, disable or re-review a template after approval, and rates
-- the sender number's quality. Record those signals so campaigns pause
-- themselves with a visible reason instead of failing silently.

alter table campaigns
  add column if not exists status_reason text;

alter table whatsapp_templates
  add column if not exists quality_rating text;

-- One row per sender phone number (platform-level today: every merchant sends
-- from the same number, so its health matters to all of them).
create table if not exists whatsapp_number_health (
  phone_number_id text primary key,
  display_phone_number text,
  quality_rating text,
  messaging_limit text,
  last_event text,
  updated_at timestamptz not null default now()
);

notify pgrst, 'reload schema';
