alter table merchants
  add column if not exists sst_number text,
  add column if not exists gst_number text;
