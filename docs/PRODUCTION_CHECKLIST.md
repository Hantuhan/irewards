# Production readiness checklist

Last code hardening: Sep 2026 (SaaS multi-tenant + Zeabur Docker + Supabase).

## Code gates (verified locally)

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run test:smoke` (creds via gitignored `.env.smoke` only)
- [x] `npm run test:smoke:campaigns`
- [x] Checkout ignores client `customerId` (session only)
- [x] Member session bind requires paid order + attached customer
- [x] Soft phone lookup (no create / no award)
- [x] Join token claimed atomically
- [x] Meta verify never skipped in production
- [x] Cron refuses missing / default secret in production
- [x] Session secrets required in production
- [x] Review replies 1–5 + `member_feedback` persistence
- [x] SMS create/send paused
- [x] Complex password policy + scrypt cost params + login throttle
- [x] Platform SaaS admin (`/platform`) — requires `PLATFORM_ADMIN_PASSWORD`
- [x] Merchant signup auto-provisions `*.irewards.store` portal
- [x] Multi-staff per cafe (owner/manager/staff)
- [x] Host subdomain rewrite (local `*.localhost`)
- [x] Suspended tenants blocked on login + merchant API access
- [x] Session cookies use `Domain=.irewards.store` in production
- [x] Demo username/password removed from login UI and public docs
- [x] Production `Dockerfile` (Next.js standalone, Zeabur `PORT`)
- [x] Supabase adapter (`adminDb()` + `db:migrate:supabase`)
- [x] `GET /api/health` liveness probe
- [ ] Live Zeabur deploy + Supabase + `irewards.store` DNS
- [ ] Production secrets (Meta/HitPay/cron/platform) in Zeabur Variables

## Ops gates (Zeabur + Supabase)

1. Create Supabase project → `cp .env.zeabur.example .env.zeabur` → `npm run zeabur:setup`
2. Zeabur: connect repo, Dockerfile deploy, paste Variables from `.env.zeabur.example`
3. Set `DATABASE_PROVIDER=supabase`, `NEXT_PUBLIC_APP_URL=https://irewards.store`
4. Domains: `irewards.store` + `*.irewards.store` on the Zeabur service
5. External cron every minute → `POST /api/cron/automation` with `Bearer $CRON_SECRET`
6. Meta + HitPay webhooks pointing at `irewards.store`
7. Persistent volume on `/app/public/uploads` (or object storage) for menu images
8. `NODE_ENV=production DATABASE_PROVIDER=supabase npm run check:production-env`

See [docs/ZEABUR.md](ZEABUR.md) for full steps.

## Explicitly excluded

- Publishing demo login credentials in the product UI
- Cloudflare Workers as primary deploy (optional; `wrangler.jsonc` kept for reference)
