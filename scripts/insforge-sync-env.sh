#!/usr/bin/env sh
# Copy InsForge keys from infra/insforge/.env into the app .env.local.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IF_ENV="$ROOT/infra/insforge/.env"
APP_ENV="$ROOT/.env.local"

if [ ! -f "$IF_ENV" ]; then
  echo "Missing $IF_ENV — run: npm run insforge:setup" >&2
  exit 1
fi

get_env() {
  key="$1"
  grep "^${key}=" "$IF_ENV" | head -1 | cut -d= -f2-
}

ANON_KEY="$(get_env ACCESS_ANON_KEY)"
API_KEY="$(get_env ACCESS_API_KEY)"

if [ -z "$ANON_KEY" ] || [ -z "$API_KEY" ]; then
  echo "ACCESS_ANON_KEY or ACCESS_API_KEY missing in $IF_ENV" >&2
  exit 1
fi

if [ ! -f "$APP_ENV" ]; then
  cp "$ROOT/.env.example" "$APP_ENV"
fi

set_var() {
  key="$1"
  val="$2"
  tmp="$(mktemp)"
  awk -v key="$key" -v val="$val" '
    $0 ~ "^" key "=" { print key "=" val; found=1; next }
    { print }
    END { if (!found) print key "=" val }
  ' "$APP_ENV" > "$tmp" && mv "$tmp" "$APP_ENV"
}

set_var NEXT_PUBLIC_APP_URL http://localhost:3002
set_var NEXT_PUBLIC_INSFORGE_URL http://localhost:7230
set_var INSFORGE_URL http://localhost:7230
set_var NEXT_PUBLIC_INSFORGE_ANON_KEY "$ANON_KEY"
set_var INSFORGE_API_KEY "$API_KEY"

echo "Synced InsForge keys to .env.local (http://localhost:7230)"
