-- Enable default service charge + SST for demo cafe (Malaysia dine-in)

update merchants
set
  service_charge_enabled = true,
  service_charge_percent = 10,
  sst_enabled = true,
  sst_rate_percent = 6
where slug = 'demo-cafe';

notify pgrst, 'reload schema';
