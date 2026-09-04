#!/usr/bin/env sh
# Rebuild the demo-cafe tenant as a believable cafe.
#
# Local by default (the InsForge Postgres from `npm run insforge:up`). Set
# DATABASE_URL to point it at a deployed database instead.
#
# Destructive, but only ever to demo-cafe: it clears that tenant's orders,
# customers and campaigns before rebuilding them. Never touches another
# merchant, and refuses outright if demo-cafe does not exist.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$(node "$ROOT/scripts/demo-seed.mjs")"

URL="${DATABASE_URL:-${INSFORGE_DATABASE_URL:-}}"
if [ -n "$URL" ]; then
  command -v psql >/dev/null 2>&1 || { echo "psql is required on PATH." >&2; exit 1; }
  printf '%s' "$SQL" | psql "$URL" -v ON_ERROR_STOP=1 -q
else
  cd "$ROOT/infra/insforge"
  if ! docker compose ps postgres 2>/dev/null | grep -qE 'Up|running'; then
    echo "iRewards InsForge is not running. Run: npm run insforge:up" >&2
    exit 1
  fi
  printf '%s' "$SQL" | docker compose exec -T postgres psql -U postgres -d irewards -v ON_ERROR_STOP=1 -q
fi

echo "demo-cafe reseeded."
