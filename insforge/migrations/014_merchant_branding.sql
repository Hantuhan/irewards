-- Store branding & registered business details

alter table merchants
  add column if not exists logo_url text,
  add column if not exists address text,
  add column if not exists registration_number text,
  add column if not exists landline_number text;

notify pgrst, 'reload schema';
