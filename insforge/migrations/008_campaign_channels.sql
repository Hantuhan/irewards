-- Campaign delivery channels: storefront banner, WhatsApp, SMS

alter table campaigns
  add column if not exists message_body text,
  add column if not exists banner_title text,
  add column if not exists banner_text text,
  add column if not exists link_url text;

alter table campaigns drop constraint if exists campaigns_channel_check;
alter table campaigns add constraint campaigns_channel_check
  check (channel in ('banner', 'whatsapp', 'sms', 'auto'));

-- Demo storefront banner
insert into campaigns (merchant_id, name, channel, status, banner_title, banner_text, link_url)
select m.id,
  'Weekend special banner',
  'banner',
  'active',
  '20% off weekend lattes',
  'Order any oat milk latte this Sat–Sun and save. Tap rewards after pay to join.',
  null
from merchants m
where m.slug = 'demo-cafe'
  and not exists (
    select 1 from campaigns c
    where c.merchant_id = m.id and c.channel = 'banner'
  );

notify pgrst, 'reload schema';
