# Storefront pre-pay suggest strategy (rules)

Last updated: 2026-09-03

## What industry does

Across QSR kiosks, cafe mobile order, and digital checkout:

1. **Fill missing courses** — if the cart has food but no drink, offer a drink; food+drink already → dessert/side; never push a second drink when one is present ([Ordering.Tools](https://www.ordering.tools/en/features/ai-upsell), [Ordering.Tools guide](https://www.ordering.tools/en/blog/upsell-cross-sell-restaurants-guide)).
2. **Cart-value tiers** — low carts accept meal-completion adds; mid carts take snacks; **high carts get few or no pop-ups** (attach drops hard past ~USD 15) ([HDFocus kiosk tiering](https://www.hdfocusds.com/news/how-fast-food-restaurants-can-increase-average-85504386.html)).
3. **One–two suggestions, not five** — more prompts raise abandonment (~7% per forced popup in that report).
4. **Merchant pairings win when configured** — contextual “goes with X” beats generic grids ([INFI kiosk AOV](https://infi.us/7-ways-ai-raises-average-order-value-at-the-self-order-kiosk)).
5. **Personalization later** — usual order / co-purchase clustering lifts AOV further ([National Restaurant Association Online Ordering Report 2024](https://39641841.fs1.hubspotusercontent-na1.net/hubspotusercontent-na1/hubfs/39641841/Form%20Resources/Online%20Ordering%20Report%202024.pdf)); we keep that as merchant links + usual-order hints, not generative AI.

## iRewards rules (applied)

Priority:

1. Product upsell links on cart items (min/max cart rules)
2. Global upsell links
3. **Gap fill** by cart contents:
   - No drink → drink
   - Drink but no food/pastry → pastry / food
   - Food + drink → light dessert/side only if cart still under the “large” threshold
4. Cart large (≥ RM/SGD 45) → prefer **downsell** (light item) or skip if order already looks complete (has drink + food)
5. Cap: few product suggestions + few global cards; short diner copy only

Constants live in `src/lib/ai/store-intelligence.ts` (`CART_LARGE_CENTS`, `LIGHT_ITEM_MAX_CENTS`).
