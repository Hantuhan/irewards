#!/usr/bin/env sh
# Production entrypoint (Zeabur Docker): wait for InsForge, apply migrations, start Next.js.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ "${DATABASE_PROVIDER:-insforge}" = "insforge" ]; then
  if [ -n "${INSFORGE_URL:-}" ]; then
    sh "$ROOT/scripts/wait-for-http.sh" "${INSFORGE_URL%/}/" "${INSFORGE_WAIT_SEC:-180}" || true
  fi

  if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
    if [ -n "${INSFORGE_DATABASE_URL:-}" ] || [ -n "${DATABASE_URL:-}" ]; then
      sh "$ROOT/scripts/migrate-remote.sh" || echo "WARN: migrations failed — check INSFORGE_DATABASE_URL" >&2
    fi
  fi
fi

exec node server.js
