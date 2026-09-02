-- Menu category + item translations for storefront languages (en / zh / ms)

alter table menu_categories
  add column if not exists label_i18n jsonb not null default '{}'::jsonb;

alter table menu_items
  add column if not exists name_i18n jsonb not null default '{}'::jsonb,
  add column if not exists description_i18n jsonb not null default '{}'::jsonb;

-- Sync canonical English columns into i18n maps
update menu_categories
set label_i18n = label_i18n || jsonb_build_object('en', label)
where label is not null and (label_i18n = '{}'::jsonb or not label_i18n ? 'en');

update menu_items
set
  name_i18n = name_i18n || jsonb_build_object('en', name),
  description_i18n = case
    when description is not null and description <> ''
      then description_i18n || jsonb_build_object('en', description)
    else description_i18n
  end
where name is not null and (name_i18n = '{}'::jsonb or not name_i18n ? 'en');

-- Demo cafe Chinese translations for local testing
update menu_categories c
set label_i18n = label_i18n || '{"zh":"咖啡","ms":"Kopi"}'::jsonb
from merchants m
where c.merchant_id = m.id and m.slug = 'demo-cafe' and c.slug = 'coffee';

update menu_categories c
set label_i18n = label_i18n || '{"zh":"糕点","ms":"Pastri"}'::jsonb
from merchants m
where c.merchant_id = m.id and m.slug = 'demo-cafe' and c.slug = 'pastries';

update menu_categories c
set label_i18n = label_i18n || '{"zh":"主食","ms":"Hidangan utama"}'::jsonb
from merchants m
where c.merchant_id = m.id and m.slug = 'demo-cafe' and c.slug = 'mains';

update menu_items mi
set
  name_i18n = name_i18n || '{"zh":"燕麦拿铁","ms":"Latte susu oat"}'::jsonb,
  description_i18n = description_i18n || '{"zh":"冰饮，少甜。顺滑燕麦奶配双份浓缩。","ms":"Ais, kurang manis. Susu oat lembut dengan espresso berganda."}'::jsonb
from merchants m
where mi.merchant_id = m.id and m.slug = 'demo-cafe' and mi.slug = 'latte';

update menu_items mi
set
  name_i18n = name_i18n || '{"zh":"手冲咖啡","ms":"Pour over"}'::jsonb,
  description_i18n = description_i18n || '{"zh":"埃塞俄比亚耶加雪菲单品。花香，明亮酸度。","ms":"Asal tunggal Ethiopia Yirgacheffe. Floral, asiditi cerah."}'::jsonb
from merchants m
where mi.merchant_id = m.id and m.slug = 'demo-cafe' and mi.slug = 'pour-over';

update menu_items mi
set
  name_i18n = name_i18n || '{"zh":"抹茶浓缩","ms":"Matcha espresso"}'::jsonb,
  description_i18n = description_i18n || '{"zh":"仪式级抹茶配浓缩咖啡和牛奶。","ms":"Matcha gred upacara dengan espresso dan susu."}'::jsonb
from merchants m
where mi.merchant_id = m.id and m.slug = 'demo-cafe' and mi.slug = 'matcha';

update menu_items mi
set
  name_i18n = name_i18n || '{"zh":"黄油可颂","ms":"Croissant butter"}'::jsonb,
  description_i18n = description_i18n || '{"zh":"每日新鲜烘烤，层层酥脆黄油香。","ms":"Lapisan renyah, dibakar segar setiap pagi."}'::jsonb
from merchants m
where mi.merchant_id = m.id and m.slug = 'demo-cafe' and mi.slug = 'croissant';

update menu_items mi
set
  name_i18n = name_i18n || '{"zh":"巧克力酥","ms":"Pain au chocolat"}'::jsonb,
  description_i18n = description_i18n || '{"zh":"千层酥皮包裹黑巧克力条。","ms":"Coklat gelap dalam pastri laminasi."}'::jsonb
from merchants m
where mi.merchant_id = m.id and m.slug = 'demo-cafe' and mi.slug = 'pain-au-chocolat';

update menu_items mi
set
  name_i18n = name_i18n || '{"zh":"俱乐部三明治","ms":"Sandwic kelab"}'::jsonb,
  description_i18n = description_i18n || '{"zh":"烤鸡、鸡蛋、生菜、自制蛋黄酱，酸种面包。","ms":"Ayam panggang, telur, salad, mayo rumah pada sourdough."}'::jsonb
from merchants m
where mi.merchant_id = m.id and m.slug = 'demo-cafe' and mi.slug = 'sandwich';
