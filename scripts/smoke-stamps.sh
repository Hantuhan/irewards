#!/usr/bin/env sh
# Stamps module smoke — config GET/PUT, validation, public progress, rewards UI.
set -eu

BASE_URL="${BASE_URL:-http://localhost:3002}"
MERCHANT_SLUG="${MERCHANT_SLUG:-demo-cafe}"

if [ -f "$(cd "$(dirname "$0")/.." && pwd)/.env.smoke" ]; then
  # shellcheck disable=SC1091
  set -a
  . "$(cd "$(dirname "$0")/.." && pwd)/.env.smoke"
  set +a
fi
SMOKE_OWNER_EMAIL="${SMOKE_OWNER_EMAIL:?Set SMOKE_OWNER_EMAIL (e.g. in .env.smoke)}"
SMOKE_OWNER_PASSWORD="${SMOKE_OWNER_PASSWORD:?Set SMOKE_OWNER_PASSWORD (e.g. in .env.smoke)}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

pass() { printf '✓ %s\n' "$1"; }
fail() { printf '✗ %s\n' "$1" >&2; exit 1; }

echo "iRewards stamps smoke → $BASE_URL"
echo ""

# --- Login ---
login_resp=$(curl -s -X POST "$BASE_URL/api/merchant/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SMOKE_OWNER_EMAIL}\",\"password\":\"${SMOKE_OWNER_PASSWORD}\"}" \
  -c "$COOKIE_JAR" -w "\n%{http_code}")
login_body=$(printf '%s' "$login_resp" | sed '$d')
login_code=$(printf '%s' "$login_resp" | tail -n 1)
[ "$login_code" = "200" ] && pass "Merchant login" || fail "Login failed: $login_body"

auth() { curl -s -b "$COOKIE_JAR" "$@"; }

# --- Dashboard rewards page (hub + stamps shell) ---
rewards_page=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/dashboard/$MERCHANT_SLUG/rewards")
[ "$rewards_page" = "200" ] && pass "Dashboard /rewards ($rewards_page)" || fail "Dashboard /rewards expected 200 got $rewards_page"

# --- GET stamps config (auth) ---
get_before=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/stamps")
node -e "
  const d = JSON.parse(process.argv[1]);
  if (!d.program || !Array.isArray(d.presets) || !d.menu?.categories) process.exit(1);
  if (!d.presets.includes(6)) process.exit(1);
" "$get_before" 2>/dev/null \
  && pass "GET stamps config (program + presets + menu)" \
  || fail "GET stamps invalid: $get_before"

# Snapshot prior program for restore
SNAPSHOT=$(node -e "
  const d = JSON.parse(process.argv[1]);
  console.log(JSON.stringify({
    enabled: Boolean(d.enabled),
    cardSize: d.program.cardSize,
    rewardType: d.program.rewardType,
    rewardLabel: d.program.rewardLabel,
    rewardMenuItemId: d.program.rewardMenuItemId,
    rewardPercent: d.program.rewardPercent,
    rewardCents: d.program.rewardCents,
    qualifyingMenuItemIds: d.program.qualifyingMenuItemIds || [],
    qualifyingCategoryIds: d.program.qualifyingCategoryIds || [],
    maxStampsPerOrder: d.program.maxStampsPerOrder,
    maxStampsPerDay: d.program.maxStampsPerDay,
  }));
" "$get_before")

# Pick a category + item for qualifying rules
CAT_ID=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const c = (d.menu.categories || [])[0];
  if (!c?.id) process.exit(1);
  console.log(c.id);
" "$get_before" 2>/dev/null || true)
ITEM_ID=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const i = (d.menu.items || []).find((x) => x.categoryId === process.argv[2]) || (d.menu.items || [])[0];
  if (!i?.id) process.exit(1);
  console.log(i.id);
" "$get_before" "$CAT_ID" 2>/dev/null || true)
[ -n "$CAT_ID" ] && [ -n "$ITEM_ID" ] \
  && pass "Menu pick for earn rules (cat=$CAT_ID item=$ITEM_ID)" \
  || fail "No menu category/item for stamps smoke"

# --- PUT validation: empty qualifying → 400 ---
empty_code=$(curl -s -o /tmp/irewards-stamps-empty.json -w "%{http_code}" -b "$COOKIE_JAR" \
  -X PUT "$BASE_URL/api/merchant/$MERCHANT_SLUG/stamps" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"cardSize":6,"rewardType":"percent_off","rewardLabel":"10% off","rewardPercent":10,"qualifyingMenuItemIds":[],"qualifyingCategoryIds":[]}')
[ "$empty_code" = "400" ] \
  && pass "PUT stamps rejects empty qualifying ($empty_code)" \
  || fail "Empty qualifying expected 400 got $empty_code: $(cat /tmp/irewards-stamps-empty.json)"

# --- PUT valid program ---
put_body=$(node -e "
  console.log(JSON.stringify({
    enabled: true,
    cardSize: 6,
    rewardType: 'percent_off',
    rewardLabel: 'Smoke 10% off',
    rewardPercent: 10,
    rewardCents: null,
    rewardMenuItemId: null,
    qualifyingMenuItemIds: [process.argv[1]],
    qualifyingCategoryIds: [],
    maxStampsPerOrder: 3,
    maxStampsPerDay: 10,
  }));
" "$ITEM_ID")
put_resp=$(curl -s -b "$COOKIE_JAR" -X PUT "$BASE_URL/api/merchant/$MERCHANT_SLUG/stamps" \
  -H "Content-Type: application/json" \
  -d "$put_body" -w "\n%{http_code}")
put_json=$(printf '%s' "$put_resp" | sed '$d')
put_code=$(printf '%s' "$put_resp" | tail -n 1)
[ "$put_code" = "200" ] && pass "PUT stamps program ($put_code)" || fail "PUT stamps failed: $put_json"

node -e "
  const d = JSON.parse(process.argv[1]);
  if (!d.enabled) process.exit(1);
  if (d.program.cardSize !== 6) process.exit(1);
  if (d.program.rewardType !== 'percent_off') process.exit(1);
  if (d.program.rewardLabel !== 'Smoke 10% off') process.exit(1);
  if (Number(d.program.rewardPercent) !== 10) process.exit(1);
  if (!d.program.qualifyingMenuItemIds.includes(process.argv[2])) process.exit(1);
  if (d.program.maxStampsPerOrder !== 3) process.exit(1);
" "$put_json" "$ITEM_ID" 2>/dev/null \
  && pass "PUT response matches smoke program" \
  || fail "PUT response mismatch: $put_json"

# --- GET reflects save ---
get_after=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/stamps")
node -e "
  const d = JSON.parse(process.argv[1]);
  if (!d.enabled) process.exit(1);
  if (d.program.rewardLabel !== 'Smoke 10% off') process.exit(1);
  if (!d.program.qualifyingMenuItemIds.includes(process.argv[2])) process.exit(1);
" "$get_after" "$ITEM_ID" 2>/dev/null \
  && pass "GET stamps reflects saved program" \
  || fail "GET after PUT mismatch: $get_after"

# --- Settings exposes stamps toggle ---
settings=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/settings")
node -e "
  const d = JSON.parse(process.argv[1]);
  if (d.stampsProgramEnabled !== true) process.exit(1);
" "$settings" 2>/dev/null \
  && pass "Settings stampsProgramEnabled=true" \
  || fail "Settings missing stampsProgramEnabled: $settings"

# --- Public progress (no customer) ---
prog_resp=$(curl -s "$BASE_URL/api/merchant/$MERCHANT_SLUG/stamps/progress")
node -e "
  const d = JSON.parse(process.argv[1]);
  if (d.stampsProgramEnabled !== true) process.exit(1);
  if (d.progress === undefined) process.exit(1);
" "$prog_resp" 2>/dev/null \
  && pass "Public stamps progress (enabled)" \
  || fail "Progress API failed: $prog_resp"

# --- Redeem without member session → 401 ---
redeem_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/customer/stamps/redeem" \
  -H "Content-Type: application/json" \
  -d "{\"merchantSlug\":\"$MERCHANT_SLUG\"}")
[ "$redeem_code" = "401" ] \
  && pass "Redeem requires member session ($redeem_code)" \
  || fail "Redeem expected 401 got $redeem_code"

# --- Restore prior program when it had qualifying rules; else leave smoke program ---
RESTORE_OK=$(node -e "
  const s = JSON.parse(process.argv[1]);
  const has =
    (s.qualifyingMenuItemIds || []).length > 0 ||
    (s.qualifyingCategoryIds || []).length > 0;
  console.log(has ? 'yes' : 'no');
" "$SNAPSHOT")
if [ "$RESTORE_OK" = "yes" ]; then
  restore_code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
    -X PUT "$BASE_URL/api/merchant/$MERCHANT_SLUG/stamps" \
    -H "Content-Type: application/json" \
    -d "$SNAPSHOT")
  [ "$restore_code" = "200" ] && pass "Restored prior stamps program ($restore_code)" \
    || fail "Restore failed ($restore_code)"
else
  pass "Left smoke stamps program (no prior qualifying rules to restore)"
fi

echo ""
echo "Stamps smoke tests passed."
