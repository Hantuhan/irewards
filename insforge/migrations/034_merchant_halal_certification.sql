-- Store-level halal certification declaration (MY/SG F&B)

alter table merchants
  add column if not exists halal_certified boolean,
  add column if not exists halal_certificate_url text;

comment on column merchants.halal_certified is 'NULL = not declared; true = halal certified outlet; false = not halal certified';
comment on column merchants.halal_certificate_url is 'Uploaded JAKIM/MUIS or other halal certificate (PDF or image)';

notify pgrst, 'reload schema';
