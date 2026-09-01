# iRewards InsForge (self-hosted)

Dedicated InsForge stack for this repo only. Uses ports **7230+** so it does not conflict with other local InsForge installs (e.g. RiceBowl on 7130).

| Service   | URL / port              |
|-----------|-------------------------|
| Dashboard | http://localhost:7230   |
| Auth      | http://localhost:7231   |
| PostgREST | http://localhost:5440   |
| Postgres  | localhost:55532         |

## First-time setup

From the repo root:

```bash
npm run insforge:setup
```

This will:

1. Download InsForge into `infra/insforge/`
2. Generate secrets in `infra/insforge/.env` (gitignored)
3. Start Docker containers (`irewards-insforge-*`)
4. Sync API keys into `.env.local`
5. Apply `insforge/migrations/*.sql`

## Day-to-day

```bash
npm run insforge:up      # start InsForge
npm run insforge:down    # stop InsForge
npm run db:migrate       # re-apply SQL migrations
npm run dev              # start Next.js on :3002
```

Admin login: user `admin`, password in `infra/insforge/.env` (`ROOT_ADMIN_PASSWORD`).

When the app runs **inside Docker** but InsForge runs on the host, set in `.env.local`:

```bash
INSFORGE_URL=http://host.docker.internal:7230
```

## Files

- `infra/insforge/.env` — InsForge secrets (never commit)
- `insforge/migrations/` — iRewards schema + demo seed
- `scripts/insforge-bootstrap.sh` — first-time installer
- `scripts/insforge-sync-env.sh` — copy keys → `.env.local`
- `scripts/db-migrate.sh` — apply migrations via `psql`
