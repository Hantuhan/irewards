# Production readiness checklist

Last code hardening: Sep 2026 (security + recognition + review replies).

## Code gates (verified locally)

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run test:smoke`
- [x] `npm run test:smoke:campaigns`
- [x] Checkout ignores client `customerId` (session only)
- [x] Member session bind requires paid order + attached customer
- [x] Soft phone lookup (no create / no award)
- [x] Join token claimed atomically
- [x] Meta verify never skipped in production
- [x] Cron refuses missing / default secret in production
- [x] Session secrets required in production
- [x] Review replies 1–5 handled on Meta webhook
- [x] SMS create/send paused
- [x] Win-back template default = 7 days (product plan)

## Ops gates (you must do before unattended pilot)

1. Set real secrets in production env:
   - `MERCHANT_SESSION_SECRET`, `MEMBER_SESSION_SECRET`, `CRON_SECRET` (unique, not `irewards-dev-cron`)
   - `META_*` tokens; **unset** `META_SKIP_VERIFY` and `WHATSAPP_SKIP_SEND`
   - `PAYMENT_PROVIDER=hitpay` + `PAYMENT_API_KEY` + `PAYMENT_SALT` + `PAYMENT_WEBHOOK_SECRET`
2. Point Meta webhook to `/api/webhooks/meta` with verify token
3. Point HitPay webhook to `/api/webhooks/payments`
4. Schedule cron `POST /api/cron/automation` with `Authorization: Bearer $CRON_SECRET` every minute
5. In Campaigns UI: submit WhatsApp templates to Meta → wait for approval → activate bounce-back / review / win-back
6. Set merchant `google_url` for review rating = 5
7. Confirm `retention_enabled` is on for the pilot cafe
8. Run migrations on the production InsForge DB (`npm run db:migrate` against that instance)

## Out of scope for this pass

- OTP for phone lookup (lookup is soft recognition for existing members only)
- Dedicated complaints inbox UI (complaints are logged server-side today)
- Multi-merchant onboarding wizard
