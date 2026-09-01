#!/usr/bin/env sh
# End-to-end smoke tests for iRewards (merchant SaaS + diner flow)
set -eu

BASE_URL="${BASE_URL:-http://localhost:3002}"
MERCHANT_SLUG="${MERCHANT_SLUG:-demo-cafe}"
TABLE_ID="${TABLE_ID:-1}"
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
  -d '{"email":"owner@demo-cafe.com","password":"demo123"}' \
  -c "$COOKIE_JAR" -w "\n%{http_code}")
login_body=$(printf '%s' "$login_resp" | sed '$d')
login_code=$(printf '%s' "$login_resp" | tail -n 1)
[ "$login_code" = "200" ] && pass "Merchant login ($login_code)" || fail "Merchant login failed: $login_body"

auth() { curl -s -b "$COOKIE_JAR" "$@"; }

# --- Merchant APIs ---
for path in settings menu orders customers analytics campaigns automation tables reward-levels; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/merchant/$MERCHANT_SLUG/$path")
  [ "$code" = "200" ] && pass "GET /api/merchant/$MERCHANT_SLUG/$path ($code)" || fail "GET $path expected 200 got $code"
done

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
for path in "" menu rewards customers analytics campaigns automation tables settings; do
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
sse_code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -N --max-time 2 \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders/stream" 2>/dev/null || true)
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
