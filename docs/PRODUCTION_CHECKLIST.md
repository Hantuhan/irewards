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
3. Add Meta/HitPay/cron/platform secrets on **irewards** service (`.env.zeabur.example`)
4. Domain: `irewards.store` + `*.irewards.store`
5. Volume: `/app/public/uploads` on irewards service
6. External cron → `POST /api/cron/automation`
7. `NODE_ENV=production npm run check:production-env`

See [docs/ZEABUR.md](ZEABUR.md).
