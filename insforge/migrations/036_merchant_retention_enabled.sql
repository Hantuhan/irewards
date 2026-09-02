alter table merchants
  add column if not exists retention_enabled boolean not null default true;
