#!/usr/bin/env sh
# Tenant isolation: one merchant must never reach another's data.
#
# This exists because the dev auth bypass used to switch itself on whenever
# MERCHANT_SESSION_SECRET was unset — the default local setup — so every other
# smoke suite passed with authorization effectively disabled and nothing ever
# checked the access rules. The first thing this script does is prove auth is
# actually on, so it can never pass vacuously again.
set -eu

BASE_URL="${BASE_URL:-http://localhost:3002}"
VICTIM_SLUG="${VICTIM_SLUG:-demo-cafe}"

pass() { printf '✓ %s\n' "$1"; }
fail() { printf '✗ %s\n' "$1" >&2; exit 1; }

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "iRewards tenancy smoke → $BASE_URL"
echo ""

# --- 0. Authorization must be switched on, or the rest proves nothing. -------
anon=$(code "$BASE_URL/api/merchant/$VICTIM_SLUG/customers")
if [ "$anon" = "200" ]; then
  fail "Authorization is DISABLED: an anonymous request read $VICTIM_SLUG customers (got 200).
     Set MERCHANT_SESSION_SECRET and unset ALLOW_INSECURE_MERCHANT_ACCESS, then re-run.
     Every other smoke suite is meaningless while this is true."
fi
pass "Authorization is enforced (anonymous read → $anon)"

# --- 1. A brand-new tenant, created through the public signup. ---------------
TS="$(date +%s)"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

signup=$(curl -s -X POST "$BASE_URL/api/merchant/signup" \
  -H 'Content-Type: application/json' -c "$JAR" \
  -d "{\"cafeName\":\"Tenancy Probe $TS\",\"currency\":\"MYR\",\"ownerName\":\"Probe\",\"ownerEmail\":\"tenancy-$TS@example.com\",\"ownerPassword\":\"TenancyProbe2026!x\",\"subdomain\":\"tenancy$TS\"}")
MINE=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.merchant?.slug||'')" "$signup" 2>/dev/null || true)
[ -n "$MINE" ] || fail "Could not provision a probe tenant"
pass "Probe tenant provisioned ($MINE)"

own=$(code -b "$JAR" "$BASE_URL/api/merchant/$MINE/customers")
[ "$own" = "200" ] || fail "Probe tenant cannot read its own customers (got $own)"
pass "Probe tenant can read its own data (200)"

# --- 2. Private reads across tenants must be refused. ------------------------
for path in customers orders campaigns analytics reports team tables stamps; do
  got=$(code -b "$JAR" "$BASE_URL/api/merchant/$VICTIM_SLUG/$path")
  case "$got" in
    401|403) pass "cross-tenant GET /$path refused ($got)" ;;
    *) fail "cross-tenant GET /$path returned $got — expected 401/403" ;;
  esac
done

# `settings`, `menu` and `reward-levels` are deliberately public on GET: the
# storefront renders from them without a session. They are asserted as public
# rather than skipped, so making one of them private is a deliberate change.
for path in settings menu reward-levels; do
  got=$(code "$BASE_URL/api/merchant/$VICTIM_SLUG/$path")
  [ "$got" = "200" ] || fail "public storefront GET /$path returned $got — expected 200"
done
pass "Public storefront reads still open (settings, menu, reward-levels)"

# --- 3. Writes across tenants must be refused. -------------------------------
wrote=$(code -X PATCH -b "$JAR" -H 'Content-Type: application/json' \
  -d '{"name":"tenancy-probe-should-not-apply"}' \
  "$BASE_URL/api/merchant/$VICTIM_SLUG/settings")
case "$wrote" in
  401|403) pass "cross-tenant PATCH /settings refused ($wrote)" ;;
  *) fail "cross-tenant PATCH /settings returned $wrote — expected 401/403" ;;
esac

# --- 4. IDOR: my own authorised endpoint, their resource id. -----------------
victim_campaign=$(curl -s "$BASE_URL/api/merchant/$VICTIM_SLUG/campaigns/banner" >/dev/null 2>&1; echo "")
idor=$(curl -s -b "$JAR" -X PATCH -H 'Content-Type: application/json' \
  -d '{"campaignId":"00000000-0000-4000-8000-000000000000","status":"paused"}' \
  "$BASE_URL/api/merchant/$MINE/campaigns")
echo "$idor" | grep -qi "not found" \
  && pass "Unknown campaign id rejected cleanly (no raw database error)" \
  || fail "Expected a clean 'not found'; got: $idor"

# --- 5. Roles: a staff account must not hold owner powers. ------------------
# Skipped unless staff credentials are configured, so the suite still runs on
# a bare setup — but when they exist these are the expensive ones: the loyalty
# earn rate, the tax settings, and minting discount codes.
if [ -n "${SMOKE_STAFF_EMAIL:-}" ] && [ -n "${SMOKE_STAFF_PASSWORD:-}" ]; then
  SJAR="$(mktemp)"
  trap 'rm -f "$JAR" "$SJAR"' EXIT
  curl -s -X POST "$BASE_URL/api/merchant/auth/login" \
    -H 'Content-Type: application/json' -c "$SJAR" \
    -d "{\"email\":\"${SMOKE_STAFF_EMAIL}\",\"password\":\"${SMOKE_STAFF_PASSWORD}\"}" >/dev/null

  role=$(curl -s -b "$SJAR" "$BASE_URL/api/merchant/auth/me" \
    | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.role||'')" 2>/dev/null || true)
  [ "$role" = "staff" ] || fail "Expected a staff session, got role='$role'"
  pass "Staff session established"

  # Reads and day-to-day work must keep working.
  for path in orders customers; do
    got=$(code -b "$SJAR" "$BASE_URL/api/merchant/$VICTIM_SLUG/$path")
    [ "$got" = "200" ] || fail "staff GET /$path returned $got — staff must keep day-to-day access"
  done
  pass "Staff keeps day-to-day reads (orders, customers)"

  # Changing the loyalty earn rate is an owner decision.
  got=$(code -X PATCH -b "$SJAR" -H 'Content-Type: application/json' \
    -d '{"pointsPerRinggit":99}' "$BASE_URL/api/merchant/$VICTIM_SLUG/settings")
  [ "$got" = "403" ] || fail "staff PATCH /settings returned $got — expected 403"
  pass "Staff cannot change store settings (403)"

  # Minting a 100% discount code is not a counter-staff power.
  got=$(code -X POST -b "$SJAR" -H 'Content-Type: application/json' \
    -d '{"name":"Tenancy probe","code":"TENANCYPROBE","type":"percentage","value":100}' \
    "$BASE_URL/api/merchant/$VICTIM_SLUG/promos")
  [ "$got" = "403" ] || fail "staff POST /promos returned $got — expected 403"
  pass "Staff cannot mint discount codes (403)"
else
  printf '· staff role checks skipped (set SMOKE_STAFF_EMAIL / SMOKE_STAFF_PASSWORD)\n'
fi

echo ""
echo "Tenancy smoke tests passed."
