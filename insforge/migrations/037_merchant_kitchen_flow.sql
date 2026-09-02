alter table merchants
  add column if not exists kitchen_flow_json jsonb;

alter table orders drop constraint if exists orders_kitchen_status_check;
