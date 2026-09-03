# iRewards

Smart table storefront + WhatsApp retention for cafes and F&B merchants in Malaysia and Singapore.

## Stack

- **Next.js 15** — storefront + API routes
- **Docker** — production on [Zeabur](docs/ZEABUR.md) (`Dockerfile` + `zeabur-template.yaml`)
- **InsForge** — Postgres + API (local dev + Zeabur production stack)
- **Meta WhatsApp Cloud API** — inbound webhooks, outbound messages, template approvals
- **HitPay** — payment requests + webhooks (dev mode for local testing)

## Two surfaces (do not mix)

| Audience | Entry | Example |
|----------|--------|---------|
| **Merchant SaaS** | `/` → **Open merchant dashboard** | http://localhost:3002/dashboard/demo-cafe |
| **Diner storefront** | Table QR or cafe subdomain | http://localhost:3002/m/demo-cafe/table/1 · `http://demo-cafe.localhost:3002/` |
| **Multi-staff login** | `/login` | Up to 5 users per cafe (owner / manager / staff) |

Merchants configure menus, loyalty, and QR codes in the dashboard. Customers only see the mobile storefront after scanning a table QR (or opening the cafe subdomain).

Dev-only combined sitemap: http://localhost:3002/demo (not for production).

## Project structure

```
src/
  app/
    dashboard/[merchantSlug]/           # merchant SaaS console
    m/[merchantSlug]/table/[tableId]/   # diner storefront (QR)
    api/webhooks/                       # payments + meta (WhatsApp)
  lib/
    insforge/                           # InsForge SDK clients
    loyalty/
    payments/
    meta/                               # Graph API client + webhook signature
    whatsapp/                           # outbound sends + template approvals
infra/insforge/                         # dedicated InsForge Docker stack
insforge/migrations/                    # SQL schema + demo seed
docker-compose.yml                      # production app container
docker-compose.dev.yml                  # hot-reload dev container
```

## Quick start (local)

```bash
npm install
npm run insforge:setup   # dedicated InsForge on :7230 (first time)
npm run dev
```

- Merchant home: http://localhost:3002
- Merchant dashboard: http://localhost:3002/dashboard/demo-cafe
- Diner storefront (QR): http://localhost:3002/m/demo-cafe/table/1
- InsForge dashboard: http://localhost:7230

## Docker

```bash
# Dev (hot reload; InsForge on host :7230)
npm run docker:dev

# Production image
npm run docker:prod
```

Set `INSFORGE_URL=http://host.docker.internal:7230` in `.env.local` when InsForge runs on the host and the app runs in Docker.

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/orders/checkout` | Create pending order, return payment URL |
| `GET /api/orders/[orderId]` | Order status + WhatsApp join link |
| `POST /api/orders/[orderId]/dev-pay` | Simulate payment (dev mode only) |
| `POST /api/webhooks/payments` | Payment confirmed → join token + points |
| `GET/POST /api/webhooks/meta` | Meta verification handshake; `JOIN-{token}` → member + points; template review verdicts |

## Dev flow (no HitPay keys)

1. `PAYMENT_PROVIDER=dev` in `.env.local`
2. `npm run insforge:setup` then `npm run dev`
3. **Merchant:** open `/dashboard/demo-cafe` to configure tiers and tables  
4. **Diner test:** open `/m/demo-cafe/table/1` → add items → Pay
4. Thank-you page → **Simulate payment (dev)**
5. **Join iRewards on WhatsApp** → Meta webhook processes `JOIN-{token}`

## Merchant dashboard

Sign in at http://localhost:3002/login (use your merchant account — no demo credentials are published in the UI or docs).

- **Dashboard example:** http://localhost:3002/dashboard/demo-cafe

After `npm run db:migrate`, merchant features use the database (menu, orders, members, campaigns, analytics, tables, settings).

| Dashboard section | API |
|-------------------|-----|
| Orders board | `GET/PATCH /api/merchant/{slug}/orders` |
| Menu | `GET/PUT /api/merchant/{slug}/menu` |
| Menu photo upload | `POST /api/merchant/{slug}/menu/upload` |
| Menu categories | `POST /api/merchant/{slug}/menu/categories` |
| Members | `GET /api/merchant/{slug}/customers` |
| iRewards levels | `GET/PUT /api/merchant/{slug}/reward-levels` |
| Analytics | `GET /api/merchant/{slug}/analytics` |
| Campaigns | `GET/POST/PATCH /api/merchant/{slug}/campaigns` |
| Campaign send | `POST /api/merchant/{slug}/campaigns/send` |
| WhatsApp template approval | `GET/POST /api/merchant/{slug}/campaigns/whatsapp-template` |
| Promos | `GET/POST/PATCH /api/merchant/{slug}/promos` |
| Campaign banner (storefront) | `GET /api/merchant/{slug}/campaigns/banner` |
| Kitchen SSE | `GET /api/merchant/{slug}/orders/stream` |
| Automation cron | `POST /api/cron/automation` (Bearer `CRON_SECRET`) |
| Table QR | `GET/POST/DELETE /api/merchant/{slug}/tables` |
| Settings | `GET/PATCH /api/merchant/{slug}/settings` |

## iRewards levels (merchant dashboard)

Configure 5 lifetime-point tiers at:

- http://localhost:3002/dashboard/demo-cafe/rewards

Each level supports: name, point threshold, earn multiplier, perk description, and checkout discount %.

Public tier ladder API: `GET /api/merchant/{slug}/reward-levels`

## Product flow

1. Scan table QR → web storefront (no signup)
2. Order, upsell/downsell, pay
3. After verified payment → optional WhatsApp join (+1 point)
4. Members get vouchers, review nudges, churn win-back

## Security

- Points only after payment webhook confirms `paid`
- Join tokens single-use, tied to paid orders
- Validate Meta `X-Hub-Signature-256` (HMAC-SHA256 with `META_APP_SECRET`) on inbound webhooks
- Use `INSFORGE_API_KEY` only on server (webhooks, admin writes)

## Testing

With the app running (`npm run dev` or `npm run docker:dev`) and InsForge migrated:

```bash
npm run verify   # typecheck + lint + build + smoke tests
npm run test     # smoke tests only (merchant login, APIs, checkout, kitchen board, pages)
```

Smoke tests default to `http://localhost:3002`. Override with `BASE_URL=... npm run test`.

### Automation cron

Every automated journey is a campaign with a trigger (order paid, first visit, no visit for N days, points milestone, member opted in). The cron drains the job queue, runs the daily inactivity sweep and polls Meta for template verdicts:

```bash
# Every minute in production (external cron — Zeabur, cron-job.org, etc.)
CRON_SECRET=your-secret ./scripts/cron-automation.sh
```

Set `CRON_SECRET` in `.env.local`. The Campaigns overview has a master switch that pauses every journey that runs on its own; manual broadcasts are unaffected. SMS campaigns are paused for now — use WhatsApp instead.

## WhatsApp (Meta Cloud API)

Messaging runs directly on Meta's WhatsApp Business Platform — no Twilio.

1. In [Meta for Developers](https://developers.facebook.com) create an app of type **Business**, add the **WhatsApp** product and link (or create) a WhatsApp Business Account (WABA) with a verified phone number.
2. Create a **System User** in Business Manager with `whatsapp_business_messaging` and `whatsapp_business_management`, generate a permanent token and put it in `META_ACCESS_TOKEN`. Copy `META_WABA_ID`, `META_PHONE_NUMBER_ID`, `META_APP_ID` and `META_APP_SECRET` from the app settings.
3. Under **WhatsApp → Configuration** set the callback URL to `https://<your-domain>/api/webhooks/meta`, use `META_WEBHOOK_VERIFY_TOKEN` as the verify token, and subscribe to the `messages` and `message_template_status_update` fields.
4. Locally, keep `WHATSAPP_SKIP_SEND=true`: sends are logged, and template submissions are simulated (a "Check status" click approves them) so the full flow can be exercised without a WABA.

### Template approval (required for broadcasts)

Meta only delivers business-initiated messages (broadcasts, win-back, review nudges) as **approved message templates**; free-form text is limited to the 24-hour window after a member writes in.

- Every WhatsApp campaign carries its own template. In the workflow builder (**Campaigns → Edit campaign**) the **Meta approval** panel shows the state of the current copy: *Not submitted*, *Pending Meta review*, *Approved*, *Rejected* (with Meta's reason), or *Message changed since submission*.
- **Submit for approval** saves the draft, converts `{merchant}` / `{name}` / `{code}` into positional `{{1}}`… variables, uploads the banner image as an image header when one is set, and creates the template on the WABA under `MARKETING`. Each submission is versioned (`<campaign>_<id>_v<n>`) in the `whatsapp_templates` table.
- Verdicts arrive on the webhook (`message_template_status_update`); the automation cron also polls anything still pending, and the panel has a manual **Check status**.
- A campaign cannot go live, and a broadcast cannot be queued, until the *current* copy is approved. Editing the copy after approval requires a resubmission; sends keep using the last approved version only while it still matches.
- The sender picks the approved template automatically and fills the variables per member (store name, member name, promo code).

## Deploying on Zeabur (Docker)

Production runs on **Zeabur** (Docker) with **InsForge** as the database stack.

```bash
npm run zeabur:setup
npm run zeabur:template:deploy   # postgres + postgrest + insforge + app
```

Or deploy **app only** from GitHub if InsForge is already on Zeabur. Full guide: [docs/ZEABUR.md](docs/ZEABUR.md)

## DeepSeek AI (merchant assistant)

Add to `.env.local`:

```bash
DEEPSEEK_API_KEY=your-key
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

- **Setup agent** — full-page chat at `/dashboard/{slug}/assistant` (sidebar: **AI Assistant**). Answers earn/redeem math using your live tiers, rules, and rates.
- **Campaign copy** — `POST /api/merchant/{slug}/ai/campaign`
- **Store intelligence** — upsell suggestions on the diner menu via `POST /api/merchant/{slug}/ai/store-suggest`

### Points earn & redeem (how the system calculates)

| Step | Rule |
|------|------|
| **Earn** | `floor(RM × pts/RM)` min 1 pt, then × **max**(tier multiplier, matching points rule multiplier) |
| **When** | Only members, only after **verified payment** |
| **Redeem** | Checkout: `points × cents-per-point` off subtotal; capped by balance and subtotal |
| **Configure** | iRewards program → Points (base), Points rule (Monday 2×), Membership (tiers) |

Redemption now uses each merchant's `points_redeem_cents_per_point` from the Points tab (default 10 sen/pt ≈ 1% back at 0.1 pt/RM).

## Docs

- [docs/ZEABUR.md](docs/ZEABUR.md) — Zeabur + Supabase production deploy
- [docs/PRD.md](docs/PRD.md) — product requirements + Zenith UI spec (menu management)
- [docs/DOCKER.md](docs/DOCKER.md) — Docker + InsForge local setup
- [infra/insforge/README.md](infra/insforge/README.md) — dedicated InsForge stack
- [docs/PRODUCT_FLOW.md](docs/PRODUCT_FLOW.md) — customer journey
- [docs/SECURITY.md](docs/SECURITY.md) — anti-fraud checklist
- [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) — go-live gates

