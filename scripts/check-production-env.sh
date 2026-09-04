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
# Merchants connect their own WhatsApp account, so what production actually
# needs is the app credentials that drive Embedded Signup — not a platform WABA.
require META_APP_ID
require META_APP_SECRET
require META_WEBHOOK_VERIFY_TOKEN
# Without this the Connect button tells every merchant the server is not set up.
require META_EMBEDDED_SIGNUP_CONFIG_ID

# Merchant tokens are encrypted with this. It falls back to
# MERCHANT_SESSION_SECRET, which means rotating a session secret would silently
# orphan every connected merchant — so production names it explicitly.
require WHATSAPP_TOKEN_KEY

# The shared platform number is a pilot tool, not the steady state. It is only
# consulted when the fallback is switched on, and then it must be complete.
if [ "${WHATSAPP_ALLOW_PLATFORM_FALLBACK:-}" = "true" ]; then
  warn "WHATSAPP_ALLOW_PLATFORM_FALLBACK=true — merchants without their own WhatsApp account will send on the shared platform number"
  require META_ACCESS_TOKEN
  require META_WABA_ID
  require META_PHONE_NUMBER_ID
else
  ok "Platform WhatsApp fallback off — every merchant sends from their own account"
fi

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

case "${PAYMENT_PROVIDER:-}" in
  chip)
    ok "PAYMENT_PROVIDER=chip"
    require PAYMENT_API_KEY
    # CHIP verifies callbacks against a public key it serves, so there is no
    # shared salt here — the brand is what the API key cannot supply on its own.
    require CHIP_BRAND_ID
    ;;
  hitpay)
    ok "PAYMENT_PROVIDER=hitpay"
    require PAYMENT_API_KEY
    require PAYMENT_SALT
    require PAYMENT_WEBHOOK_SECRET
    ;;
  *)
    die "PAYMENT_PROVIDER must be chip or hitpay in production (got: ${PAYMENT_PROVIDER:-unset})"
    ;;
esac

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
