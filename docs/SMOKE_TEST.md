# iRewards smoke test & bug-fix runbook

Critical-path HTTP smoke for the full v1 product journey (QR → pay → join → member → return visit → campaigns). Use this doc when verifying local or staging before release.

Last updated: Sep 2026.

## Goal

1. Keep `npm run verify` green (typecheck, lint, build, core smoke).
2. Keep campaign smoke green (`npm run test:smoke:campaigns`).
3. Extend / assert loyalty and return-visit gaps listed below when they are missing from scripts.
4. Fix failures in priority order (see [Bug-fix priority](#bug-fix-priority)).

Out of scope for this pass: real CHIP/HitPay charges, live Meta send, stamp cards (v3), SMS (paused), browser/Playwright UI QA.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| InsForge | `npm run insforge:setup` (first time) or `npm run insforge:up` + `npm run db:migrate` |
| App | `npm run dev` → `http://localhost:3002` |
| Env | `.env.local` from `.env.example` — local: `PAYMENT_PROVIDER=dev`, WhatsApp skip flags on |
| Smoke credentials | `.env.smoke` from [`.env.smoke.example`](../.env.smoke.example) — never commit passwords |
| Override | `BASE_URL=...` for non-local targets |

Useful URLs:

- Merchant: `http://localhost:3002/dashboard/demo-cafe`
- Diner QR: `http://localhost:3002/m/demo-cafe/table/1`
- InsForge UI: `http://localhost:7230`

---

## Phase 0 — Environment check

```bash
npm install
# InsForge up + migrated if needed
npm run insforge:up   # or insforge:setup on a fresh machine
npm run db:migrate
npm run dev           # leave running on :3002
```

Confirm `.env.smoke` has at least:

- `SMOKE_OWNER_EMAIL` / `SMOKE_OWNER_PASSWORD`
- `PLATFORM_ADMIN_PASSWORD`
- Optional: `SMOKE_STAFF_EMAIL` / `SMOKE_STAFF_PASSWORD`

---

## Phase 1 — Baseline gate

Run in order. **Stop at the first failure**, fix, then re-run from that step.

```bash
npm run typecheck
npm run lint
npm run build
npm run test:smoke
npm run test:smoke:campaigns
```

Or:

```bash
npm run verify              # typecheck + lint + build + core smoke
npm run test:smoke:campaigns
```

Scripts:

| Script | Path | npm |
|--------|------|-----|
| Core smoke | [`scripts/smoke-test.sh`](../scripts/smoke-test.sh) | `npm run test` / `test:smoke` |
| Campaign smoke | [`scripts/smoke-campaigns.sh`](../scripts/smoke-campaigns.sh) | `npm run test:smoke:campaigns` |
| Full gate | — | `npm run verify` |

Note: campaign smoke is **not** part of `verify` today. Always run it separately until it is wired in.

---

## Phase 2 — Critical flow coverage

### Already covered by core smoke

- Public pages: landing, login, signup, storefront
- Storefront menu API
- Merchant + optional staff login
- Merchant APIs: settings, menu, orders, customers, analytics, campaigns, tables, reward-levels, reports, team
- Subdomain rewrite (`Host: demo-cafe.localhost`)
- Platform admin login + tenants
- Weak password rejected; signup provision + new dashboard
- Checkout → `dev-pay` → order `paid` → kitchen board → status patch → thank-you
- Dashboard pages (menu, rewards, customers, analytics, campaigns, tables, settings, reports)
- Promos API, campaign banner, customer session endpoint, kitchen SSE, automation cron

### Already covered by campaign smoke

- Create WhatsApp welcome / win-back + banner (draft)
- Reject SMS create
- Banner go-live
- WhatsApp go-live blocked without Meta (expect 409)
- Voucher link / revoke / pause rules
- Public banner + campaigns page

### Gaps to assert (extend smoke when missing)

Add to [`scripts/smoke-test.sh`](../scripts/smoke-test.sh) or a sibling `scripts/smoke-loyalty.sh` (then wire into `npm run test`):

| Gap | How to assert (HTTP) |
|-----|----------------------|
| Join token after pay | After `dev-pay`, `GET /api/orders/{id}` returns non-empty `joinToken` |
| Diner pages | `200` for `/m/{slug}/table/{id}/cart`, `/rewards`, `/profile` |
| Phone lookup | `POST /api/customer/join` — known vs unknown phone behavior |
| Member session | Session cookie after join path; `GET /api/customer/session` reflects member when applicable |
| Return visit checkout | Checkout with member session applies level discount; **rejects** client-supplied `customerId` |
| Reward levels | Merchant reward-levels API (already in loop) + public storefront rewards page `200` |
| WhatsApp join (dev) | Simulate Meta webhook / join claim with `JOIN-{token}` under skip-send → member + points |

Key implementation references:

- Order + join token: `src/app/api/orders/[orderId]/route.ts`
- Payment completion: `src/lib/services/payment-completion.ts`
- Join claim: `src/lib/services/loyalty-join.ts`, `src/app/api/webhooks/meta/route.ts`
- Customer join / session: `src/app/api/customer/join/route.ts`, `src/app/api/customer/session/route.ts`
- Checkout session binding: `src/app/api/orders/checkout/route.ts`

Optional gate improvement: include campaigns in `verify`, e.g. run both `test:smoke` and `test:smoke:campaigns`.

---

## Flow under test

```text
Scan QR storefront
  → Menu API
  → POST checkout
  → POST dev-pay
  → Kitchen board + status
  → joinToken on order
  → Thanks page 200
  → Simulated JOIN claim
  → Member session
  → Return checkout with session
Merchant APIs + dashboard pages
  → Campaign smoke
```

Product context: [`docs/PRODUCT_FLOW.md`](PRODUCT_FLOW.md), visual proposal: [`iRewards-Product-Flow.html`](../iRewards-Product-Flow.html).

---

## Bug-fix priority

When smoke fails, fix in this order:

1. **Blockers** — checkout / pay / kitchen / signup / auth
2. **Loyalty path** — join token missing, join claim, session binding
3. **Merchant dashboard** — API/page 500s (menu, orders, campaigns, etc.)
4. **Campaigns** — create / go-live guards (409 without Meta is expected and OK)
5. **Polish** — typecheck / lint only if they gate `verify`

Keep fixes minimal. Do not implement roadmap items (v2 promos-at-checkout, v3 stamps) during a smoke pass.

---

## Exit criteria

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Core smoke passes (including any new loyalty assertions once added)
- [ ] Campaign smoke passes
- [ ] Campaigns run as part of `verify`, or a documented one-liner runs both
- [ ] Bugs fixed during the pass are noted (commit messages / changelog if committing)

---

## Quick commands cheat sheet

```bash
# Full local gate (today)
npm run verify && npm run test:smoke:campaigns

# Smoke only against another host
BASE_URL=https://staging.example.com npm run test:smoke
BASE_URL=https://staging.example.com npm run test:smoke:campaigns
```
