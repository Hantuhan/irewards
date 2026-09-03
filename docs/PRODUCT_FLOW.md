# Product Flow

## Implemented flow (v1 → production)

1. Scan table QR → web storefront (`/m/{slug}/table/{n}`)
2. Add items → checkout → `POST /api/orders/checkout`
3. **Dev:** thank-you page → simulate payment  
   **Prod:** HitPay redirect → webhook marks order paid
4. Server creates **join token** (single-use, ~30 min) — points only after verified payment
5. Thank-you page shows **Join iRewards on WhatsApp** (`JOIN-{token}`)
6. Meta WhatsApp webhook → member created (token claimed atomically) → first-join + order points

## Return visit

1. Scan QR → storefront
2. Soft recognition: diner can look up by phone (lookup-only; no silent account create)
3. Member session binds only after a **paid** order with matching `customer_id`
4. Checkout ignores client-supplied customer ids; uses signed member session only
5. Level discount + multiplied points when the session member is known

## Campaigns & retention (WhatsApp + banner)

- Merchants build journeys in **Campaigns** (template-first create, visual workflow)
- Channels: **WhatsApp** and **in-app banner** (SMS paused / not creatable)
- Default retention journeys (paused until Meta templates approved): bounce-back, review nudge, win-back (**7 days** inactive)
- Quiet hours + 48h member send cap
- Review replies: **5** → Google review link (`merchants.google_url`); **1–4** → private thank-you + stored in `member_feedback` (Members admin “Needs follow-up”)

## Loyalty

| Phase | Features |
|-------|----------|
| v1 ✅ | Points + join token + WhatsApp join |
| v1.5 ✅ | **5 iRewards levels** — merchant-configurable thresholds, multipliers, perks, checkout discounts |
| Campaigns ✅ | WhatsApp / banner workflows, Meta template approval, analytics |
| v2 | Promos at checkout, redeem points |
| v3 | Digital stamp cards |

### iRewards levels

- Configure at `/m/{slug}/admin/rewards`
- Progression: **lifetime points earned**
- Storefront shows tier ladder; thank-you and WhatsApp show current level

Points are never awarded before payment is confirmed server-side.
