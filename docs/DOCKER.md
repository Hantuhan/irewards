# Docker + InsForge Setup

iRewards ships its **own** InsForge stack under `infra/insforge/`. It does not share a database with other projects on your machine.

## Architecture

```text
┌─────────────────┐     ┌──────────────────────────────┐
│  iRewards app   │────▶│  iRewards InsForge (:7230)   │
│  Next.js :3002  │     │  Postgres + API              │
└─────────────────┘     └──────────────────────────────┘
         │
         ▼
   Meta WhatsApp / HitPay webhooks
```

## Quick start (recommended)

```bash
npm install
npm run insforge:setup   # first time only
npm run dev
```

- App: http://localhost:3002
- Demo table: http://localhost:3002/m/demo-cafe/table/1
- InsForge dashboard: http://localhost:7230

`insforge:setup` downloads InsForge, starts Docker, syncs API keys into `.env.local`, and applies migrations.

## InsForge commands

| Command | Description |
|---------|-------------|
| `npm run insforge:setup` | First-time install + start + migrate |
| `npm run insforge:up` | Start InsForge containers |
| `npm run insforge:down` | Stop InsForge containers |
| `npm run insforge:sync-env` | Copy keys from `infra/insforge/.env` → `.env.local` |
| `npm run db:migrate` | Apply `insforge/migrations/*.sql` |

Ports are chosen to avoid clashing with other local InsForge (e.g. 7130):

| Service | Port |
|---------|------|
| InsForge dashboard | 7230 |
| Auth | 7231 |
| PostgREST | 5440 |
| Postgres | 55532 |

See [infra/insforge/README.md](../infra/insforge/README.md) for more detail.

## iRewards Docker commands

| Command | Description |
|---------|-------------|
| `npm run docker:dev` | Dev container with hot reload |
| `npm run docker:prod` | Production Next.js image |

When the app runs in Docker and InsForge runs on the host:

```bash
INSFORGE_URL=http://host.docker.internal:7230
```

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_INSFORGE_URL` | Browser + server | InsForge API URL (`http://localhost:7230`) |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Browser + public reads | From `infra/insforge/.env` |
| `INSFORGE_API_KEY` | Server only | Admin writes (webhooks) |
| `INSFORGE_URL` | Server in Docker | Reach host InsForge from container |

## InsForge Cloud (optional)

You can use [insforge.dev](https://insforge.dev) instead of the local stack:

```bash
npx @insforge/cli login
npx @insforge/cli link --project-id <id>
```

Set cloud URL and keys in `.env.local`, then run SQL from `insforge/migrations/` in the dashboard SQL editor.

## Migrations

SQL files live in `insforge/migrations/`. For the local stack:

```bash
npm run db:migrate
```
