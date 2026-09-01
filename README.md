# iRewards

Smart table storefront + WhatsApp retention for cafes and F&B merchants in Malaysia and Singapore.

## Stack

- **Next.js 15** — storefront + API routes
- **Docker** — local and production containers
- **InsForge** — dedicated Postgres + API (`infra/insforge/`)
- **Twilio** — WhatsApp webhooks and outbound messages
- **HitPay** — payment requests + webhooks (dev mode for local testing)

## Two surfaces (do not mix)

| Audience | Entry | Example |
|----------|--------|---------|
| **Merchant SaaS** | `/` → **Open merchant dashboard** | http://localhost:3002/dashboard/demo-cafe |
| **Diner storefront** | Table QR only | http://localhost:3002/m/demo-cafe/table/1 |

Merchants configure menus, loyalty, and QR codes in the dashboard. Customers only see the mobile storefront after scanning a table QR.

Dev-only combined sitemap: http://localhost:3002/demo (not for production).

## Project structure

```
src/
  app/
    dashboard/[merchantSlug]/           # merchant SaaS console
    m/[merchantSlug]/table/[tableId]/   # diner storefront (QR)
    api/webhooks/                       # payments + twilio
  lib/
    insforge/                           # InsForge SDK clients
    loyalty/
    payments/
    twilio/
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
| `POST /api/webhooks/twilio` | `JOIN-{token}` → member + points |

## Dev flow (no HitPay keys)

1. `PAYMENT_PROVIDER=dev` in `.env.local`
2. `npm run insforge:setup` then `npm run dev`
3. **Merchant:** open `/dashboard/demo-cafe` to configure tiers and tables  
4. **Diner test:** open `/m/demo-cafe/table/1` → add items → Pay
4. Thank-you page → **Simulate payment (dev)**
5. **Join iRewards on WhatsApp** → Twilio webhook processes `JOIN-{token}`

## Merchant dashboard

Sign in at http://localhost:3002/login

- **Demo login:** `owner@demo-cafe.com` / `demo123`
- **Dashboard:** http://localhost:3002/dashboard/demo-cafe

After `npm run db:migrate`, merchant features use the database (menu, orders, members, campaigns, automation, analytics, tables, settings).

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
| Automation | `GET/PATCH /api/merchant/{slug}/automation` |
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
- Validate Twilio `X-Twilio-Signature` on inbound webhooks
- Use `INSFORGE_API_KEY` only on server (webhooks, admin writes)

## Testing

With the app running (`npm run dev` or `npm run docker:dev`) and InsForge migrated:

```bash
npm run verify   # typecheck + lint + build + smoke tests
npm run test     # smoke tests only (merchant login, APIs, checkout, kitchen board, pages)
```

Smoke tests default to `http://localhost:3002`. Override with `BASE_URL=... npm run test`.

## Docs

- [docs/PRD.md](docs/PRD.md) — product requirements + Zenith UI spec (menu management)
- [docs/DOCKER.md](docs/DOCKER.md) — Docker + InsForge setup
- [infra/insforge/README.md](infra/insforge/README.md) — dedicated InsForge stack
- [docs/PRODUCT_FLOW.md](docs/PRODUCT_FLOW.md) — customer journey
- [docs/SECURITY.md](docs/SECURITY.md) — anti-fraud checklist
