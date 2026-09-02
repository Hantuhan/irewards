-- Storefront banner hero image (cropped to fixed aspect ratio in dashboard)
alter table campaigns
  add column if not exists banner_image_url text;
