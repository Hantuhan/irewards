-- Track whether the merchant finished the iRewards membership walkthrough.

alter table merchants
  add column if not exists membership_setup_completed_at timestamptz;

notify pgrst, 'reload schema';
