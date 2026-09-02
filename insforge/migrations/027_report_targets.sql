-- Revenue targets for report benchmarking

alter table merchants
  add column if not exists daily_revenue_target_cents integer,
  add column if not exists weekly_revenue_target_cents integer,
  add column if not exists monthly_revenue_target_cents integer;

notify pgrst, 'reload schema';
