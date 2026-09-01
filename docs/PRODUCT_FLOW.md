# Product Flow

## Implemented flow (v1)

1. Scan table QR → web storefront (`/m/demo-cafe/table/1`)
2. Add items → **Pay with DuitNow** → `POST /api/orders/checkout`
3. **Dev:** thank-you page → simulate payment  
   **Prod:** redirect to HitPay → webhook marks order paid
4. Server creates **join token** (single-use, 30 min) — points only after verified payment
5. Thank-you page shows **Join iRewards on WhatsApp** (`JOIN-{token}`)
6. Twilio webhook → member created → +1 first join + order points (with level multiplier)

## Return visit

1. Scan QR → personalized storefront (when member recognition is added)
2. Pay → iRewards level discount applied if `customerId` known; multiplied points if already a member

## Loyalty (phased)

| Phase | Features |
|-------|----------|
| v1 ✅ | Points + join token + WhatsApp join |
| v1.5 ✅ | **5 iRewards levels** — merchant-configurable thresholds, multipliers, perks, checkout discounts |
| v2 | Promos at checkout, redeem points |
| v3 | Digital stamp cards |

### iRewards levels (v1.5)

- Merchants configure **5 levels** at `/m/{slug}/admin/rewards`
- Progression: **lifetime points earned** (never decreases when points are redeemed later)
- Each level: name, min points, points multiplier, perk text, checkout discount %
- Storefront shows the tier ladder; thank-you and WhatsApp show the member's current level

Points are never awarded before payment is confirmed server-side.
