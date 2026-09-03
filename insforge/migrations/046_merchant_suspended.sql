-- Platform admin can suspend a tenant without deleting data.

alter table merchants
  add column if not exists suspended_at timestamptz;

notify pgrst, 'reload schema';
