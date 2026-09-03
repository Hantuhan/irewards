# Menu preset kcal sources

Typical serving energy values shipped on cafe product presets. Merchants can edit after add. Values are only set when a trusted source supports them.

## Primary sources

1. **USDA FoodData Central** (Survey / FNDDS) — [fdc.nal.usda.gov](https://fdc.nal.usda.gov/)  
   Official US nutrient database. Per-100 g energy scaled to a typical cafe serving.
2. **Singapore Heart Foundation** common foods/drinks tables — [myheart.org.sg](https://www.myheart.org.sg/techniques/common-food-drinks-sauces-content/)  
   Figures aligned with Health Promotion Board (HPB) nutrient composition / iDAT guidance for SG/MY kopitiam drinks and hawker plates.
3. **HPB Singapore Food Insights Database** — [hpb.gov.sg SG FoodID](https://www.hpb.gov.sg/healthy-living/food-and-beverage/sgfoodid/)  
   Official SG composition database (formerly FOCOS).

## Values used (typical serving)

| Preset | kcal | Sugar (g) | Basis |
| --- | ---: | ---: | --- |
| Espresso | 5 | 0 | USDA FNDDS *Coffee, espresso* (fdcId 2710378) ≈ 9 kcal/100 g → ~30 g shot |
| Americano | 10 | 0 | Espresso + water (same USDA espresso base) |
| Latte | 155 | 15 | USDA FNDDS *Coffee, Latte* 43 kcal/100 g × 360 g (12 oz / small) |
| Cappuccino | 65 | 6 | USDA FNDDS *Coffee, Cappuccino* (fdcId 2710472) 27 kcal/100 g × 240 g (~8 oz) |
| Flat white | 120 | 11 | USDA latte density × ~280 g (smaller milk drink) |
| Mocha | 290 | — | Cafe mocha ≈ latte + chocolate; round typical whole-milk mocha serving |
| Pour-over | 5 | 0 | Black brew / espresso-range energy |
| Iced latte | 155 | 15 | Same USDA latte small serving |
| Kopi | 135 | 17.5 | Singapore Heart Foundation (HPB-aligned) |
| Kopi-O | 66 | — | HPB iDAT (reported via HPB-cited kopitiam drink tables) |
| Teh Tarik | 229 | 41 | Singapore Heart Foundation |
| Yuan Yang | 150 | — | Condensed-milk coffee–tea blend, mid-range of HPB kopi/teh cups |
| Orange juice | 120 | 21 | USDA *Orange juice, 100%* 47 kcal/100 g × 250 ml |
| Watermelon juice | 75 | 16 | USDA *Watermelon juice, 100%* 30 kcal/100 g × 250 ml |
| Lemonade | 115 | 29 | USDA *Lemonade, fruit juice drink* 46 kcal/100 g × 250 ml |
| Green apple juice | 115 | 24 | USDA apple-juice class ~46 kcal/100 g × 250 ml |
| Carrot juice | 95 | 16 | USDA carrot-juice class ~38–40 kcal/100 g × 250 ml |
| Gula Melaka / Pandan latte | 200 | 24 | USDA latte (155) + ~45 kcal flavoured syrup |
| Sea salt latte | 210 | 16 | USDA latte + light cream finish |
| Butter croissant | 230 | 6 | USDA *Croissant* 406 kcal/100 g × ~57 g piece |
| Pain au chocolat | 295 | 14 | USDA *Croissant, chocolate* 421 kcal/100 g × ~70 g |
| Chicken rice | 525 | — | Singapore Heart Foundation roasted chicken rice plate |
| Nasi lemak | 550 | — | SHF nasi lemak plate range (plain / with wing mid-point) |
| Mee goreng | 520 | — | SHF fried-noodle plate range |
| French fries (side) | 320 | — | USDA french-fries class, small share plate |
| Extra egg | 90 | — | USDA large egg ~72–90 kcal |
| Toast (2 slices) | 150 | — | USDA bread + butter, 2 slices |

## Auto-fill & Ask AI

When a merchant adds or edits a product and has not typed kcal by hand:

1. **Instant** — local trusted preset/keyword match (USDA / HPB) fills a quick value.
2. **AI** — after a short pause, DeepSeek refines kcal from the product name + description (`forceAi`, `/api/merchant/.../ai/menu-kcal`).
3. **Ask AI** — button re-runs AI and locks the value so auto won’t overwrite.

Manual edits are never overwritten.


