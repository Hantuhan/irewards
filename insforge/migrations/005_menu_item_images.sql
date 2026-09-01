-- Menu item product photos (merchant-uploaded)

alter table menu_items
  add column if not exists image_url text;
