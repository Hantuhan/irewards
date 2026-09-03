-- Request rate limiting for the unauthenticated storefront endpoints.
--
-- Promo validation and member lookup both take an attacker-supplied value and
-- say whether it exists, with no cost to guessing. This is the counter behind
-- both.

create table if not exists rate_limits (
  bucket text not null,
  identifier text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, identifier, window_start)
);

comment on table rate_limits is
  'Fixed-window request counters. One row per (bucket, identifier, window).';

create index if not exists rate_limits_window_idx on rate_limits (window_start);

grant select, insert, update, delete on rate_limits to anon, authenticated, project_admin;

notify pgrst, 'reload schema';
