# Security Checklist

## Before pilot

- [x] Points awarded only after payment verified (webhook or manual sheet for pilot)
- [x] Join token single-use, expires in 30 minutes (atomic claim)
- [x] First join bonus once per phone per merchant
- [x] Meta webhook signature validation enabled (`META_APP_SECRET`; `META_SKIP_VERIFY` ignored in production)
- [x] Checkout ignores client `customerId` — member session cookie only
- [x] Browser session bind requires paid order with attached customer (no UUID spoof)
- [x] Soft phone lookup does not create members or award points
- [x] Soft phone lookup alone cannot spend points — WhatsApp OTP redeem-auth required
- [x] Pending checkout reserves redeem points (balance − unpaid `points_redeemed`)
- [x] Points deducted on payment confirm only (ledger idempotent per order)
- [x] `CRON_SECRET` required; default value refused in production
- [x] Session secrets required in production (`MERCHANT_SESSION_SECRET` / `MEMBER_SESSION_SECRET`)

## Before second merchant

- [x] Payment provider HMAC verification implemented (HitPay)
- [x] No points/join logic callable from client for awards
- [x] Redeem points requires verified member session **and** short-lived redeem-auth (WhatsApp OTP)
- [x] STOP opt-out on outbound WhatsApp
- [x] PDPA notice on storefront footer
- [x] Review nudge replies: 5 → Google link, 1–4 → private thank-you + `member_feedback` (Members follow-up)

## Identity

- Primary: `phone` from the Meta webhook `messages[].from` (signed webhook)
- Secondary: `external_user_id` (BSUID) for WhatsApp username rollout
- Soft recognition: existing member phone lookup sets session only — never trust phone alone to create members or spend points
- Redeem: WhatsApp 4-digit OTP → `irewards_redeem_auth` cookie (~30 min)

Never trust phone numbers from URL params or form input alone for awards.

## Roles

Merchant accounts are `owner`, `manager` or `staff`. Access checks used to ask
only "is this your store?", so a counter staff account could change the loyalty
earn rate or mint a 100% discount code.

| Action | Minimum role |
|---|---|
| Store settings (pricing, tax, loyalty rate), reward levels, WhatsApp connection | owner |
| Team management | manager |
| Menu, campaigns, promo codes, stamp program | manager |
| Orders, customers, kitchen, reports — day-to-day work | staff |

Enforced by `verifyMerchantRole` in `src/lib/merchant/access.ts` and covered by
`npm run test:smoke:tenancy` (needs `SMOKE_STAFF_EMAIL` / `SMOKE_STAFF_PASSWORD`).

The local auth bypass is opt-in via `ALLOW_INSECURE_MERCHANT_ACCESS=true`; it
used to switch itself on whenever `MERCHANT_SESSION_SECRET` was unset, which
meant no local test ever exercised authorization.

Fake payments (`PAYMENT_PROVIDER=dev`) accept unsigned webhooks and expose an
unauthenticated "mark this order paid" endpoint. `isDevPaymentMode()` refuses
to enable them when `NODE_ENV=production`, regardless of the variable, so a
stray value cannot cost real revenue.
