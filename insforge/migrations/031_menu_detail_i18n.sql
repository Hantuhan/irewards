-- Product detail translations: custom ingredients text + item notes

alter table menu_items
  add column if not exists ingredients_i18n jsonb not null default '{}'::jsonb,
  add column if not exists item_notes_i18n jsonb not null default '{}'::jsonb;

update menu_items
set ingredients_i18n = ingredients_i18n || jsonb_build_object('en', ingredients)
where ingredients is not null
  and ingredients <> ''
  and (ingredients_i18n = '{}'::jsonb or not ingredients_i18n ? 'en');

update menu_items
set item_notes_i18n = item_notes_i18n || jsonb_build_object('en', item_notes)
where item_notes is not null
  and item_notes <> ''
  and (item_notes_i18n = '{}'::jsonb or not item_notes_i18n ? 'en');
