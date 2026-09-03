#!/usr/bin/env sh
# Bootstrap Supabase + Cloudflare Hyperdrive for iRewards.
#
# Prerequisites:
#   - Supabase project created (https://supabase.com/dashboard)
#   - wrangler logged in: npx wrangler login
#   - psql on PATH (for migrations)
#
# Usage:
#   SUPABASE_DB_URL='postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres' \
#   SUPABASE_URL='https://PROJECT.supabase.co' \
#   SUPABASE_SERVICE_ROLE_KEY='eyJ...' \
#   sh scripts/cf-supabase-setup.sh
#
# Or copy .env.supabase.example → .env.supabase and: source .env.supabase && sh scripts/cf-supabase-setup.sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

require() {
  eval "val=\${$1-}"
  if [ -z "$val" ]; then
    echo "Missing $1" >&2
    exit 1
  fi
}

require SUPABASE_DB_URL
require SUPABASE_URL
require SUPABASE_SERVICE_ROLE_KEY

echo "==> 1/4 Apply SQL migrations to Supabase (direct :5432)"
DATABASE_URL="$SUPABASE_DB_URL" sh "$ROOT/scripts/db-migrate-supabase.sh"

echo ""
echo "==> 2/4 Create or reuse Hyperdrive config"
EXISTING="$(npx wrangler hyperdrive list 2>/dev/null | grep -E 'irewards-supabase' || true)"
if [ -n "$EXISTING" ]; then
  echo "Hyperdrive 'irewards-supabase' may already exist. List:"
  npx wrangler hyperdrive list
  echo ""
  echo "To create a new one manually:"
  echo "  npx wrangler hyperdrive create irewards-supabase --connection-string=\"\$SUPABASE_DB_URL\""
else
  npx wrangler hyperdrive create irewards-supabase \
    --connection-string="$SUPABASE_DB_URL"
fi

echo ""
echo "==> 3/4 Paste Hyperdrive id into wrangler.jsonc"
echo "    Uncomment the hyperdrive block and set id from: npx wrangler hyperdrive list"
echo ""

echo "==> 4/4 Set Cloudflare Worker secrets (run these manually):"
cat <<EOF

  npx wrangler secret put DATABASE_PROVIDER
  # value: supabase

  npx wrangler secret put SUPABASE_URL
  # value: $SUPABASE_URL

  npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  # value: (your service role key — never commit)

  npx wrangler secret put MERCHANT_SESSION_SECRET
  npx wrangler secret put MEMBER_SESSION_SECRET
  npx wrangler secret put CRON_SECRET
  npx wrangler secret put PLATFORM_ADMIN_PASSWORD
  npx wrangler secret put PLATFORM_SESSION_SECRET
  # Meta, HitPay, etc. — see docs/PRODUCTION_CHECKLIST.md

  # Do NOT upload DEEPSEEK_API_KEY unless you explicitly want AI on Workers.

EOF

echo "Local Supabase mode: add to .env.local"
cat <<EOF

  DATABASE_PROVIDER=supabase
  SUPABASE_URL=$SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY=<same as above>
  DATABASE_URL=$SUPABASE_DB_URL
  DATABASE_SSL=true

EOF

echo "Deploy: npm run cf:deploy"
echo "Health: curl https://irewards.store/api/health/db"
