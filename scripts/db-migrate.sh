#!/usr/bin/env sh
# Apply insforge/migrations/*.sql to the local iRewards InsForge Postgres.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IF_DIR="$ROOT/infra/insforge"
MIGRATIONS_DIR="$ROOT/insforge/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "No migrations at $MIGRATIONS_DIR" >&2
  exit 1
fi

cd "$IF_DIR"
if ! docker compose ps postgres 2>/dev/null | grep -qE 'Up|running'; then
  echo "iRewards InsForge is not running. Run: npm run insforge:up" >&2
  exit 1
fi

docker compose exec -T postgres psql -U postgres -d irewards -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
SQL

for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$file" ] || continue
  filename="$(basename "$file")"
  applied="$(docker compose exec -T postgres psql -U postgres -d irewards -tAc "select 1 from schema_migrations where filename = '$filename'")"
  if [ "$applied" = "1" ]; then
    echo "Skipping $filename (already applied)"
    continue
  fi
  echo "Applying $filename ..."
  docker compose exec -T postgres psql -U postgres -d irewards -v ON_ERROR_STOP=1 < "$file"
  docker compose exec -T postgres psql -U postgres -d irewards -c "insert into schema_migrations (filename) values ('$filename')"
done

docker compose exec -T postgres psql -U postgres -d irewards -c "NOTIFY pgrst, 'reload schema';" >/dev/null 2>&1 || true

# PostgREST caches column metadata; restart after DDL so new columns are visible immediately.
if docker compose ps postgrest 2>/dev/null | grep -qE 'Up|running'; then
  docker compose restart postgrest >/dev/null 2>&1 || true
fi

echo "Migrations applied."
