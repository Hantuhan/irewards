-- Legal policy pages (refund, privacy)

alter table merchants
  add column if not exists refund_policy text,
  add column if not exists privacy_policy text;

notify pgrst, 'reload schema';
