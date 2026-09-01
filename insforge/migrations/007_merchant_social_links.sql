-- Merchant public contact & social links

alter table merchants
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists google_url text,
  add column if not exists xhs_url text,
  add column if not exists website_url text,
  add column if not exists store_email text;

notify pgrst, 'reload schema';
