-- Multilingual tier names and perk descriptions for iRewards program

alter table reward_levels
  add column if not exists name_i18n jsonb not null default '{}'::jsonb,
  add column if not exists perk_description_i18n jsonb not null default '{}'::jsonb;

-- Seed demo-cafe translations from existing English names
update reward_levels rl
set
  name_i18n = case rl.level_number
    when 1 then '{"en":"Starter","zh":"入门","ms":"Permulaan"}'::jsonb
    when 2 then '{"en":"Bronze","zh":"青铜","ms":"Gangsa"}'::jsonb
    when 3 then '{"en":"Silver","zh":"白银","ms":"Perak"}'::jsonb
    when 4 then '{"en":"Gold","zh":"黄金","ms":"Emas"}'::jsonb
    when 5 then '{"en":"Platinum","zh":"铂金","ms":"Platinum"}'::jsonb
    else name_i18n
  end,
  perk_description_i18n = case rl.level_number
    when 1 then '{"en":"Welcome to iRewards","zh":"欢迎加入 iRewards","ms":"Selamat datang ke iRewards"}'::jsonb
    when 2 then '{"en":"Free topping upgrade","zh":"免费加料升级","ms":"Naik taraf topping percuma"}'::jsonb
    when 3 then '{"en":"Birthday drink","zh":"生日饮品","ms":"Minuman hari jadi"}'::jsonb
    when 4 then '{"en":"Priority queue","zh":"优先排队","ms":"Barisan keutamaan"}'::jsonb
    when 5 then '{"en":"Exclusive seasonal menu","zh":"专属季节菜单","ms":"Menu musim eksklusif"}'::jsonb
    else perk_description_i18n
  end
from merchants m
where rl.merchant_id = m.id and m.slug = 'demo-cafe';

notify pgrst, 'reload schema';
