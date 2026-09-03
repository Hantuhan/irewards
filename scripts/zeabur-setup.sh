#!/usr/bin/env sh
# Zeabur + InsForge deploy checklist.
set -eu

cat <<'EOF'
iRewards on Zeabur (Docker + InsForge)

Option A — Full stack template (recommended)
  1. Generate secrets (32+ chars each): JWT_SECRET, POSTGRES_PASSWORD, INSFORGE_API_KEY, INSFORGE_ANON_KEY
  2. Deploy template:
       npx zeabur template deploy -f zeabur-template.yaml
  3. Set domain variable PUBLIC_DOMAIN → irewards.store
  4. On irewards service, add Meta/HitPay/cron/platform secrets (see .env.zeabur.example)

Option B — App only (InsForge already running)
  1. Zeabur → Add Service → GitHub → Hantuhan/irewards
  2. Dockerfile auto-detected; set PORT=8080
  3. Variables from .env.zeabur.example
  4. INSFORGE_URL = internal Zeabur hostname (e.g. http://insforge.xxx:7130)

Local prod test (InsForge on host):
  npm run insforge:up
  cp .env.zeabur.example .env.zeabur
  # set INSFORGE_URL=http://host.docker.internal:7230 + keys from npm run insforge:sync-env
  docker compose -f docker-compose.yml up --build

Migrations run on app container start (RUN_MIGRATIONS=true).
Uploads: attach volume /app/public/uploads on irewards service.

EOF
