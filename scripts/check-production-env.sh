#!/usr/bin/env sh
# Fail if production-critical env is missing or still in local-dev mode.
# Usage: NODE_ENV=production sh scripts/check-production-env.sh
set -eu

fail=0
warn() { printf 'WARN  %s\n' "$1"; }
die() { printf 'FAIL  %s\n' "$1"; fail=1; }
ok() { printf 'OK    %s\n' "$1"; }

require() {
  eval "val=\${$1-}"
  if [ -z "$val" ]; then
    die "$1 is required"
  else
    ok "$1 is set"
  fi
}

echo "iRewards production env check (NODE_ENV=${NODE_ENV:-unset})"
echo

require MERCHANT_SESSION_SECRET
require MEMBER_SESSION_SECRET
require CRON_SECRET
require PLATFORM_ADMIN_PASSWORD
require PLATFORM_SESSION_SECRET
require META_ACCESS_TOKEN
require META_WABA_ID
require META_PHONE_NUMBER_ID
require META_APP_SECRET
require META_WEBHOOK_VERIFY_TOKEN

if [ "${DATABASE_PROVIDER:-insforge}" = "supabase" ]; then
  require SUPABASE_URL
  require SUPABASE_SERVICE_ROLE_KEY
  ok "DATABASE_PROVIDER=supabase"
else
  require INSFORGE_URL
  require INSFORGE_API_KEY
  ok "DATABASE_PROVIDER=insforge (default)"
fi

if [ "${CRON_SECRET:-}" = "irewards-dev-cron" ]; then
  die "CRON_SECRET must not be the local default (irewards-dev-cron)"
fi

if [ "${PAYMENT_PROVIDER:-}" != "hitpay" ]; then
  die "PAYMENT_PROVIDER must be hitpay in production (got: ${PAYMENT_PROVIDER:-unset})"
else
  ok "PAYMENT_PROVIDER=hitpay"
fi

require PAYMENT_API_KEY
require PAYMENT_SALT
require PAYMENT_WEBHOOK_SECRET

if [ "${WHATSAPP_SKIP_SEND:-}" = "true" ]; then
  die "WHATSAPP_SKIP_SEND must be unset/false in production"
else
  ok "WHATSAPP_SKIP_SEND is not forcing skip"
fi

if [ "${META_SKIP_VERIFY:-}" = "true" ]; then
  die "META_SKIP_VERIFY must be unset/false in production"
else
  ok "META_SKIP_VERIFY is not forcing skip"
fi

if [ -z "${NEXT_PUBLIC_APP_URL:-}" ]; then
  warn "NEXT_PUBLIC_APP_URL is empty (HitPay/Meta callbacks need the public URL)"
else
  ok "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}"
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "Production env check FAILED."
  exit 1
fi
echo "Production env check PASSED."
