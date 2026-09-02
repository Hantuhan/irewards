-- WhatsApp message templates submitted to Meta for approval.
--
-- Business-initiated WhatsApp messages (broadcasts, win-back, review nudges)
-- must use a template Meta has approved. Each row is one submission of a
-- campaign's message; resubmitting after an edit creates a new row so the
-- history of what Meta saw is preserved. The latest row per campaign is the
-- one the UI and the sender consult.

create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  -- Meta template name: lowercase letters, digits and underscores.
  name text not null,
  language text not null default 'en',
  category text not null default 'MARKETING'
    check (category in ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  -- Exactly what was submitted: the merchant's copy with {merchant}/{name}/{code}
  -- tokens, the positional token order sent as {{1}}, {{2}}…, and the header.
  body_text text not null,
  variables jsonb not null default '[]'::jsonb,
  header_image_url text,
  components jsonb not null default '[]'::jsonb,
  -- Meta's template id and review outcome.
  meta_template_id text,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected', 'paused', 'disabled', 'failed')),
  rejection_reason text,
  -- 'meta' in production; 'dev' when WHATSAPP_SKIP_SEND simulates the review.
  provider text not null default 'meta',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  status_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_templates_campaign_idx
  on whatsapp_templates (campaign_id, created_at desc);

create index if not exists whatsapp_templates_merchant_idx
  on whatsapp_templates (merchant_id, created_at desc);

create index if not exists whatsapp_templates_meta_idx
  on whatsapp_templates (meta_template_id);

-- The cron poller only looks at rows still under review.
create index if not exists whatsapp_templates_pending_idx
  on whatsapp_templates (status)
  where status = 'pending';

notify pgrst, 'reload schema';
