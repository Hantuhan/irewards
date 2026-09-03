#!/usr/bin/env sh
# Apply insforge/migrations/*.sql to any Postgres (InsForge on Zeabur, Supabase, etc.).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/insforge/migrations"

URL="${DATABASE_URL:-${INSFORGE_DATABASE_URL:-${SUPABASE_DB_URL:-}}}"
if [ -z "$URL" ]; then
  echo "Set DATABASE_URL or INSFORGE_DATABASE_URL for remote migrations." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required on PATH for remote migrations." >&2
  exit 1
fi

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
  psql "$URL" -v ON_ERROR_STOP=1 -f "$file"
  psql "$URL" -c "insert into schema_migrations (filename) values ('$filename')"
done

psql "$URL" -c "NOTIFY pgrst, 'reload schema';" >/dev/null 2>&1 || true
echo "Remote migrations applied."
