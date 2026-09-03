# Deploy on Zeabur (Docker + InsForge)

Production: **Zeabur** runs Docker containers; **InsForge** provides Postgres + PostgREST; **iRewards** is the Next.js app.

## Architecture

```text
  irewards.store
        │
        ▼
┌───────────────────┐     ┌─────────────────────────────┐
│  irewards (Git)   │────▶│  insforge :7130             │
│  Dockerfile       │     │  postgrest + postgres       │
│  PORT=8080        │     │  (internal Zeabur network)  │
└───────────────────┘     └─────────────────────────────┘
```

| Layer | Service |
|-------|---------|
| App | `irewards` — root `Dockerfile`, Next.js standalone |
| API/DB | `insforge` + `postgrest` + `postgres` (InsForge images) |
| Local dev | `npm run insforge:up` + `npm run dev` (unchanged) |

## Quick deploy (full stack)

```bash
npm run zeabur:setup   # prints checklist

# Deploy postgres + postgrest + insforge + app from template:
npm run zeabur:template:deploy
```

You will be prompted for:

- **PUBLIC_DOMAIN** — e.g. `irewards.store`
- **JWT_SECRET** — shared InsForge secret (32+ chars)
- **POSTGRES_PASSWORD**
- **INSFORGE_API_KEY** / **INSFORGE_ANON_KEY** — use the same values on both `insforge` and `irewards` services

After deploy, open the **irewards** service → **Variables** and add Meta, HitPay, cron, and platform secrets from `.env.zeabur.example`.

## App-only deploy (InsForge already on Zeabur)

1. Zeabur → **Add Service** → **GitHub** → `Hantuhan/irewards`
2. `Dockerfile` is auto-detected
3. Set `PORT=8080`, `DATABASE_PROVIDER=insforge`
4. `INSFORGE_URL=http://<insforge-internal-host>:7130`
5. Copy keys from InsForge service → `INSFORGE_API_KEY`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`
6. `INSFORGE_DATABASE_URL=postgresql://postgres:PASSWORD@<postgres-host>:5432/irewards`

## Migrations

SQL in `insforge/migrations/` runs automatically when the app container starts (`RUN_MIGRATIONS=true`).

Manual:

```bash
INSFORGE_DATABASE_URL='postgresql://...' npm run db:migrate:remote
```

## Local production Docker test

```bash
npm run insforge:up
npm run insforge:sync-env
cp .env.zeabur.example .env.zeabur
# set INSFORGE_URL=http://host.docker.internal:7230 + keys from .env.local
docker compose up --build
```

## Uploads

Menu/banner images → `public/uploads/`. Attach a Zeabur volume at `/app/public/uploads` on the **irewards** service.

## WhatsApp

Merchants connect their own WhatsApp Business Account via Embedded Signup, so
the service needs the **app**-level secrets rather than a platform WABA:
`META_APP_ID`, `META_APP_SECRET`, `META_EMBEDDED_SIGNUP_CONFIG_ID`,
`META_WEBHOOK_VERIFY_TOKEN`, and `WHATSAPP_TOKEN_KEY` (encrypts stored merchant
tokens — rotating it forces every merchant to reconnect).

`META_ACCESS_TOKEN` / `META_WABA_ID` / `META_PHONE_NUMBER_ID` are optional and
only act as a fallback for a pilot merchant sending from the platform number.

## Cron & webhooks

The automation cron is **required**, not optional. Nothing inside the app
schedules it, so without this caller every campaign sits at *Active* and sends
nothing. Point a Zeabur cron (or any external scheduler) at it every minute.
Each completed run stamps `system_heartbeats`; the Campaigns overview shows a
red alarm if automation has never run or has been quiet for 30 minutes, so a
missing scheduler is visible rather than silent.

| Job | URL |
|-----|-----|
| Automation (every minute) | `POST https://irewards.store/api/cron/automation` + `Bearer $CRON_SECRET` |
| Meta | `https://irewards.store/api/webhooks/meta` |
| HitPay | `https://irewards.store/api/webhooks/payments` |

## Optional: Supabase

`DATABASE_PROVIDER=supabase` still works if you prefer hosted Postgres — not required for Zeabur + InsForge.
