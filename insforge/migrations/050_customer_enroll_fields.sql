-- Optional profile fields for staff enroll (birthday + internal notes).
alter table customers
  add column if not exists birthday_month smallint
    check (birthday_month is null or (birthday_month >= 1 and birthday_month <= 12));

alter table customers
  add column if not exists birthday_day smallint
    check (birthday_day is null or (birthday_day >= 1 and birthday_day <= 31));

alter table customers
  add column if not exists staff_notes text;
