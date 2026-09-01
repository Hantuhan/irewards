-- Product tags and time-based availability

alter table merchants
  add column if not exists timezone text not null default 'Asia/Kuala_Lumpur';

alter table menu_items
  add column if not exists tags text[] not null default '{}',
  add column if not exists availability_mode text not null default 'always'
    check (availability_mode in ('always', 'weekly', 'date_range')),
  add column if not exists availability_weekly jsonb,
  add column if not exists available_from timestamptz,
  add column if not exists available_until timestamptz;
