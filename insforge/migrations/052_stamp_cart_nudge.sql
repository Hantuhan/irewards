-- Pay-bar stamp nudge: merchant control for "Add X for +1 stamp?"

alter table stamp_programs
  add column if not exists cart_nudge_enabled boolean not null default true;

notify pgrst, 'reload schema';
