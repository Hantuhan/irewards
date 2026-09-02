-- Merchant-customizable product badges (Chef Recommended, etc.)

alter table merchants
  add column if not exists menu_badges_json jsonb;

update merchants
set menu_badges_json = '[
  {"id":"chef_recommended","label":"Chef Recommended","icon":"restaurant"},
  {"id":"best_selling","label":"Best Selling","icon":"trending_up"},
  {"id":"limited_time_offer","label":"Limited Time Offer","icon":"schedule"}
]'::jsonb
where menu_badges_json is null;
