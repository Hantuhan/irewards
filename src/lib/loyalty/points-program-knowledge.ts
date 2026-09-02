/**
 * iRewards points program — earn/burn model aligned with MY/SG F&B practice.
 * Used by the merchant AI agent so answers match production behaviour.
 */

export const POINTS_PROGRAM_KNOWLEDGE = `
## How iRewards points work (production rules)

### Who earns
- Only **iRewards members** (opt-in via WhatsApp after payment) earn points on orders.
- Points are credited **only after payment is verified** (webhook or dev-pay), never at cart time.
- Guests who skip WhatsApp join do not earn (but can still order).

### Earn formula (in order)
1. **Base points** = floor(order total in RM × points per RM), minimum **1 point** per paid order.
2. Apply the **best multiplier** from:
   - Member **tier multiplier** (Membership tab, e.g. Gold 1.5×)
   - Active **points rules** (Points rule tab, e.g. Monday 2×) — system uses the **highest** multiplier, not stacked multiplication of all rules.
3. Final earn = round(base × combined multiplier), minimum 1.

### Example earn
- Settings: 0.15 pts/RM, redeem 10 sen/pt (~1.5% back).
- Order RM 40, Silver tier 1.25×, active rule "Monday double points" 2× on Mondays.
- Base = floor(40 × 0.15) = 6 pts.
- Combined multiplier = max(1.25, 2) = **2×** → **12 points** earned.

### Redeem / burn
- Members redeem at **checkout** on the table storefront.
- **1 point = N sen off** (merchant sets N on Points tab, default 10 sen = RM 0.10).
- Discount = points redeemed × cents per point.
- Caps: cannot redeem more than **points balance** or more than **subtotal allows** (floor(subtotal ÷ cents per point)).
- Redeemed points are **deducted on payment completion** (ledger reason: points_redeemed).
- Tier **checkout discount %** stacks separately from points (applied before points discount in checkout).

### Industry benchmarks (MY/SG cafes)
- **Earn back**: ~1–2% of spend is typical for independents; 0.1 pt/RM @ 10 sen/pt = 1%.
- **Redeem**: 100–200 pts for RM 10–20 off is common; keep redeem value ≤ earn value over average visit frequency.
- **Rules**: Day-of-week boosts (e.g. Monday 2×) drive weekday traffic without changing base rate.
- **Tiers**: Higher tiers get earn multipliers + perks (birthday points, expiry per tier on Membership matrix).

### Where merchants configure (dashboard)
| Topic | Location |
|-------|----------|
| Base earn & redeem rate | iRewards program → **Points** |
| Monday double / conditional boosts | iRewards program → **Points rule** |
| Tier multipliers, birthday pts, expiry | iRewards program → **Membership** |
| Campaigns / WhatsApp | **Campaigns** & **Automation** |

### First join bonus
- +1 point on first WhatsApp join (one-time per customer).

### What the agent should do
- Use the merchant's **live settings** from context when calculating.
- Show step-by-step math for earn and redeem questions.
- Direct merchants to the correct tab; never suggest editing points in Store settings.
`;
