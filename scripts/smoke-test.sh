#!/usr/bin/env sh
# End-to-end smoke tests for iRewards (merchant SaaS + diner flow)
set -eu

BASE_URL="${BASE_URL:-http://localhost:3002}"
MERCHANT_SLUG="${MERCHANT_SLUG:-demo-cafe}"
TABLE_ID="${TABLE_ID:-1}"

# Credentials: set in env or gitignored `.env.smoke` (see `.env.smoke.example`). Never commit passwords.
if [ -f "$(cd "$(dirname "$0")/.." && pwd)/.env.smoke" ]; then
  # shellcheck disable=SC1091
  set -a
  . "$(cd "$(dirname "$0")/.." && pwd)/.env.smoke"
  set +a
fi
SMOKE_OWNER_EMAIL="${SMOKE_OWNER_EMAIL:?Set SMOKE_OWNER_EMAIL (e.g. in .env.smoke)}"
SMOKE_OWNER_PASSWORD="${SMOKE_OWNER_PASSWORD:?Set SMOKE_OWNER_PASSWORD (e.g. in .env.smoke)}"
SMOKE_STAFF_EMAIL="${SMOKE_STAFF_EMAIL:-}"
SMOKE_STAFF_PASSWORD="${SMOKE_STAFF_PASSWORD:-}"
PLATFORM_ADMIN_PASSWORD="${PLATFORM_ADMIN_PASSWORD:?Set PLATFORM_ADMIN_PASSWORD (e.g. in .env.smoke or .env.local)}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

pass() { printf '✓ %s\n' "$1"; }
fail() { printf '✗ %s\n' "$1" >&2; exit 1; }

json_field() {
  node -e "
    const d = JSON.parse(process.argv[1]);
    const path = process.argv[2].split('.');
    let v = d;
    for (const k of path) v = v?.[k];
    if (v === undefined || v === null) process.exit(1);
    if (typeof v === 'object') console.log(JSON.stringify(v));
    else console.log(v);
  " "$1" "$2"
}

http_code() {
  curl -s -o /dev/null -w "%{http_code}" "$1"
}

echo "iRewards smoke tests → $BASE_URL"
echo ""

# --- Public pages ---
code=$(http_code "$BASE_URL/")
[ "$code" = "200" ] && pass "Landing page ($code)" || fail "Landing page expected 200 got $code"

code=$(http_code "$BASE_URL/login")
[ "$code" = "200" ] && pass "Login page ($code)" || fail "Login page expected 200 got $code"

code=$(http_code "$BASE_URL/m/$MERCHANT_SLUG/table/$TABLE_ID")
[ "$code" = "200" ] && pass "Storefront ($code)" || fail "Storefront expected 200 got $code"

# --- Storefront menu API ---
menu_resp=$(curl -s "$BASE_URL/api/merchant/$MERCHANT_SLUG/menu?format=storefront")
item_count=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const n = d.categories?.reduce((s,c)=>s+(c.items?.length||0),0) ?? 0;
  console.log(n);
" "$menu_resp")
[ "$item_count" -gt 0 ] && pass "Storefront menu ($item_count items)" || fail "Storefront menu empty"

# --- Merchant login ---
login_resp=$(curl -s -X POST "$BASE_URL/api/merchant/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SMOKE_OWNER_EMAIL}\",\"password\":\"${SMOKE_OWNER_PASSWORD}\"}" \
  -c "$COOKIE_JAR" -w "\n%{http_code}")
login_body=$(printf '%s' "$login_resp" | sed '$d')
login_code=$(printf '%s' "$login_resp" | tail -n 1)
[ "$login_code" = "200" ] && pass "Merchant login ($login_code)" || fail "Merchant login failed: $login_body"

# --- Multi-user staff login (same cafe) ---
if [ -n "${SMOKE_STAFF_EMAIL}" ] && [ -n "${SMOKE_STAFF_PASSWORD}" ]; then
  staff_resp=$(curl -s -X POST "$BASE_URL/api/merchant/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${SMOKE_STAFF_EMAIL}\",\"password\":\"${SMOKE_STAFF_PASSWORD}\"}" \
    -w "\n%{http_code}")
  staff_body=$(printf '%s' "$staff_resp" | sed '$d')
  staff_code=$(printf '%s' "$staff_resp" | tail -n 1)
  staff_role=$(node -e "const d=JSON.parse(process.argv[1]); console.log(d.user?.role||'')" "$staff_body" 2>/dev/null || true)
  [ "$staff_code" = "200" ] && [ "$staff_role" = "staff" ] && pass "Staff login (role=$staff_role)" || fail "Staff login failed: $staff_body"
else
  pass "Staff login skipped (SMOKE_STAFF_* not set)"
fi

auth() { curl -s -b "$COOKIE_JAR" "$@"; }

# --- Merchant APIs ---
for path in settings menu orders customers analytics campaigns tables reward-levels reports "reports/compare?periodDays=7" reports/intelligence team stamps; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/merchant/$MERCHANT_SLUG/$path")
  [ "$code" = "200" ] && pass "GET /api/merchant/$MERCHANT_SLUG/$path ($code)" || fail "GET $path expected 200 got $code"
done

# --- Public stamps progress ---
stamps_prog=$(http_code "$BASE_URL/api/merchant/$MERCHANT_SLUG/stamps/progress")
[ "$stamps_prog" = "200" ] && pass "Stamps progress API ($stamps_prog)" || fail "Stamps progress expected 200 got $stamps_prog"

# --- Subdomain rewrite (Host: demo-cafe.localhost) ---
sub_code=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: demo-cafe.localhost" "$BASE_URL/")
[ "$sub_code" = "200" ] && pass "Subdomain storefront rewrite ($sub_code)" || fail "Subdomain rewrite expected 200 got $sub_code"

# --- Platform admin ---
plat_resp=$(curl -s -X POST "$BASE_URL/api/platform/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":$(node -e "console.log(JSON.stringify(process.env.PLATFORM_ADMIN_PASSWORD||''))" )}" \
  -c /tmp/irewards-platform-cookies.txt -w "\n%{http_code}")
plat_code=$(printf '%s' "$plat_resp" | tail -n 1)
[ "$plat_code" = "200" ] && pass "Platform admin login ($plat_code)" || fail "Platform admin login failed"
tenants_code=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/irewards-platform-cookies.txt "$BASE_URL/api/platform/tenants")
[ "$tenants_code" = "200" ] && pass "Platform tenants list ($tenants_code)" || fail "Platform tenants expected 200 got $tenants_code"

# --- Signup page + weak password rejected ---
signup_page=$(http_code "$BASE_URL/signup")
[ "$signup_page" = "200" ] && pass "Signup page ($signup_page)" || fail "Signup page expected 200"
weak_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/merchant/signup" \
  -H "Content-Type: application/json" \
  -d '{"cafeName":"Weak Cafe","currency":"MYR","ownerName":"A","ownerEmail":"weak-'$(date +%s)'@example.com","ownerPassword":"demo123"}')
[ "$weak_code" = "400" ] && pass "Weak signup password rejected ($weak_code)" || fail "Weak signup expected 400 got $weak_code"

# --- Signup auto-provision (unique cafe) ---
SIGNUP_TS=$(date +%s)
SIGNUP_EMAIL="owner-smoke-${SIGNUP_TS}@example.com"
SIGNUP_SUB="smokecafe${SIGNUP_TS}"
signup_resp=$(curl -s -X POST "$BASE_URL/api/merchant/signup" \
  -H "Content-Type: application/json" \
  -c /tmp/irewards-signup-cookies.txt \
  -d "{\"cafeName\":\"Smoke Cafe ${SIGNUP_TS}\",\"currency\":\"MYR\",\"ownerName\":\"Smoke Owner\",\"ownerEmail\":\"${SIGNUP_EMAIL}\",\"ownerPassword\":\"SmokeCafe2026!x\",\"subdomain\":\"${SIGNUP_SUB}\"}" \
  -w "\n%{http_code}")
signup_body=$(printf '%s' "$signup_resp" | sed '$d')
signup_code=$(printf '%s' "$signup_resp" | tail -n 1)
signup_slug=$(node -e "const d=JSON.parse(process.argv[1]); console.log(d.merchant?.slug||'')" "$signup_body" 2>/dev/null || true)
[ "$signup_code" = "200" ] && [ -n "$signup_slug" ] && pass "Signup provisioned ($signup_slug)" || fail "Signup provision failed: $signup_body"
dash_code=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/irewards-signup-cookies.txt "$BASE_URL/dashboard/$signup_slug")
[ "$dash_code" = "200" ] && pass "New merchant dashboard ($dash_code)" || fail "New merchant dashboard expected 200 got $dash_code"

# --- Menu catalogue (merchant admin) ---
menu_admin_resp=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/menu")
menu_cat_count=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const cats = d.categories?.length ?? 0;
  const items = d.items?.length ?? 0;
  if (cats < 1 || items < 1) process.exit(1);
  console.log(cats + ' categories, ' + items + ' items');
" "$menu_admin_resp" 2>/dev/null || true)
[ -n "$menu_cat_count" ] && pass "Menu catalogue ($menu_cat_count)" || fail "Menu catalogue empty or invalid: $menu_admin_resp"

menu_page_code=$(http_code "$BASE_URL/dashboard/$MERCHANT_SLUG/menu")
[ "$menu_page_code" = "200" ] && pass "Menu admin page ($menu_page_code)" || fail "Menu admin page expected 200 got $menu_page_code"

# --- Checkout + dev payment ---
first_item_id=$(node -e "
  const d = JSON.parse(process.argv[1]);
  for (const c of d.categories || []) {
    for (const item of c.items || []) {
      if (item.available !== false) {
        console.log(item.id);
        process.exit(0);
      }
    }
  }
  process.exit(1);
" "$menu_resp" 2>/dev/null || true)
[ -n "$first_item_id" ] && pass "Checkout item ($first_item_id)" || fail "No available menu item for checkout"

checkout_resp=$(curl -s -X POST "$BASE_URL/api/orders/checkout" \
  -H "Content-Type: application/json" \
  -d "{\"merchantSlug\":\"$MERCHANT_SLUG\",\"tableId\":\"$TABLE_ID\",\"items\":[{\"id\":\"$first_item_id\",\"quantity\":1}]}")
order_id=$(json_field "$checkout_resp" "orderId" 2>/dev/null || true)
[ -n "$order_id" ] && pass "Checkout created order $order_id" || fail "Checkout failed: $checkout_resp"

dev_pay_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/orders/$order_id/dev-pay")
[ "$dev_pay_code" = "200" ] && pass "Dev payment ($dev_pay_code)" || fail "Dev payment expected 200 got $dev_pay_code"

order_resp=$(curl -s "$BASE_URL/api/orders/$order_id")
order_status=$(json_field "$order_resp" "order.status" 2>/dev/null || true)
[ "$order_status" = "paid" ] && pass "Order status paid" || fail "Order not paid: $order_resp"

# --- Kitchen board sees order ---
sleep 1
orders_resp=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders")
found=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const id = process.argv[2];
  const hit = (d.orders || []).some(o => o.id === id);
  process.exit(hit ? 0 : 1);
" "$orders_resp" "$order_id" 2>/dev/null && echo yes || echo no)
[ "$found" = "yes" ] && pass "Order on kitchen board" || fail "Order not on kitchen board"

# --- Advance kitchen status ---
patch_code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X PATCH \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"$order_id\",\"kitchenStatus\":\"preparing\"}")
[ "$patch_code" = "200" ] && pass "Kitchen status → preparing ($patch_code)" || fail "Kitchen patch failed $patch_code"

# --- Thank-you page ---
code=$(http_code "$BASE_URL/m/$MERCHANT_SLUG/table/$TABLE_ID/thanks?orderId=$order_id")
[ "$code" = "200" ] && pass "Thank-you page ($code)" || fail "Thank-you page expected 200 got $code"

# --- Dashboard pages ---
for path in "" menu rewards customers analytics campaigns "campaigns?tab=promos" tables settings reports; do
  url="$BASE_URL/dashboard/$MERCHANT_SLUG"
  [ -n "$path" ] && url="$url/$path"
  code=$(http_code "$url")
  [ "$code" = "200" ] && pass "Dashboard /$path ($code)" || fail "Dashboard /$path expected 200 got $code"
done

# --- Promos API ---
promos_code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/merchant/$MERCHANT_SLUG/promos")
[ "$promos_code" = "200" ] && pass "GET promos ($promos_code)" || fail "GET promos expected 200 got $promos_code"

# --- Campaign banner (public) ---
banner_code=$(http_code "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns/banner")
[ "$banner_code" = "200" ] && pass "Campaign banner API ($banner_code)" || fail "Campaign banner expected 200 got $banner_code"

# --- Customer session ---
session_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/customer/session")
[ "$session_code" = "200" ] && pass "Customer session ($session_code)" || fail "Customer session expected 200 got $session_code"

# --- Kitchen SSE ---
sse_code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -N --max-time 5 \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders/stream" 2>/dev/null || true)
if [ "$sse_code" != "200" ]; then
  sleep 1
  sse_code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -N --max-time 5 \
    "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders/stream" 2>/dev/null || true)
fi
[ "$sse_code" = "200" ] && pass "Kitchen SSE stream ($sse_code)" || fail "Kitchen SSE expected 200 got $sse_code"

# --- Automation cron ---
cron_secret="${CRON_SECRET:-irewards-dev-cron}"
cron_resp=$(curl -s -X POST "$BASE_URL/api/cron/automation" \
  -H "Authorization: Bearer $cron_secret" \
  -H "Content-Type: application/json")
cron_ok=$(node -e "
  const d = JSON.parse(process.argv[1]);
  process.exit(d.jobs !== undefined ? 0 : 1);
" "$cron_resp" 2>/dev/null && echo yes || echo no)
[ "$cron_ok" = "yes" ] && pass "Automation cron" || fail "Automation cron failed: $cron_resp"

echo ""
echo "All smoke tests passed."
