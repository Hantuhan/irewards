-- Enable takeaway packaging charge by default on menu items.

alter table menu_items
  alter column takeaway_charge_enabled set default true;

-- Backfill existing items that never had takeaway configured.
update menu_items
set
  takeaway_charge_enabled = true,
  takeaway_surcharge_type = coalesce(takeaway_surcharge_type, 'fixed'),
  takeaway_surcharge_value = coalesce(nullif(takeaway_surcharge_value, 0), 100),
  takeaway_surcharge_priority = coalesce(takeaway_surcharge_priority, 10)
where takeaway_charge_enabled = false
   or takeaway_surcharge_type is null
   or takeaway_surcharge_value is null;

notify pgrst, 'reload schema';
