#!/usr/bin/env sh
# Apply insforge/migrations/*.sql to any Postgres (local InsForge or Supabase direct URL).
# Usage:
#   DATABASE_URL='postgresql://…@db.xxx.supabase.co:5432/postgres' npm run db:migrate:supabase
# Prefer Supabase *direct* connection (port 5432), not the pooler, when used with Hyperdrive.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/insforge/migrations"

if [ -z "${DATABASE_URL:-}" ] && [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Set DATABASE_URL or SUPABASE_DB_URL to the target Postgres connection string." >&2
  exit 1
fi

URL="${DATABASE_URL:-$SUPABASE_DB_URL}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required on PATH for remote migrations." >&2
  exit 1
fi

export PGPASSWORD
# psql accepts connection URI via -d
psql "$URL" -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
SQL

for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$file" ] || continue
  filename="$(basename "$file")"
  applied="$(psql "$URL" -tAc "select 1 from schema_migrations where filename = '$filename'")"
  if [ "$applied" = "1" ]; then
    echo "Skipping $filename (already applied)"
    continue
  fi
  echo "Applying $filename ..."
  # Strip InsForge-only NOTIFY noise if Supabase rejects it — still harmless on Postgres.
  psql "$URL" -v ON_ERROR_STOP=1 -f "$file"
  psql "$URL" -c "insert into schema_migrations (filename) values ('$filename')"
done

echo "Remote migrations applied."
