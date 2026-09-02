-- Append standard F&B disclosure chips (spicy, fish bone, allergens) to merchant libraries

update merchants
set menu_ingredient_presets_json = menu_ingredient_presets_json || '[
  {"id":"contains_egg","label":"Contains egg","group":"Allergens"},
  {"id":"contains_shellfish","label":"Contains shellfish","group":"Allergens"},
  {"id":"contains_pork","label":"Contains pork","group":"Warnings"},
  {"id":"contains_fish_bone","label":"Got fish bone","group":"Warnings"},
  {"id":"halal","label":"Halal","group":"Dietary"},
  {"id":"spicy","label":"Spicy","group":"Spice level"},
  {"id":"spicy_mild","label":"Mild spicy","group":"Spice level"},
  {"id":"spicy_medium","label":"Medium spicy","group":"Spice level"},
  {"id":"spicy_hot","label":"Extra spicy","group":"Spice level"}
]'::jsonb
where menu_ingredient_presets_json is not null;

notify pgrst, 'reload schema';
