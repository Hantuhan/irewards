-- Coffee specialty attributes (roast, origin, tasting notes, flavor sliders)

alter table menu_items
  add column if not exists coffee_profile_json jsonb not null default '{}'::jsonb;

-- Extend demo-cafe ingredient library with coffee-specific disclosure chips
update merchants m
set menu_ingredient_presets_json = menu_ingredient_presets_json || '[
  {"id":"whole_milk","label":"Whole milk","group":"Dairy"},
  {"id":"vanilla_syrup","label":"Vanilla syrup","group":"Syrups"},
  {"id":"caramel_syrup","label":"Caramel syrup","group":"Syrups"},
  {"id":"hazelnut_syrup","label":"Hazelnut syrup","group":"Syrups"},
  {"id":"decaf_available","label":"Decaf available","group":"Coffee"},
  {"id":"single_origin","label":"Single origin","group":"Coffee"},
  {"id":"blend","label":"House blend","group":"Coffee"},
  {"id":"arabica","label":"100% Arabica","group":"Coffee"},
  {"id":"geisha","label":"Geisha variety","group":"Coffee"},
  {"id":"bourbon_variety","label":"Bourbon variety","group":"Coffee"}
]'::jsonb
where m.slug = 'demo-cafe'
  and menu_ingredient_presets_json is not null;
