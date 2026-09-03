# Deploy on Zeabur (Docker + Supabase)

Production target: **Zeabur** runs the Next.js app from `Dockerfile`; **Supabase** hosts Postgres.

## Architecture

```text
                    ┌─────────────────────────┐
  *.irewards.store  │  Zeabur (Docker)        │
  irewards.store ──▶│  Next.js standalone     │
                    │  PORT from Zeabur env   │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  Supabase Postgres      │
                    │  PostgREST (adminDb)    │
                    └─────────────────────────┘
```

| Layer | Choice |
|-------|--------|
| Compute | Zeabur — `Dockerfile` at repo root |
| Database | Supabase — `DATABASE_PROVIDER=supabase` |
| App queries | `@supabase/supabase-js` via `adminDb()` |
| Migrations | `insforge/migrations/*.sql` → `npm run db:migrate:supabase` |
| Local dev | InsForge Docker (`npm run insforge:setup`) — unchanged |

## One-time setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → API:** `SUPABASE_URL`, **service_role** key.
3. **Settings → Database:** copy the **direct** connection string (port **5432**, not pooler).

```bash
cp .env.zeabur.example .env.zeabur
# edit credentials
source .env.zeabur
npm run zeabur:setup
```

### 2. Zeabur service

1. [Zeabur dashboard](https://zeabur.com) → **New Project** → connect GitHub repo.
2. Zeabur detects `Dockerfile` automatically (`zbpack.json` points at it).
3. **Variables** tab — paste all vars from `.env.zeabur.example` (use secret fields for keys).
4. Set `PORT=8080` (Zeabur default) — the Dockerfile reads `process.env.PORT`.
5. **Networking → Domain:**
   - `irewards.store` (apex)
   - `*.irewards.store` (wildcard for cafe subdomains)

### 3. DNS (Cloudflare or your registrar)

Point to Zeabur-assigned hostname:

| Record | Type | Value |
|--------|------|--------|
| `irewards.store` | CNAME | Zeabur hostname |
| `*.irewards.store` | CNAME | Zeabur hostname |

Middleware rewrites `cafe1.irewards.store` → `/m/cafe1/…` automatically.

### 4. Cron

Zeabur has no built-in cron for all plans — use an external scheduler every **1 minute**:

```bash
curl -X POST "https://irewards.store/api/cron/automation" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Or run `scripts/cron-automation.sh` with `BASE_URL=https://irewards.store`.

### 5. Webhooks

| Service | URL |
|---------|-----|
| Meta WhatsApp | `https://irewards.store/api/webhooks/meta` |
| HitPay | `https://irewards.store/api/webhooks/payments` |

Set `NEXT_PUBLIC_APP_URL=https://irewards.store` before going live.

## Docker image

Built from multi-stage `Dockerfile` (Node 22 Alpine, Next.js `standalone` output):

```bash
docker build -t irewards .
docker run --rm -p 8080:8080 --env-file .env.zeabur -e PORT=8080 irewards
```

Health checks:

- `GET /api/health` — liveness
- `GET /api/health/db` — Postgres connectivity

## Uploads (menu photos, banners)

Files are written to `public/uploads/` on disk. Zeabur containers are **ephemeral** — attach a **persistent volume** at `/app/public/uploads` in the Zeabur Docker settings, or migrate to S3/R2/Supabase Storage later.

## Environment variables

See `.env.zeabur.example`. Production check:

```bash
NODE_ENV=production DATABASE_PROVIDER=supabase sh scripts/check-production-env.sh
```

## Local vs production

| | Local | Zeabur production |
|---|--------|-------------------|
| Database | InsForge (`npm run insforge:up`) | Supabase |
| `DATABASE_PROVIDER` | unset or `insforge` | `supabase` |
| App URL | `http://localhost:3002` | `https://irewards.store` |
| Payments | `PAYMENT_PROVIDER=dev` | `hitpay` |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run zeabur:setup` | Migrate Supabase + print deploy checklist |
| `npm run docker:prod` | Local production image test |
| `npm run db:migrate:supabase` | Migrations only |

## Optional: Cloudflare Workers

OpenNext / `wrangler.jsonc` remain in the repo for a future Workers path but are **not** the primary deployment. Use Zeabur Docker + Supabase for production.
