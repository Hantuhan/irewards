-- Receipt settings: service charge, SST (MYR), GST (SGD)

alter table merchants
  add column if not exists service_charge_enabled boolean not null default false,
  add column if not exists service_charge_percent numeric not null default 10,
  add column if not exists sst_enabled boolean not null default false,
  add column if not exists sst_rate_percent numeric not null default 6,
  add column if not exists gst_enabled boolean not null default false,
  add column if not exists gst_rate_percent numeric not null default 9,
  add column if not exists receipt_footer_text text,
  add column if not exists receipt_show_registration boolean not null default true;

alter table orders
  add column if not exists service_charge_cents integer not null default 0,
  add column if not exists tax_cents integer not null default 0,
  add column if not exists tax_label text;

notify pgrst, 'reload schema';
