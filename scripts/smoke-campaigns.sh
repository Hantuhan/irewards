#!/usr/bin/env sh
# Multi-campaign smoke tests — create, list, patch, banner, go-live guards.
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

SUFFIX="$(date +%s | tail -c 6)"
NAME_WELCOME="Smoke Welcome $SUFFIX"
NAME_WINBACK="Smoke Winback $SUFFIX"
NAME_BANNER="Smoke Banner $SUFFIX"

echo "iRewards campaign smoke → $BASE_URL"
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
auth_code() { curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$@"; }

# --- List existing ---
list_before=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns")
count_before=$(node -e "const d=JSON.parse(process.argv[1]); console.log((d.campaigns||[]).length)" "$list_before")
pass "List campaigns ($count_before existing)"

# --- Create WhatsApp welcome (draft) ---
welcome_body=$(cat <<EOF
{
  "name": "$NAME_WELCOME",
  "channel": "whatsapp",
  "status": "draft",
  "workflow": {
    "version": 1,
    "trigger": { "id": "t1", "kind": "trigger", "type": "first_visit", "config": {} },
    "conditions": [
      { "id": "c1", "kind": "condition", "type": "marketing_opted_in", "config": {} },
      { "id": "c2", "kind": "condition", "type": "has_phone", "config": {} }
    ],
    "actions": [
      { "id": "a1", "kind": "action", "type": "wait", "config": { "amount": 1, "unit": "hours" } },
      { "id": "a2", "kind": "action", "type": "send_whatsapp", "config": {
        "template": {
          "headerType": "none", "headerText": "", "headerImageUrl": null,
          "body": "Hi {name}, welcome to {merchant}! Thanks for visiting. Reply STOP to opt out.",
          "footer": "", "includeOptOut": true, "buttons": []
        }
      }}
    ],
    "elseActions": []
  }
}
EOF
)
welcome_resp=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" -d "$welcome_body")
welcome_id=$(json_field "$welcome_resp" "id" 2>/dev/null || true)
[ -n "$welcome_id" ] && pass "Create WhatsApp welcome ($welcome_id)" || fail "Welcome create failed: $welcome_resp"

# --- Create WhatsApp winback (draft) ---
winback_body=$(cat <<EOF
{
  "name": "$NAME_WINBACK",
  "channel": "whatsapp",
  "status": "draft",
  "workflow": {
    "version": 1,
    "trigger": { "id": "t1", "kind": "trigger", "type": "no_visit_days", "config": { "days": 30 } },
    "conditions": [
      { "id": "c1", "kind": "condition", "type": "marketing_opted_in", "config": {} },
      { "id": "c2", "kind": "condition", "type": "has_phone", "config": {} }
    ],
    "actions": [
      { "id": "a1", "kind": "action", "type": "issue_voucher", "config": { "name": "Come back", "discountPercent": 20, "expiryDays": 14 } },
      { "id": "a2", "kind": "action", "type": "send_whatsapp", "config": {
        "template": {
          "headerType": "none", "headerText": "", "headerImageUrl": null,
          "body": "Hi {name}, we miss you at {merchant}! Use code {code} for 20% off. Reply STOP to opt out.",
          "footer": "", "includeOptOut": true, "buttons": []
        }
      }}
    ],
    "elseActions": []
  }
}
EOF
)
winback_resp=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" -d "$winback_body")
winback_id=$(json_field "$winback_resp" "id" 2>/dev/null || true)
[ -n "$winback_id" ] && pass "Create WhatsApp winback ($winback_id)" || fail "Winback create failed: $winback_resp"

# --- Create banner (can go live without Meta) ---
banner_body=$(cat <<EOF
{
  "name": "$NAME_BANNER",
  "channel": "banner",
  "status": "draft",
  "workflow": {
    "version": 1,
    "trigger": { "id": "t1", "kind": "trigger", "type": "storefront_opened", "config": {} },
    "conditions": [
      { "id": "c1", "kind": "condition", "type": "day_of_week", "config": { "days": "weekend" } }
    ],
    "actions": [
      { "id": "a1", "kind": "action", "type": "show_banner", "config": {
        "title": "Smoke weekend special",
        "text": "20% off this Sat–Sun",
        "imageUrl": null,
        "linkUrl": ""
      }}
    ],
    "elseActions": []
  }
}
EOF
)
banner_resp=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" -d "$banner_body")
banner_id=$(json_field "$banner_resp" "id" 2>/dev/null || true)
[ -n "$banner_id" ] && pass "Create banner campaign ($banner_id)" || fail "Banner create failed: $banner_resp"

# --- SMS create must be rejected (channel paused) ---
sms_reject=$(curl -s -o /tmp/irewards-sms-reject.json -w "%{http_code}" -b "$COOKIE_JAR" -X POST \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke SMS rejected","channel":"sms","status":"draft"}')
[ "$sms_reject" = "400" ] || [ "$sms_reject" = "422" ] \
  && pass "SMS create rejected ($sms_reject)" \
  || fail "Expected SMS create to fail, got $sms_reject: $(cat /tmp/irewards-sms-reject.json)"

# --- List includes the three created campaigns ---
list_after=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns")
found=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const names = new Set((d.campaigns || []).map(c => c.name));
  const want = [process.argv[2], process.argv[3], process.argv[4]];
  const missing = want.filter(n => !names.has(n));
  if (missing.length) { console.error(missing.join(',')); process.exit(1); }
  console.log(want.length);
" "$list_after" "$NAME_WELCOME" "$NAME_WINBACK" "$NAME_BANNER" 2>/dev/null || true)
[ -n "$found" ] && pass "List includes all 3 smoke campaigns" || fail "Missing smoke campaigns in list"

# --- Banner go live ---
live_code=$(curl -s -o /tmp/irewards-banner-live.json -w "%{http_code}" -b "$COOKIE_JAR" -X PATCH \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"$banner_id\",\"status\":\"active\"}")
[ "$live_code" = "200" ] && pass "Banner go live ($live_code)" || fail "Banner go live expected 200 got $live_code: $(cat /tmp/irewards-banner-live.json)"

# --- WhatsApp go live blocked without Meta ---
wa_live=$(curl -s -o /tmp/irewards-wa-live.json -w "%{http_code}" -b "$COOKIE_JAR" -X PATCH \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"$welcome_id\",\"status\":\"active\"}")
[ "$wa_live" = "409" ] && pass "WhatsApp go-live blocked without Meta (409)" || fail "Expected 409 for WA go-live, got $wa_live: $(cat /tmp/irewards-wa-live.json)"

# --- Pause banner ---
pause_code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X PATCH \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"$banner_id\",\"status\":\"paused\"}")
[ "$pause_code" = "200" ] && pass "Banner pause ($pause_code)" || fail "Banner pause expected 200 got $pause_code"

# --- Campaign ↔ voucher coupling ---
# Winback create should auto-create a linked promo (even as draft).
promos_list=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/promos")
linked_promo=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const p = (d.promos || []).find(x => x.campaignId === process.argv[2] && x.active);
  if (!p) process.exit(1);
  console.log(JSON.stringify({ id: p.id, code: p.code }));
" "$promos_list" "$winback_id" 2>/dev/null || true)
[ -n "$linked_promo" ] && pass "Winback auto-created linked voucher ($(json_field "$linked_promo" "code"))" \
  || fail "Expected linked active promo for winback $winback_id: $promos_list"

promo_id=$(json_field "$linked_promo" "id")

# Draft-linked voucher can be revoked (campaign not live).
revoke_draft=$(curl -s -o /tmp/irewards-revoke-draft.json -w "%{http_code}" -b "$COOKIE_JAR" -X PATCH \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/promos" \
  -H "Content-Type: application/json" \
  -d "{\"promoId\":\"$promo_id\",\"active\":false}")
[ "$revoke_draft" = "200" ] && pass "Revoke draft-campaign voucher allowed ($revoke_draft)" \
  || fail "Expected 200 revoking draft-linked promo, got $revoke_draft: $(cat /tmp/irewards-revoke-draft.json)"

# Re-saving the winback workflow must reactivate the promo.
resync=$(curl -s -o /tmp/irewards-resync.json -w "%{http_code}" -b "$COOKIE_JAR" -X PATCH \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"$winback_id\",\"workflow\":$(node -e "
    const d=JSON.parse(process.argv[1]);
    const c=(d.campaigns||[]).find(x=>x.id===process.argv[2]);
    if(!c?.workflow) process.exit(1);
    console.log(JSON.stringify(c.workflow));
  " "$list_after" "$winback_id")}")
[ "$resync" = "200" ] && pass "Re-save winback re-ensures voucher ($resync)" \
  || fail "Winback re-save expected 200 got $resync: $(cat /tmp/irewards-resync.json)"

after_resync=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/promos")
reactivated=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const p = (d.promos || []).find(x => x.campaignId === process.argv[2] && x.active);
  if (!p) process.exit(1);
  console.log(p.code);
" "$after_resync" "$winback_id" 2>/dev/null || true)
[ -n "$reactivated" ] && pass "Winback voucher active again ($reactivated)" \
  || fail "Expected active linked promo after re-save for $winback_id"

# Live revoke guard without Meta: banner campaign that also issues a voucher.
NAME_VB="Smoke Voucher Banner $SUFFIX"
vb_body=$(cat <<EOF
{
  "name": "$NAME_VB",
  "channel": "banner",
  "status": "draft",
  "workflow": {
    "version": 1,
    "trigger": { "id": "t1", "kind": "trigger", "type": "storefront_opened", "config": {} },
    "conditions": [],
    "actions": [
      { "id": "a1", "kind": "action", "type": "issue_voucher", "config": { "name": "SmokePerk", "discountPercent": 15, "expiryDays": 7 } },
      { "id": "a2", "kind": "action", "type": "show_banner", "config": {
        "title": "Smoke 15% off",
        "text": "Ask staff for your member code",
        "imageUrl": null,
        "linkUrl": ""
      }}
    ],
    "elseActions": []
  }
}
EOF
)
vb_resp=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" -d "$vb_body")
vb_id=$(json_field "$vb_resp" "id" 2>/dev/null || true)
[ -n "$vb_id" ] && pass "Create voucher-banner campaign ($vb_id)" || fail "Voucher-banner create failed: $vb_resp"

vb_live=$(curl -s -o /tmp/irewards-vb-live.json -w "%{http_code}" -b "$COOKIE_JAR" -X PATCH \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"$vb_id\",\"status\":\"active\"}")
[ "$vb_live" = "200" ] && pass "Voucher-banner go live ($vb_live)" \
  || fail "Voucher-banner go live expected 200 got $vb_live: $(cat /tmp/irewards-vb-live.json)"

vb_promos=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/promos")
vb_promo=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const p = (d.promos || []).find(x => x.campaignId === process.argv[2] && x.active);
  if (!p) process.exit(1);
  console.log(JSON.stringify({ id: p.id, code: p.code }));
" "$vb_promos" "$vb_id" 2>/dev/null || true)
[ -n "$vb_promo" ] && pass "Live voucher-banner has linked promo ($(json_field "$vb_promo" "code"))" \
  || fail "Expected linked promo for live voucher-banner $vb_id"
vb_promo_id=$(json_field "$vb_promo" "id")

revoke_live=$(curl -s -o /tmp/irewards-revoke-live.json -w "%{http_code}" -b "$COOKIE_JAR" -X PATCH \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/promos" \
  -H "Content-Type: application/json" \
  -d "{\"promoId\":\"$vb_promo_id\",\"active\":false}")
[ "$revoke_live" = "409" ] && pass "Revoke blocked while campaign live (409)" \
  || fail "Expected 409 revoking live-linked promo, got $revoke_live: $(cat /tmp/irewards-revoke-live.json)"

pause_both=$(curl -s -o /tmp/irewards-pause-both.json -w "%{http_code}" -b "$COOKIE_JAR" -X PATCH \
  "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns" \
  -H "Content-Type: application/json" \
  -d "{\"campaignId\":\"$vb_id\",\"status\":\"paused\",\"deactivateVoucher\":true}")
[ "$pause_both" = "200" ] && pass "Pause campaign + deactivate voucher ($pause_both)" \
  || fail "Pause both expected 200 got $pause_both: $(cat /tmp/irewards-pause-both.json)"

after_pause=$(auth "$BASE_URL/api/merchant/$MERCHANT_SLUG/promos")
vb_inactive=$(node -e "
  const d = JSON.parse(process.argv[1]);
  const p = (d.promos || []).find(x => x.id === process.argv[2]);
  if (!p || p.active) process.exit(1);
  console.log('ok');
" "$after_pause" "$vb_promo_id" 2>/dev/null || true)
[ "$vb_inactive" = "ok" ] && pass "Linked voucher deactivated after pause-both" \
  || fail "Expected promo $vb_promo_id inactive after pause-both"

# --- Public banner API ---
banner_pub=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/merchant/$MERCHANT_SLUG/campaigns/banner")
[ "$banner_pub" = "200" ] && pass "Public banner API ($banner_pub)" || fail "Public banner expected 200 got $banner_pub"

# --- Dashboard campaigns page ---
dash_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard/$MERCHANT_SLUG/campaigns")
[ "$dash_code" = "200" ] && pass "Dashboard campaigns page ($dash_code)" || fail "Dashboard campaigns expected 200 got $dash_code"

# --- Leave drafts paused/draft (cleanup soft) ---
pass "Smoke campaigns left as draft/paused (ids: $welcome_id, $winback_id, $banner_id, $vb_id)"

echo ""
echo "All campaign smoke tests passed."
