# iRewards Product Requirements (PRD)

Last updated: 2026-09-02

## Vision

B2B SaaS for MY/SG F&B merchants: **table storefront** (order + pay) + **WhatsApp retention** (optional rewards). Two separate surfaces — merchant dashboard vs diner QR app.

## Design system: Zenith Structural Minimalist

All merchant admin and diner UI must follow the Stitch reference **Zenith Structural Minimalist** (`menu_management_with_category_controls`, `merchant_admin_dashboard`).

| Principle | Rule |
|-----------|------|
| Aesthetic | Japandi structural minimalism — flat, no shadows, no glass/neumorphism |
| Canvas | `#FBFBFB` base, `#FFFFFF` cards, `#111111` ink for primary actions |
| Borders | `1px #EEEEEE` only — depth via tonal layering, not elevation |
| Corners | **0px radius** on buttons, inputs, cards (circles only for status dots) |
| Typography | Hanken Grotesk headlines, Inter body, JetBrains Mono for data/IDs |
| Eyebrow | `10px`, bold, uppercase, `0.15em` tracking for section labels |
| Spacing | 4px grid; `48px` between major sections; max content width `1200px` |
| Navigation | Left sidebar, `2px` black active indicator; collapsible icon rail on desktop |

## Merchant dashboard — Menu & product management

Reference: `menu_management_with_category_controls` (Stitch).

### Layout

1. **Page header** — title “Menu & product management”, short description, right-aligned actions:
   - **Manage categories** (secondary outline)
   - **Add new product** (primary solid black)
2. **Filter bar** — white card with border:
   - Search input (bottom-border only)
   - Category tabs: underline style (`border-b-2`), “All items” + each category
   - **New category** link at end of tab row
3. **Product table** — single unified list (not per-category panels):
   - Columns: **Photo** (48×48 thumbnail), Product name + mono ID, Category, Price, Live toggle, Edit
   - Row hover: `#F5F5F5` background
   - Empty photo: `image_not_supported` placeholder icon
4. **Edit / add panel** — inline above table when editing:
   - **Photo upload** zone (120×120), JPEG/PNG/WebP, max 2 MB
   - Bottom-border inputs with eyebrow labels
   - Category select, price in sen, description, live checkbox

### Product photos

- Merchants upload photos per menu item from the edit panel.
- Stored at `public/uploads/menu/{merchantSlug}/` (URL saved in `menu_items.image_url`).
- Diner storefront shows photo in 96×96 tile when present; fallback icon otherwise.
- API: `POST /api/merchant/{slug}/menu/upload` (multipart `file`).

### Product tags

- Comma-separated tags on each item (e.g. `vegan`, `bestseller`, `spicy`).
- Stored in `menu_items.tags` (`text[]`).
- Shown as chips in merchant table and on diner storefront.

### Availability scheduling

Each product has an **availability mode**:

| Mode | Use case |
|------|----------|
| **Always** | Available whenever the item is live |
| **Weekly hours** | Recurring days + time window (e.g. Mon–Fri 09:00–22:00) |
| **Date & time range** | Limited-time specials (from/until datetime) |

- Merchant timezone: `merchants.timezone` (default `Asia/Kuala_Lumpur`).
- Storefront and checkout only show/allow items **available now** in that timezone.

### Categories

- API: `POST /api/merchant/{slug}/menu/categories` with `{ "label": "Coffee" }`.
- Auto-generated slug; appended sort order.

## Diner storefront

- Mobile-first, max width ~414px.
- Menu items with photo, name, description, price, add-to-cart.
- Separate from merchant dashboard — entry via table QR only.

## Auth & surfaces

| Surface | Route | Audience |
|---------|-------|----------|
| Merchant SaaS | `/dashboard/{slug}/*` | Logged-in merchant staff |
| Diner app | `/m/{slug}/table/{id}/*` | Anonymous until payment |
| Dev hub | `/demo` | Development only |

## Out of scope (v1)

- Smart upsell links column (Stitch mock) — planned v2
- POS integration
- Transaction commission billing

## Related docs

- [PRODUCT_FLOW.md](./PRODUCT_FLOW.md) — customer journey
- [../iReward Proposal](../iReward%20Proposal) — business case
- Stitch UI: `~/Downloads/stitch_irewards_multi_tenant_f_b_ecosystem/`
