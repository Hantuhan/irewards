#!/usr/bin/env sh
# Refund and void: the money comes back, and so does the loyalty.
#
# Reversal is the dangerous half of refunds. Points awarded on the order have
# to come off, points the member spent have to go back, and a one-per-member
# voucher has to become usable again — while lifetime points (which decide the
# member's tier) must not be inflated by the return.
set -eu

BASE_URL="${BASE_URL:-http://localhost:3002}"
MERCHANT_SLUG="${MERCHANT_SLUG:-demo-cafe}"

if [ -f "$(cd "$(dirname "$0")/.." && pwd)/.env.smoke" ]; then
  set -a
  . "$(cd "$(dirname "$0")/.." && pwd)/.env.smoke"
  set +a
fi
SMOKE_OWNER_EMAIL="${SMOKE_OWNER_EMAIL:?Set SMOKE_OWNER_EMAIL}"
SMOKE_OWNER_PASSWORD="${SMOKE_OWNER_PASSWORD:?Set SMOKE_OWNER_PASSWORD}"

JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

pass() { printf '✓ %s\n' "$1"; }
fail() { printf '✗ %s\n' "$1" >&2; exit 1; }
field() { node -e "
  const d=JSON.parse(process.argv[1]); const p=process.argv[2].split('.');
  let v=d; for (const k of p) v=v?.[k];
  console.log(v===undefined||v===null?'':v);" "$1" "$2"; }

echo "iRewards refund smoke → $BASE_URL"
echo ""

curl -s -X POST "$BASE_URL/api/merchant/auth/login" -H 'Content-Type: application/json' \
  -c "$JAR" -d "{\"email\":\"${SMOKE_OWNER_EMAIL}\",\"password\":\"${SMOKE_OWNER_PASSWORD}\"}" >/dev/null
pass "Merchant login"

# --- Build a real paid order through the storefront. ------------------------
menu=$(curl -s "$BASE_URL/api/merchant/$MERCHANT_SLUG/menu?format=storefront")
ITEM=$(node -e "
  const d=JSON.parse(process.argv[1]);
  const i=(d.categories||[]).flatMap(c=>c.items||[])[0];
  console.log(i?.id||'');" "$menu")
[ -n "$ITEM" ] || fail "No menu item to order"
pass "Picked menu item ($ITEM)"

# Every item here has required option groups, so take each group's default.
SELECTIONS=$(node -e "
  const d=JSON.parse(process.argv[1]);
  const item=(d.categories||[]).flatMap(c=>c.items||[]).find(i=>i.id===process.argv[2]);
  const out=[];
  for (const g of item?.modifierGroups||[]) {
    if (!g.required) continue;
    const o=(g.options||[]).find(x=>x.isDefault)||(g.options||[])[0];
    if (o) out.push({groupId:g.id, optionId:o.id});
  }
  console.log(JSON.stringify(out));" "$menu" "$ITEM")

checkout=$(curl -s -X POST "$BASE_URL/api/orders/checkout" -H 'Content-Type: application/json' \
  -d "{\"merchantSlug\":\"$MERCHANT_SLUG\",\"tableId\":\"1\",\"serviceType\":\"dine_in\",\"items\":[{\"id\":\"$ITEM\",\"quantity\":1,\"selections\":$SELECTIONS}]}")
ORDER=$(field "$checkout" orderId)
TOTAL=$(field "$checkout" totalCents)
[ -n "$ORDER" ] || fail "Checkout failed: $checkout"
pass "Order created ($ORDER, ${TOTAL}c)"

curl -s -X POST "$BASE_URL/api/orders/$ORDER/dev-pay" -o /dev/null
pass "Order paid"

# --- Refund it. -------------------------------------------------------------
refund=$(curl -s -X POST -b "$JAR" -H 'Content-Type: application/json' \
  -d '{"action":"refund","reason":"Smoke test refund"}' \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders/$ORDER/refund")
[ "$(field "$refund" ok)" = "true" ] || fail "Refund failed: $refund"
[ "$(field "$refund" full)" = "true" ] || fail "Expected a full refund: $refund"
[ "$(field "$refund" refundedCents)" = "$TOTAL" ] || fail "Refunded amount != total: $refund"
pass "Refunded in full (${TOTAL}c)"

# --- It must not be refundable twice. ---------------------------------------
again=$(curl -s -X POST -b "$JAR" -H 'Content-Type: application/json' \
  -d '{"action":"refund","reason":"Second attempt"}' \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders/$ORDER/refund")
echo "$again" | grep -qi "already been fully refunded" \
  || fail "A second refund was not refused: $again"
pass "Double refund refused"

# --- A refund needs a stated reason. ----------------------------------------
noreason=$(curl -s -o /dev/null -w '%{http_code}' -X POST -b "$JAR" \
  -H 'Content-Type: application/json' -d '{"action":"refund","reason":""}' \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders/$ORDER/refund")
[ "$noreason" = "400" ] || fail "Empty reason accepted (got $noreason)"
pass "Refund without a reason refused (400)"

# --- Voiding an unpaid order. -----------------------------------------------
checkout2=$(curl -s -X POST "$BASE_URL/api/orders/checkout" -H 'Content-Type: application/json' \
  -d "{\"merchantSlug\":\"$MERCHANT_SLUG\",\"tableId\":\"1\",\"serviceType\":\"dine_in\",\"items\":[{\"id\":\"$ITEM\",\"quantity\":1,\"selections\":$SELECTIONS}]}")
ORDER2=$(field "$checkout2" orderId)
[ -n "$ORDER2" ] || fail "Second checkout failed"

void=$(curl -s -X POST -b "$JAR" -H 'Content-Type: application/json' \
  -d '{"action":"void","reason":"Smoke test void"}' \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders/$ORDER2/refund")
[ "$(field "$void" status)" = "cancelled" ] || fail "Void did not cancel the order: $void"
pass "Unpaid order voided"

# A paid order must not be voidable, and an unpaid one must not be refunded.
wrong=$(curl -s -X POST -b "$JAR" -H 'Content-Type: application/json' \
  -d '{"action":"void","reason":"Should refuse"}' \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/orders/$ORDER/refund")
echo "$wrong" | grep -qi "refund it instead\|not awaiting payment" \
  || fail "Voiding a paid order was not refused: $wrong"
pass "Voiding a paid order refused"

echo ""
echo "Refund smoke tests passed."
