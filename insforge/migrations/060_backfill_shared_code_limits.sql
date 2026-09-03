-- Widen the voucher backfill to every shareable code.
--
-- 058 capped campaign vouchers with `where campaign_id is not null`, which was
-- too narrow twice over:
--
--   * `promos.campaign_id` is ON DELETE SET NULL, so deleting a campaign
--     orphans its voucher. The code is still sitting in members' WhatsApp
--     history, but the row no longer looks like a campaign voucher and 058
--     skipped it.
--   * Hand-made codes (a "Welcome 10% off" with no expiry) were never capped
--     at all, and a code is a code: once it is shared, one screenshot in a
--     group chat is unlimited free discount.
--
-- Anything with a `code` is shareable, so it gets one use per member. The
-- total stays uncapped — this stops a single person farming a code, it does
-- not stop the promotion from running. Merchants can raise or clear either
-- limit in Campaigns → Vouchers.

update promos
set per_customer_limit = 1
where code is not null
  and per_customer_limit is null;

notify pgrst, 'reload schema';
