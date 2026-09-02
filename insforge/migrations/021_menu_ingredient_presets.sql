-- Merchant ingredient presets + per-item ingredient selection

alter table merchants
  add column if not exists menu_ingredient_presets_json jsonb;

alter table menu_items
  add column if not exists ingredient_ids text[] not null default '{}';

update merchants
set menu_ingredient_presets_json = '[
  {"id":"milk","label":"Milk","group":"Dairy"},
  {"id":"oat_milk","label":"Oat milk","group":"Dairy"},
  {"id":"butter","label":"Butter","group":"Dairy"},
  {"id":"eggs","label":"Eggs","group":"Protein"},
  {"id":"wheat_flour","label":"Wheat flour","group":"Grains"},
  {"id":"espresso","label":"Espresso","group":"Coffee"},
  {"id":"contains_nuts","label":"Contains nuts","group":"Allergens"},
  {"id":"contains_dairy","label":"Contains dairy","group":"Allergens"},
  {"id":"gluten_free","label":"Gluten-free","group":"Dietary"},
  {"id":"vegan","label":"Vegan","group":"Dietary"}
]'::jsonb
where menu_ingredient_presets_json is null;
