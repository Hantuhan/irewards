#!/usr/bin/env sh
# Prepare Supabase for Zeabur Docker deployment.
#
# Usage:
#   cp .env.zeabur.example .env.zeabur
#   # fill SUPABASE_* and DATABASE_URL
#   source .env.zeabur && npm run zeabur:setup
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

require() {
  eval "val=\${$1-}"
  if [ -z "$val" ]; then
    echo "Missing $1 (set in .env.zeabur)" >&2
    exit 1
  fi
}

require SUPABASE_URL
require SUPABASE_SERVICE_ROLE_KEY
require DATABASE_URL

echo "==> Applying SQL migrations to Supabase"
DATABASE_URL="$DATABASE_URL" sh "$ROOT/scripts/db-migrate-supabase.sh"

echo ""
echo "==> Zeabur deploy checklist"
cat <<'EOF'

1. Push repo to GitHub (or connect repo in Zeabur dashboard).
2. New Project → Deploy service → Dockerfile (auto-detected from repo root).
3. Variables: copy from .env.zeabur.example (use Zeabur secret UI for keys).
4. Domains:
   - irewards.store → platform (login, signup, /platform)
   - *.irewards.store → same service (wildcard DNS to Zeabur)
5. Cron (every minute):
   POST https://irewards.store/api/cron/automation
   Authorization: Bearer $CRON_SECRET
   Use Zeabur Cron, cron-job.org, or Uptime Robot with custom interval.
6. Meta webhook: https://irewards.store/api/webhooks/meta
7. HitPay webhook: https://irewards.store/api/webhooks/payments
8. Health: GET https://irewards.store/api/health
9. DB health: GET https://irewards.store/api/health/db

Uploads (menu images, banners) are stored under public/uploads/.
On Zeabur, attach a persistent volume at /app/public/uploads or migrate to object storage.

EOF

echo "Local prod smoke (optional):"
echo "  docker build -t irewards . && docker run --rm -p 8080:8080 --env-file .env.zeabur -e PORT=8080 irewards"
