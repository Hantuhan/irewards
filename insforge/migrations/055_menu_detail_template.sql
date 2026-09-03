-- Product detail page template fields (storefront PDP).
-- detail_json: { eyebrow, heroNote, heroNoteRight, stats: [{label, value}], notesPlaceholder }
alter table menu_items
  add column if not exists detail_json jsonb not null default '{}'::jsonb;

-- Helper copy shown under modifier group titles / option names on the detail page.
alter table menu_modifier_groups
  add column if not exists description text;

alter table menu_modifier_options
  add column if not exists description text;

-- Per-line kitchen / barista note captured on the product detail page.
alter table order_items
  add column if not exists note text;

notify pgrst, 'reload schema';
