-- Campaign send hygiene: quiet hours + cross-campaign frequency cap + promo↔.
-- Also allow campaign_events.redeem for voucher redemptions.

alter table merchants
  add column if not exists campaign_send_window_start time,
  add column if not exists campaign_send_window_end time,
  add column if not exists campaign_send_cap_hours integer not null default 48;

comment on column merchants.campaign_send_window_start is
  'Local quiet-hours start (merchant timezone). Null = no window (send anytime).';
comment on column merchants.campaign_send_window_end is
  'Local quiet-hours end (merchant timezone). Null = no window.';
comment on column merchants.campaign_send_cap_hours is
  'Min hours between auto WhatsApp/SMS sends to the same member across campaigns (0 = off).';

-- Default window for demo cafes: 10:00–20:00 local
update merchants
set
  campaign_send_window_start = coalesce(campaign_send_window_start, time '10:00'),
  campaign_send_window_end = coalesce(campaign_send_window_end, time '20:00')
where slug = 'demo-cafe';

alter table promos
  add column if not exists campaign_id uuid references campaigns(id) on delete set null;

create index if not exists promos_campaign_idx on promos (campaign_id)
  where campaign_id is not null;

alter table campaign_events drop constraint if exists campaign_events_event_type_check;
alter table campaign_events
  add constraint campaign_events_event_type_check
  check (event_type in ('impression', 'click', 'send', 'conversion', 'redeem'));

notify pgrst, 'reload schema';
