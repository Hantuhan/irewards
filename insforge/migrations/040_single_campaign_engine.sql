-- One automation engine.
--
-- The fixed "campaign bots" (automation_rules + hard-coded senders) and the
-- campaign workflow runtime did the same job twice, with different copy and
-- different settings. From here on every automated journey is a campaign with
-- a trigger, so it goes through the builder, Meta template approval and
-- reporting like everything else.
--
-- Converted bots start PAUSED: their WhatsApp copy must be approved by Meta
-- before it can be sent as a business-initiated message.

-- 1. The job queue only knew the bot job types, so the builder's "Award points"
--    and "Issue voucher" actions could never be queued.
alter table automation_jobs drop constraint if exists automation_jobs_job_type_check;
alter table automation_jobs add constraint automation_jobs_job_type_check check (
  job_type in (
    'campaign_whatsapp', 'campaign_sms', 'campaign_award_points', 'campaign_issue_voucher',
    -- legacy bot jobs still sitting in the queue; the worker cancels them
    'review_nudge', 'bounce_back', 'churn_winback'
  )
);

-- 2. Daily inactivity sweep marker for the "No visit for N days" trigger.
alter table merchants add column if not exists automation_sweep_at timestamptz;

-- 3. Bots → campaigns. Only the three bots that actually ran are converted;
--    "birthday_perk" never had a sender.
with wa as (
  select
    r.merchant_id,
    r.rule_key,
    r.enabled,
    m.name as merchant_name,
    coalesce(nullif(m.google_review_delay_minutes, 0), 30) as review_delay,
    coalesce(nullif(m.bounce_back_discount_percent, 0), 20) as bb_discount,
    coalesce(nullif(m.bounce_back_expiry_days, 0), 14) as bb_expiry,
    coalesce((r.config->>'inactiveDays')::int, 30) as inactive_days,
    coalesce((r.config->>'discountPercent')::numeric, 20) as wb_discount,
    coalesce((r.config->>'expiryDays')::int, 14) as wb_expiry
  from automation_rules r
  join merchants m on m.id = r.merchant_id
  where r.rule_key in ('post_payment_join', 'review_nudge', 'churn_winback')
),
spec as (
  select
    merchant_id,
    rule_key,
    case rule_key
      when 'post_payment_join' then 'Bounce-back voucher'
      when 'review_nudge' then 'Review nudge'
      else 'Win-back · ' || inactive_days || ' days'
    end as name,
    case rule_key when 'churn_winback' then 'no_visit_days' else 'order_paid' end as trigger_type,
    case rule_key
      when 'post_payment_join' then
        format('Thanks for dining at {merchant}, {name}! Here''s %s%% off your next visit — use code {code} within %s days when you scan our table QR.', bb_discount, bb_expiry)
      when 'review_nudge' then
        'Hi {name}, thanks for visiting {merchant}! How was it? Reply 5 if you loved it and we''ll send our Google review link. Reply 1-4 and we''ll pass your feedback to the team privately.'
      else
        format('We miss you at {merchant}, {name}! Come back this week and enjoy %s%% off with code {code}. Scan any table QR to order.', wb_discount)
    end as body,
    case rule_key
      when 'post_payment_join' then jsonb_build_array(
        jsonb_build_object('id','act-wait','kind','action','type','wait','config',jsonb_build_object('amount',2,'unit','minutes')),
        jsonb_build_object('id','act-voucher','kind','action','type','issue_voucher','config',jsonb_build_object('name','Come back','discountPercent',bb_discount,'expiryDays',bb_expiry))
      )
      when 'review_nudge' then jsonb_build_array(
        jsonb_build_object('id','act-wait','kind','action','type','wait','config',jsonb_build_object('amount',review_delay,'unit','minutes'))
      )
      else jsonb_build_array(
        jsonb_build_object('id','act-voucher','kind','action','type','issue_voucher','config',jsonb_build_object('name','Come back','discountPercent',wb_discount,'expiryDays',wb_expiry))
      )
    end as extra_actions,
    case rule_key when 'churn_winback' then jsonb_build_object('days', inactive_days) else jsonb_build_object('minSpend', 0) end as trigger_config
  from wa
)
insert into campaigns (merchant_id, name, channel, status, message_body, workflow, trigger_type)
select
  s.merchant_id,
  s.name,
  'whatsapp',
  'paused',
  s.body || E'\n\nReply STOP to opt out.',
  jsonb_build_object(
    'version', 1,
    'trigger', jsonb_build_object('id', 'trigger-' || s.trigger_type, 'kind', 'trigger', 'type', s.trigger_type, 'config', s.trigger_config),
    'conditions', jsonb_build_array(
      jsonb_build_object('id','cond-optin','kind','condition','type','marketing_opted_in','config','{}'::jsonb)
    ),
    'actions',
      -- wait steps come first, the message after, the voucher last
      (select coalesce(jsonb_agg(a) filter (where a->>'type' = 'wait'), '[]'::jsonb) from jsonb_array_elements(s.extra_actions) a)
      || jsonb_build_array(
        jsonb_build_object('id','act-whatsapp','kind','action','type','send_whatsapp','config',
          jsonb_build_object('template', jsonb_build_object(
            'headerType','none','headerText','','headerImageUrl',null,
            'body', s.body,'footer','','includeOptOut',true,'buttons','[]'::jsonb)))
      )
      || (select coalesce(jsonb_agg(a) filter (where a->>'type' <> 'wait'), '[]'::jsonb) from jsonb_array_elements(s.extra_actions) a),
    'elseActions', '[]'::jsonb
  ),
  s.trigger_type
from spec s
where not exists (
  select 1 from campaigns c where c.merchant_id = s.merchant_id and c.name = s.name
);

-- 4. Seeded "auto" campaigns become real member-joined journeys.
update campaigns
set
  channel = 'whatsapp',
  status = case when status = 'active' then 'paused' else status end,
  trigger_type = 'member_joined',
  message_body = coalesce(message_body, E'Hi {name}, welcome to {merchant}! You''re on our rewards list — show this message on your next visit for a little thank-you treat.\n\nReply STOP to opt out.'),
  workflow = jsonb_build_object(
    'version', 1,
    'trigger', jsonb_build_object('id','trigger-member_joined','kind','trigger','type','member_joined','config',jsonb_build_object('source','any','firstTimeOnly',true)),
    'conditions', jsonb_build_array(jsonb_build_object('id','cond-optin','kind','condition','type','marketing_opted_in','config','{}'::jsonb)),
    'actions', jsonb_build_array(
      jsonb_build_object('id','act-whatsapp','kind','action','type','send_whatsapp','config',
        jsonb_build_object('template', jsonb_build_object(
          'headerType','none','headerText','','headerImageUrl',null,
          'body', regexp_replace(coalesce(message_body, 'Hi {name}, welcome to {merchant}! You''re on our rewards list — show this message on your next visit for a little thank-you treat.'), E'\\s*Reply STOP to opt out\\.?\\s*$', ''),
          'footer','','includeOptOut',true,'buttons','[]'::jsonb)))
    ),
    'elseActions', '[]'::jsonb
  )
where channel = 'auto';

-- 5. Retire the bot tables and the duplicated retention knobs. The per-journey
--    delay, discount and expiry now live inside each campaign's steps;
--    retention_enabled stays as the "pause all automated campaigns" switch.
drop table if exists automation_rules;
alter table merchants
  drop column if exists google_review_delay_minutes,
  drop column if exists bounce_back_discount_percent,
  drop column if exists bounce_back_expiry_days;

-- Legacy bot jobs still pending are cancelled by the worker on its next run.

notify pgrst, 'reload schema';
