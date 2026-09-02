#!/usr/bin/env sh
# Bootstrap a dedicated InsForge stack for iRewards under infra/insforge.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IF_DIR="$ROOT/infra/insforge"

set_var() {
  key="$1"
  val="$2"
  file="$3"
  tmp="$(mktemp)"
  awk -v key="$key" -v val="$val" '
    $0 ~ "^" key "=" { print key "=" val; found=1; next }
    { print }
    END { if (!found) print key "=" val }
  ' "$file" > "$tmp" && mv "$tmp" "$file"
}

if [ ! -f "$IF_DIR/deploy/docker-compose/docker-compose.yml" ]; then
  echo "Fetching InsForge into $IF_DIR ..."
  mkdir -p "$IF_DIR"
  INSFORGE_NO_GIT=1 sh -c "curl -fsSL https://raw.githubusercontent.com/InsForge/InsForge/main/deploy/setup.sh | sh -s \"$IF_DIR\""
fi

ENV_FILE="$IF_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Expected $ENV_FILE after setup. Re-run this script." >&2
  exit 1
fi

# Dedicated ports so iRewards does not clash with other local InsForge installs.
set_var COMPOSE_PROJECT_NAME irewards-insforge "$ENV_FILE"
set_var COMPOSE_FILE deploy/docker-compose/docker-compose.yml:docker-compose.override.yml "$ENV_FILE"
set_var POSTGRES_DB irewards "$ENV_FILE"
set_var APP_PORT 7230 "$ENV_FILE"
set_var AUTH_PORT 7231 "$ENV_FILE"
set_var POSTGREST_PORT 5440 "$ENV_FILE"
set_var POSTGRES_PORT 55532 "$ENV_FILE"
set_var DENO_PORT 7233 "$ENV_FILE"
set_var API_BASE_URL http://localhost:7230 "$ENV_FILE"
set_var VITE_API_BASE_URL http://localhost:7230 "$ENV_FILE"

echo "Starting iRewards InsForge (dashboard http://localhost:7230) ..."
cd "$IF_DIR"
docker compose up -d

echo "Waiting for Postgres ..."
for _ in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Waiting for InsForge API ..."
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null http://localhost:7230 2>/dev/null; then
    break
  fi
  sleep 2
done

"$ROOT/scripts/insforge-sync-env.sh"
"$ROOT/scripts/db-migrate.sh"

echo ""
echo "iRewards InsForge is ready."
echo "  Dashboard: http://localhost:7230"
echo "  Login: admin / (see infra/insforge/.env ROOT_ADMIN_PASSWORD)"
echo ""
echo "Next: npm run dev  →  http://localhost:3002/m/demo-cafe/table/1"
