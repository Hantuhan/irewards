-- Member feedback from WhatsApp review-nudge replies (1–5).
-- Rating 5 = happy (Google link sent); 1–4 = private complaint for the merchant.

create table if not exists member_feedback (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  source text not null default 'whatsapp_review_reply',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists member_feedback_merchant_created_idx
  on member_feedback (merchant_id, created_at desc);

create index if not exists member_feedback_open_idx
  on member_feedback (merchant_id, rating)
  where rating between 1 and 4;

-- Align existing win-back campaigns with the product plan (day 7, not 30).
update campaigns
set
  name = regexp_replace(name, '30 days', '7 days', 'i'),
  workflow = jsonb_set(
    workflow,
    '{trigger,config,days}',
    '7'::jsonb,
    true
  )
where channel = 'whatsapp'
  and trigger_type = 'no_visit_days'
  and coalesce((workflow->'trigger'->'config'->>'days')::int, 30) = 30
  and status in ('draft', 'paused', 'scheduled');

notify pgrst, 'reload schema';
