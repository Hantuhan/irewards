#!/usr/bin/env sh
# Apply insforge/migrations/*.sql to remote Postgres (Zeabur InsForge, Supabase, etc.).
exec sh "$(dirname "$0")/migrate-remote.sh"
