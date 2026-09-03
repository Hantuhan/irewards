# Security Checklist

## Before pilot

- [x] Points awarded only after payment verified (webhook or manual sheet for pilot)
- [x] Join token single-use, expires in 30 minutes (atomic claim)
- [x] First join bonus once per phone per merchant
- [x] Meta webhook signature validation enabled (`META_APP_SECRET`; `META_SKIP_VERIFY` ignored in production)
- [x] Checkout ignores client `customerId` — member session cookie only
- [x] Browser session bind requires paid order with attached customer (no UUID spoof)
- [x] Soft phone lookup does not create members or award points
- [x] `CRON_SECRET` required; default value refused in production
- [x] Session secrets required in production (`MERCHANT_SESSION_SECRET` / `MEMBER_SESSION_SECRET`)

## Before second merchant

- [x] Payment provider HMAC verification implemented (HitPay)
- [x] No points/join logic callable from client for awards
- [x] Redeem points requires verified member session
- [x] STOP opt-out on outbound WhatsApp
- [x] PDPA notice on storefront footer
- [x] Review nudge replies: 5 → Google link, 1–4 → private thank-you + `member_feedback` (Members follow-up)

## Identity

- Primary: `phone` from the Meta webhook `messages[].from` (signed webhook)
- Secondary: `external_user_id` (BSUID) for WhatsApp username rollout
- Soft recognition: existing member phone lookup sets session only — never trust phone alone to create members

Never trust phone numbers from URL params or form input alone for awards.
