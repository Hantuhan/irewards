# Production readiness checklist

Last updated: Sep 2026 (Zeabur Docker + InsForge stack).

## Code gates

- [x] `npm run typecheck` / `npm run lint` / smoke tests
- [x] Production `Dockerfile` + entrypoint (wait InsForge, migrate, start)
- [x] `zeabur-template.yaml` — postgres + postgrest + insforge + irewards
- [x] `DATABASE_PROVIDER=insforge` default for Zeabur
- [x] SaaS multi-tenant (`*.irewards.store`)

## Ops gates (Zeabur + InsForge)

1. `npm run zeabur:template:deploy` or GitHub → Dockerfile on Zeabur
2. Set template variables: `JWT_SECRET`, `POSTGRES_PASSWORD`, InsForge keys
3. Add Meta/CHIP/cron/platform secrets on **irewards** service (`.env.zeabur.example`)
4. Domain: `irewards.store` + `*.irewards.store`
5. Volume: `/app/public/uploads` on irewards service
6. External cron → `POST /api/cron/automation`
7. `NODE_ENV=production npm run check:production-env`

See [docs/ZEABUR.md](ZEABUR.md).

## WhatsApp

Merchants connect their own WhatsApp Business Account in Settings → WhatsApp.
That button only works once the Meta app is set up — `META_APP_ID`,
`META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_EMBEDDED_SIGNUP_CONFIG_ID`
and `WHATSAPP_TOKEN_KEY`, all enforced by `check:production-env`.

The shared platform number is off unless `WHATSAPP_ALLOW_PLATFORM_FALLBACK=true`;
leave it off so a merchant who has not connected is asked to, rather than
quietly sending on a reputation shared with everyone else.

Full walkthrough, including Meta's Tech Provider and business verification
steps: [docs/WHATSAPP_SETUP.md](WHATSAPP_SETUP.md).

## Payments

Default provider is **CHIP Collect** (`PAYMENT_PROVIDER=chip`), which needs
`PAYMENT_API_KEY` and `CHIP_BRAND_ID`. HitPay stays supported behind the same
interface for SGD merchants and for anyone whose average ticket is large enough
that its flat RM1 card fee stops mattering.

Switching provider is one variable, but two things must be true first:

- **Run migration 063.** Orders record which gateway charged them, and refunds
  are sent back to that gateway rather than to whichever is configured now.
  Without the column, a refund on a pre-switch order goes to the wrong API.
- **Point the new provider's callback at the same URL.**
  `https://irewards.store/api/webhooks/payments` handles every provider; it
  routes on the signature header and verifies against that provider's key.
  Leave the old provider's webhook enabled until its last order is settled.
