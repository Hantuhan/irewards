-- Automation job reliability: claim-before-send, retries, and a cron heartbeat.
--
-- Before this, `listDueAutomationJobs` read pending rows and the worker sent
-- them without claiming, so two overlapping cron runs both picked up the same
-- job and messaged the member twice. Failures were also terminal — one Meta
-- blip and the message was lost with nobody told.

alter table automation_jobs drop constraint if exists automation_jobs_status_check;
alter table automation_jobs
  add constraint automation_jobs_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled'));

alter table automation_jobs
  add column if not exists attempts integer not null default 0,
  add column if not exists claimed_at timestamptz;

comment on column automation_jobs.attempts is
  'Incremented each time the worker claims the job. Retries stop at MAX_JOB_ATTEMPTS.';
comment on column automation_jobs.claimed_at is
  'When the worker claimed this job. A claim older than the stall window is swept to failed.';

-- Claim lookups and the stalled-claim sweep.
create index if not exists automation_jobs_claimed_idx
  on automation_jobs (claimed_at)
  where status = 'processing';

-- The cron heartbeat. One row per task name; absence or staleness means the
-- external cron is not wired and nothing is being sent.
create table if not exists system_heartbeats (
  task text primary key,
  last_run_at timestamptz not null default now(),
  last_result jsonb,
  updated_at timestamptz not null default now()
);

comment on table system_heartbeats is
  'Last successful run per background task. The dashboard alarms when automation goes quiet.';

grant select, insert, update, delete on system_heartbeats to anon, authenticated, project_admin;

notify pgrst, 'reload schema';
