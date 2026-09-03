import type { CatalogTemplate } from "@/lib/menu/catalog-templates/types";

/**
 * Kura Kitchen — artisanal cafe catalog (41 products, 10 categories).
 *
 * Generated from the Stitch "StoreFront Detail" design set: every product carries
 * a hero photo, detail-page template slots (eyebrow, hero caption, spec stats,
 * kitchen-note prompt), customisation groups, allergen chips, badges and pairings.
 * Photos live in /public/catalog/kura-kitchen/.
 */
export const KURA_KITCHEN_TEMPLATE: CatalogTemplate = {
  id: "kura-kitchen",
  name: "Kura Kitchen",
  description: "Artisanal cafe catalog: specialty coffee, teas, all-day breakfast, mains, pasta & pizza, soups, local favourites and desserts — with photos, customisations and allergen chips.",
  currency: "MYR",
  categories: [
    {
      slug: "coffee",
      label: "Coffee",
    },
    {
      slug: "tea",
      label: "Tea",
    },
    {
      slug: "cold-drinks",
      label: "Cold Drinks",
    },
    {
      slug: "breakfast",
      label: "Breakfast",
    },
    {
      slug: "mains",
      label: "Mains",
    },
    {
      slug: "pasta-pizza",
      label: "Pasta & Pizza",
    },
    {
      slug: "soups-salads",
      label: "Soups & Salads",
    },
    {
      slug: "local-favourites",
      label: "Local Favourites",
    },
    {
      slug: "sides-snacks",
      label: "Sides & Snacks",
    },
    {
      slug: "desserts-pastries",
      label: "Desserts & Pastries",
    },
  ],
  badges: [
    {
      id: "chef_recommended",
      label: "Chef Recommended",
      icon: "restaurant",
    },
    {
      id: "best_selling",
      label: "Best Selling",
      icon: "trending_up",
    },
    {
      id: "limited_time_offer",
      label: "Limited Time Offer",
      icon: "schedule",
    },
    {
      id: "signature",
      label: "Signature",
      icon: "star",
    },
    {
      id: "made_to_order",
      label: "Made to Order",
      icon: "local_fire_department",
    },
    {
      id: "fresh_daily",
      label: "Fresh Daily",
      icon: "verified",
    },
    {
      id: "organic",
      label: "Organic",
      icon: "eco",
    },
    {
      id: "seasonal",
      label: "Seasonal",
      icon: "favorite",
    },
  ],
  ingredientPresets: [
    {
      id: "contains_gluten",
      label: "Contains gluten",
      group: "Allergens",
    },
    {
      id: "contains_sesame",
      label: "Contains sesame",
      group: "Allergens",
    },
    {
      id: "contains_soy",
      label: "Contains soy",
      group: "Allergens",
    },
    {
      id: "contains_fish",
      label: "Contains fish",
      group: "Allergens",
    },
    {
      id: "contains_coconut",
      label: "Contains coconut",
      group: "Allergens",
    },
    {
      id: "contains_alcohol",
      label: "Contains alcohol",
      group: "Warnings",
    },
    {
      id: "contains_caffeine",
      label: "Contains caffeine",
      group: "Warnings",
    },
    {
      id: "vegetarian",
      label: "Vegetarian",
      group: "Dietary",
    },
    {
      id: "dairy_free",
      label: "Dairy-free",
      group: "Dietary",
    },
    {
      id: "nut_free",
      label: "Nut-free",
      group: "Dietary",
    },
    {
      id: "caffeine_free",
      label: "Caffeine-free",
      group: "Dietary",
    },
    {
      id: "pescatarian",
      label: "Pescatarian",
      group: "Dietary",
    },
    {
      id: "no_added_sugar",
      label: "No added sugar",
      group: "Dietary",
    },
  ],
  products: [
    {
      slug: "cafe-latte",
      categorySlug: "coffee",
      name: "Cafe Latte",
      description: "Double shot of house-roasted single origin espresso pulled over velvety micro-foamed fresh milk with silky latte art. Rich chocolatey and hazelnut notes.",
      priceCents: 1200,
      imageUrl: "/catalog/kura-kitchen/cafe-latte.jpg",
      badgeIds: ["best_selling"],
      ingredientIds: ["contains_dairy", "contains_caffeine", "vegetarian"],
      kcal: 150,
      detail: {
        eyebrow: "Specialty Coffee",
        heroNote: "Extracted to order",
        stats: [
          {
            label: "Prep Time",
            value: "~4 mins",
          },
        ],
        notesPlaceholder: "e.g., extra hot 68°C, oat foam on top",
      },
      modifierGroups: [
        {
          name: "Serving Temperature",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Hot",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Iced",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Espresso Roast / Bean",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Signature House Blend",
              description: "Brazil Cerrado & Guatemala · Dark cocoa, toasted almond",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Single Origin Colombia Geisha Micro-lot",
              description: "Finca El Paraiso · Bergamot, jasmine florals, peach sweetness",
              priceDeltaCents: 400,
              isDefault: false,
            },
          ],
        },
        {
          name: "Milk Selection",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Fresh Whole Milk",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Oat Milk",
              description: "Oatly Barista",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Almond Milk (Unsweetened)",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Organic Soy Milk",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Skim Milk (0.1% Fat)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sweetness & Flavors",
          required: false,
          minSelect: 0,
          maxSelect: 1,
          options: [
            {
              name: "Regular",
              description: "100%",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Less Sweet",
              description: "50%",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "No Syrup",
              description: "0% Sugar",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Madagascar Bourbon Vanilla",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Artisanal Sea Salt Caramel",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Espresso Extraction",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Double Shot (Standard)",
              description: "18g dry in / 36g espresso liquid yield",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Triple Shot (Extra Strength)",
              description: "+1 espresso shot for bold intensity",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Swiss Water Decaf",
              description: "99.9% caffeine-free organic process",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant"],
    },
    {
      slug: "caffe-americano",
      categorySlug: "coffee",
      name: "Caffe Americano",
      description: "Double shot of freshly extracted espresso poured over hot filtered water, preserving the delicate aromatics, sweet floral notes, and a golden crema layer.",
      priceCents: 1000,
      imageUrl: "/catalog/kura-kitchen/caffe-americano.jpg",
      ingredientIds: ["contains_caffeine", "vegan", "no_added_sugar"],
      kcal: 10,
      detail: {
        eyebrow: "Coffee · House Pour",
        heroNote: "Extracted to order",
        heroNoteRight: "Single origin available",
        stats: [
          {
            label: "Prep Time",
            value: "4–6 mins",
          },
        ],
        notesPlaceholder: "e.g. Extra hot water on side, less ice, or separate cup...",
      },
      modifierGroups: [
        {
          name: "Temperature Selection",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Hot",
              description: "Served at 68°C · Standard",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Iced",
              description: "Pure Ice Cube",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Espresso Roast Profile",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Signature House Blend",
              description: "Rich body with tasting notes of dark chocolate, roasted hazelnut & brown sugar finish.",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Single Origin Ethiopian Yirgacheffe Micro-Lot",
              description: "Light-medium roast, vibrant floral jasmine fragrance, citrus bergamot, clean sweet finish.",
              priceDeltaCents: 250,
              isDefault: false,
            },
          ],
        },
        {
          name: "Strength & Extraction",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Single",
              description: "Light Body",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Double Shot",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Shot",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sweetness Level",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Unsweetened",
              description: "0%",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Less Sweet",
              description: "50%",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Normal Sweet",
              description: "100%",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Raw Honey",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Add-ons & Dairy / Alternative Options",
          required: false,
          minSelect: 0,
          maxSelect: 1,
          options: [
            {
              name: "None (Black Americano)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Splash of Fresh Whole Milk",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Splash of Barista Oat Milk (Plant-based)",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant", "vanilla-pistachio-gelato"],
    },
    {
      slug: "long-black",
      categorySlug: "coffee",
      name: "Long Black",
      description: "Double shot of our house signature seasonal blend (Ethiopia Yirgacheffe & Colombia Huila) extracted directly over hot micro-filtered water. Notes of dark cacao, delicate jasmine florals, and bergamot citrus crowned with an unctuous golden crema.",
      priceCents: 1200,
      imageUrl: "/catalog/kura-kitchen/long-black.jpg",
      ingredientIds: ["contains_caffeine", "vegan", "no_added_sugar"],
      kcal: 8,
      detail: {
        eyebrow: "Craft Espresso Extraction",
        heroNote: "Extracted to order",
        stats: [
          {
            label: "Prep Time",
            value: "3–5 mins",
          },
        ],
        notesPlaceholder: "e.g. extra crema, half water, room for milk...",
      },
      modifierGroups: [
        {
          name: "Serving Style",
          description: "Select temperature & presentation",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Hot (Original Extraction ~75°C)",
              description: "Optimal crema integrity & thermal clarity",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Over Artisanal Hand-Carved Ice",
              description: "Slow-melt crystal ice block in chilled glass",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Bean Roast & Origin",
          description: "Select your single batch coffee beans",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Seasonal Blend",
              description: "Ethiopia & Colombia · Balanced, Floral, Cacao (House)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Single Origin Reserve",
              description: "Panama Geisha Washed · Bergamot & White Peach (Micro-Lot)",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Swiss Water Decaf",
              description: "Brazil Cerrado · Cocoa & Roasted Hazelnuts",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Extraction & Water Ratio",
          description: "Barista shot calibration",
          required: false,
          minSelect: 0,
          maxSelect: 1,
          options: [
            {
              name: "Standard Australian Long Black",
              description: "60ml espresso pulled over 120ml hot filtered water",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Short Long Black / Dense Crema",
              description: "60ml espresso over 80ml water for intensified body",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra Hot Water on Side",
              description: "Served in individual stainless steel pouring beaker",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Add-ons & Accompaniments",
          description: "Select multiple items",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Extra Single Espresso Shot",
              description: "+30ml extraction yield",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Pour of Steamed Oat Milk on Side",
              description: "Oatly Barista Edition (60ml jug)",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Artisanal Raw Honey",
              description: "Wild rainforest blossom nectar pot",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Cantuccini Almond Biscotti (1 pc)",
              description: "Traditional Tuscan twice-baked cookie",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant", "basque-burnt-cheesecake"],
    },
    {
      slug: "einspanner",
      categorySlug: "coffee",
      name: "Smoked Madagascar Vanilla Cold Foam Einspänner",
      description: "A bespoke dual-temperature composition. Chilled double ristretto layered beneath hand-aerated sea salt cold foam, infused with real Madagascar bourbon vanilla pods and finished with torched demerara crystals.",
      priceCents: 1600,
      imageUrl: "/catalog/kura-kitchen/einspanner.jpg",
      badgeIds: ["seasonal", "signature"],
      ingredientIds: ["contains_dairy", "contains_caffeine", "vegetarian"],
      kcal: 210,
      detail: {
        eyebrow: "Signature Craft Coffee · Limited Batch",
        heroNote: "Extracted to order",
        stats: [
          {
            label: "Prep Time",
            value: "3–5 mins",
          },
          {
            label: "Roast Profile",
            value: "Medium-Light",
          },
        ],
        notesPlaceholder: "E.g., Extra chilled glass, separate foam spoon, or dairy allergies...",
      },
      modifierGroups: [
        {
          name: "Base & Espresso Roast",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Double Ristretto - Pink Bourbon (Huila)",
              description: "Balanced acidity, vibrant stone fruit finish",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Cold Drip Reserve (18-Hour Slow Extraction)",
              description: "Deep molasses, extremely smooth mouthfeel",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Decaf Swiss Water Process",
              description: "100% chemical-free decaffeination",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Milk Base & Dairy Alternatives",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Oatly Barista Edition Oat Milk",
              description: "Barista Pick · Silky micro-foam, neutral roasted oat notes",
              priceDeltaCents: 300,
              isDefault: true,
            },
            {
              name: "Full Cream Farmhouse Milk",
              description: "Locally sourced, rich natural sweetness",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Califia Farms Almond Milk",
              description: "Light body, subtle nutty undertones",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Bonsoy Organic Soy Milk",
              description: "Creamy Japanese whole organic soybeans",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Foam & Cloud Customization",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Sea Salt Cream Cold Foam (Standard)",
              description: "Whipping cream whipped with Cornish sea salt",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Double Thick Foam Layer",
              description: "+50% generous aeration volume",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Dusting: Single Origin Cocoa Nibs & Maldon Flakes",
              description: "Aromatic crunchy texture on top foam",
              priceDeltaCents: 100,
              isDefault: true,
            },
            {
              name: "Torched Raw Demerara Sugar Crust",
              description: "Brûléed sugar layer cracked tableside",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Raw Cane & Vanilla Sweetness",
          description: "Sweetness & Temperature",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Less (50%)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Standard (100%)",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "None (0%)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Extraction Temperature & Ice Style",
          description: "Sweetness & Temperature",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Chilled with Clear Ice Sphere",
              description: "Slow Dilution",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "No Ice (Cold Extraction Only)",
              description: "Pure Essence",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Warm Cream Layer over Hot Ristretto",
              description: "Classic Vienna",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant"],
    },
    {
      slug: "spanish-latte",
      categorySlug: "coffee",
      name: "Spanish Latte",
      description: "Slow-extracted double ristretto over a delicate bed of sweetened Spanish condensed milk, textured silky microfoam, and artisanal steamed dairy. Balanced notes of caramelized dulce de leche, toasted hazelnut, and dark cocoa praline.",
      priceCents: 1600,
      imageUrl: "/catalog/kura-kitchen/spanish-latte.jpg",
      badgeIds: ["signature"],
      ingredientIds: ["contains_dairy", "contains_caffeine", "vegetarian"],
      kcal: 220,
      detail: {
        eyebrow: "Specialty Coffee Lab · Signature Creation",
        heroNote: "Specialty roast · double ristretto",
        stats: [
          {
            label: "Prep Time",
            value: "3–5 mins",
          },
          {
            label: "Roast",
            value: "Medium Light · Floral",
          },
        ],
        notesPlaceholder: "E.g., Extra hot cup, less ice, warm saucer, oat milk on side...",
      },
      modifierGroups: [
        {
          name: "Espresso Blend & Bean Lot",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "House Benchmark Blend",
              description: "Guatemala & Colombia — Notes of Dark Chocolate & Roasted Pecan",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Single Origin Ethiopia Yirgacheffe",
              description: "Floral Bergamot, Meyer Lemon curd, candied citrus aroma",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Swiss Water Decaf Organic Lot",
              description: "Mellow Stonefruit, Raw Honeycomb · 99.9% Caffeine-Free",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Serving Style & Temperature",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Iced over Crystal Clear Ice Block",
              description: "Signature 3-layer vertical ombre presentation in highball glassware",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Steamed Hot 65°C Microfoam",
              description: "Optimal milk sweetness with handcrafted Rosetta latte art in ceramic cup",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra Hot 72°C",
              description: "Sustained warmth and rich persistent crema profile",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dairy & Plant-Based Milk Sub",
          required: false,
          minSelect: 0,
          maxSelect: 1,
          options: [
            {
              name: "Fresh Jersey Farmhouse Whole Milk",
              description: "Creamy, 4.2% butterfat standard",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Oatly Barista Edition Oat Milk",
              description: "Velvety cereal richness, 100% dairy-free",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Housemade Roasted Almond Mylk",
              description: "Cold-pressed, unflavored, sugar-free",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Japanese Hokkaido 3.6 Fresh Milk",
              description: "Ultra rich, decadent natural sweetness",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sweetness & Condensed Milk",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Signature Sweetness",
              description: "100% Spanish Dulce",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Light Sweetness",
              description: "50% Artisan Touch",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Quarter Sweet",
              description: "25% Subtle Hint",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Unsweetened",
              description: "Pure Flat White",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Barista Accompaniments",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Extra Single Ristretto Shot",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Madagascar Bourbon Vanilla Cold Foam Cap",
              description: "Velvety whipped cloud topper",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Serve ice on the side in separate beaker",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra cup & saucer for sharing",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["basque-burnt-cheesecake"],
    },
    {
      slug: "v60-pour-over",
      categorySlug: "coffee",
      name: "Specialty V60 Pour Over",
      description: "Single-origin filter coffee hand-poured through a V60 for a clean, bright cup. Rotating seasonal lots from Ethiopia and Colombia.",
      priceCents: 1500,
      imageUrl: "/catalog/kura-kitchen/v60-pour-over.jpg",
      badgeIds: ["made_to_order"],
      ingredientIds: ["contains_caffeine", "vegan", "no_added_sugar"],
      kcal: 5,
      detail: {
        eyebrow: "Specialty Coffee · Slow Bar",
        heroNote: "Hand-poured to order",
        heroNoteRight: "Single origin",
        stats: [
          {
            label: "Prep Time",
            value: "5–7 mins",
          },
          {
            label: "Brew Ratio",
            value: "1:16 · 15g",
          },
        ],
        notesPlaceholder: "e.g. serve in a warmed cup, room for milk...",
      },
      modifierGroups: [
        {
          name: "Bean Selection",
          description: "Today's rotating lots",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Ethiopia Yirgacheffe (Washed)",
              description: "Floral, bergamot, stone fruit",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Colombia Huila (Natural)",
              description: "Red berries, cacao",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Decaf Swiss Water",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Serving Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Hot in Ceramic Cup",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Flash-Chilled over Ice",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Add-Ons",
          required: false,
          minSelect: 0,
          maxSelect: 2,
          options: [
            {
              name: "Iced Matcha Side (Ceremonial Uji)",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Cantuccini Almond Biscotti (1 pc)",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant", "basque-burnt-cheesecake"],
    },
    {
      slug: "kopi-o",
      categorySlug: "coffee",
      name: "Traditional Hainanese Kopi O",
      description: "Signature slow-dripped Liberica & Robusta beans caramelized with butter and roasted barley over charcoal. Deep, smoky aromatic profile with a velvety dark body and lingering bittersweet finish.",
      priceCents: 480,
      imageUrl: "/catalog/kura-kitchen/kopi-o.jpg",
      badgeIds: ["signature"],
      ingredientIds: ["contains_caffeine", "vegan", "halal"],
      kcal: 60,
      detail: {
        eyebrow: "Nanyang Heritage · Robusta Blend",
        heroNote: "Flannel-pulled to order",
        heroNoteRight: "Nanyang roast",
        stats: [
          {
            label: "Prep Time",
            value: "3–5 mins",
          },
          {
            label: "Roast",
            value: "Dark Butter",
          },
        ],
        notesPlaceholder: "e.g., Serve extra piping hot in saucer, less ice...",
      },
      modifierGroups: [
        {
          name: "Roast & Intensity",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Kopi O (Regular Strength)",
              description: "Balanced robust body and aroma",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Kopi O Gao (Extra Thick & Intense)",
              description: "Double concentration pull for a punchy kick",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Kopi O Po (Light / Thinned)",
              description: "Diluted with hot water for smoother sipping",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Kopi Di Lo (Pure Undiluted Essence)",
              description: "Pure coffee nectar, maximum strength",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sweetness & Sugar Options",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Standard Sweetness (Regular Cane Sugar)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Siew Dai (Less Sugar · 50%)",
              description: "Subtle sweetness to highlight roast bitterness",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Kosong (Zero Sugar · 100% Pure Black)",
              description: "Authentic no-sugar black coffee",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Gula Melaka Infusion",
              description: "Natural coconut palm sugar with caramel aroma",
              priceDeltaCents: 120,
              isDefault: false,
            },
          ],
        },
        {
          name: "Serving Temperature & Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Hot (Classic Kopitiam Ceramic Cup)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Iced (Chilled over Crushed Ice in Glass Cup)",
              priceDeltaCents: 80,
              isDefault: false,
            },
            {
              name: "Warm (Slightly tempered for immediate drinking)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Traditional Kopitiam Add-Ons",
          required: false,
          minSelect: 0,
          maxSelect: 2,
          options: [
            {
              name: "Traditional Butter Slice (Kopi Gu You)",
              description: "Rich slab of salted SCS butter melting into hot brew",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Extra Shot of Hainan Espresso",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant"],
    },
    {
      slug: "flat-white",
      categorySlug: "coffee",
      name: "Velvet Flat White",
      description: "Double ristretto with expertly textured silky glossy microfoam.",
      priceCents: 1350,
      imageUrl: "/catalog/kura-kitchen/flat-white.jpg",
      badgeIds: ["best_selling"],
      ingredientIds: ["contains_dairy", "contains_caffeine", "vegetarian"],
      kcal: 120,
      detail: {
        eyebrow: "Specialty Coffee",
        heroNote: "Extracted to order",
        stats: [
          {
            label: "Prep Time",
            value: "3–5 mins",
          },
        ],
        notesPlaceholder: "e.g. Less foam, extra hot cup, served in warm demitasse",
      },
      modifierGroups: [
        {
          name: "Serving Temperature",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Hot (65°C Standard)",
              description: "Barista Recommended · Sweet spot for microfoam",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Hot (72°C)",
              description: "Maintains heat for slow sipping",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Iced (Slow Melt Rock)",
              description: "Served chilled over slow-melt rock cube",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Milk Selection",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Fresh Farm Whole Milk",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Oat Milk (Oatly Barista Edition)",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Almond Milk",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Soy Milk",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Skim Milk",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Espresso Roast & Extraction",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Signature House Blend",
              description: "Rich Chocolate & Hazelnut notes",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Single Origin Ethiopia Guji",
              description: "Delicate Floral & Bright Citrus",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Swiss Water Decaf",
              description: "100% Chemical-free processing",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sweetness & Natural Syrup",
          required: false,
          minSelect: 0,
          maxSelect: 1,
          options: [
            {
              name: "No Added Sugar (0%)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Less Sweet (50%)",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Madagascar Vanilla Syrup",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Salted Caramel",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Extra Extraction",
          required: false,
          minSelect: 0,
          maxSelect: 1,
          options: [
            {
              name: "Extra Ristretto Shot",
              description: "Adds body and dense creama intensity",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant", "basque-burnt-cheesecake"],
    },
    {
      slug: "chamomile-tea",
      categorySlug: "tea",
      name: "Chamomile Blossom Tea",
      description: "Hand-picked Egyptian whole chamomile blossoms offering delicate floral honey sweetness with soothing apple undertones. Naturally caffeine-free and brewed in heat-resistant glassware for a calming dining ritual.",
      priceCents: 1300,
      imageUrl: "/catalog/kura-kitchen/chamomile-tea.jpg",
      badgeIds: ["organic"],
      ingredientIds: ["caffeine_free", "vegan", "gluten_free"],
      kcal: 2,
      detail: {
        eyebrow: "Artisan Teas",
        heroNote: "Steeped to order",
        stats: [
          {
            label: "Prep Time",
            value: "4–6 mins",
          },
        ],
        notesPlaceholder: "Special instructions for the tea bar...",
      },
      modifierGroups: [
        {
          name: "Serving Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Hot Pot (Refillable Hot Water)",
              description: "Steeped at 90°C · Includes ceramic warmer",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Iced Infusion with Fresh Mint & Lemon",
              description: "Chilled over slow-melt rock ice",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sweetener Level",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "No Added Sweetener (Pure Blossom)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Wild Blossom Honey on the side",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Raw Cane Syrup",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Brewing Accompaniment",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Fresh Lemon Slice",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Dried Goji Berries & Red Dates Infusion",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Fresh Lavender Sprig",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Barista Steeping Notes",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Extra Hot (90°C)",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Light Steep (3 mins)",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Separate Honey Dipper",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant", "basque-burnt-cheesecake"],
    },
    {
      slug: "earl-grey-tea",
      categorySlug: "tea",
      name: "Reserve Earl Grey Tea",
      description: "Hand-plucked single-origin Ceylon black tea infused with cold-pressed Italian bergamot rind oil and blue cornflower petals. Bright citrus aroma with a silky malty finish.",
      priceCents: 1400,
      imageUrl: "/catalog/kura-kitchen/earl-grey-tea.jpg",
      badgeIds: ["organic"],
      ingredientIds: ["contains_caffeine", "vegan", "gluten_free"],
      kcal: 2,
      detail: {
        eyebrow: "Specialty Teas · Single Estate",
        heroNote: "Steeped to order",
        stats: [
          {
            label: "Prep Time",
            value: "4–6 mins",
          },
        ],
        notesPlaceholder: "e.g. Extra hot water on side, brew time preference...",
      },
      modifierGroups: [
        {
          name: "Serving Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Hot",
              description: "Teapot with Warm Sand Timer & Double-Walled Cup",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Iced",
              description: "Poured over Hand-Carved Ice Sphere with Citrus Wheel",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sweetness Level",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Unsweetened (0%)",
              description: "Purist Recommended",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Wildflower Honey",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Organic Cane Sugar (50%)",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Vanilla Infused Syrup",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Botanical Enhancements",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Fresh Bergamot & Meyer Lemon Wheel",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Oat Milk / Dairy Side",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Lavender Blossom Infusion",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant", "basque-burnt-cheesecake"],
    },
    {
      slug: "coca-cola",
      categorySlug: "cold-drinks",
      name: "Chilled Classic Coca-Cola",
      description: "Signature Mexican cane sugar Coca-Cola poured over crystalline hand-carved ice, garnished with fresh dehydrated lime wheel, cold pressed calamansi essence, and aromatic crushed rosemary sprig.",
      priceCents: 850,
      imageUrl: "/catalog/kura-kitchen/coca-cola.jpg",
      ingredientIds: ["vegan", "contains_caffeine"],
      kcal: 140,
      detail: {
        eyebrow: "Crafted Cold Beverage · Specialty Soda",
        heroNote: "Chilled on tap",
        heroNoteRight: "Mexican cane base",
        stats: [
          {
            label: "Prep Time",
            value: "2–3 mins",
          },
          {
            label: "Serve",
            value: "Ribbed Highball",
          },
        ],
        notesPlaceholder: "E.g., Extra lime slice, serve can unopened, separate glass...",
      },
      modifierGroups: [
        {
          name: "Selection & Formula",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Coca-Cola",
              description: "Original Formula · Real Mexican Cane Sugar",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Coca-Cola Zero Sugar",
              description: "Crisp Calorie-Free · Signature Chill",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Artisanal Craft Cola",
              description: "Hand-Brewed Botanical · Kola Nut & Vanilla Bean",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Ice & Serving Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Full Crystal Clear Highball Ice",
              description: "Slow-melt block ice · Maximum crisp fizz",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Less Ice",
              description: "Light chill, maximized beverage volume",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "No Ice / Chilled Can with Empty Glass",
              description: "Served sealed with frosted dry highball glass",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Citrus & Herb Botanicals",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Fresh Sliced Lime & Calamansi Twist",
              description: "Cold-pressed citrus aroma rim",
              priceDeltaCents: 100,
              isDefault: true,
            },
            {
              name: "Salted Preserved Plum (Asam Boi)",
              description: "Savory, tart umami kick",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Fresh Crushed Mint & Rosemary Sprig",
              description: "Wild garden aromatics",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Scoop of Madagascar Vanilla Gelato",
              description: "Transforms into luxurious artisanal Cola Float",
              priceDeltaCents: 450,
              isDefault: false,
            },
          ],
        },
        {
          name: "Glassware & Straw Request",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Ribbed Highball Glass + Stainless Steel Straw",
              description: "Eco-conscious dine-in experience",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Takeaway Chilled Cup + Bio Straw",
              description: "Biodegradable plant-fiber insulated cup",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Can Unopened with Separate Takeaway Cup",
              description: "For later consumption",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["margherita-pizza"],
    },
    {
      slug: "watermelon-juice",
      categorySlug: "cold-drinks",
      name: "Cold-Pressed Sun-Ripened Watermelon Juice",
      description: "Freshly extracted whole sun-ripened local watermelons, slow cold-pressed to preserve vital enzymes and vibrant natural sweetness. Crisp, hydrating, and naturally revitalizing with zero added syrup or preservatives.",
      priceCents: 1350,
      imageUrl: "/catalog/kura-kitchen/watermelon-juice.jpg",
      badgeIds: ["fresh_daily"],
      ingredientIds: ["vegan", "gluten_free", "no_added_sugar"],
      kcal: 110,
      detail: {
        eyebrow: "Artisanal Refreshers · Zero Added Sugar",
        heroNote: "Served chilled",
        stats: [
          {
            label: "Prep Time",
            value: "2–3 mins",
          },
          {
            label: "Fruit Base",
            value: "Crimson Sweet",
          },
        ],
        notesPlaceholder: "E.g., Extra lime slice, serve without garnish...",
      },
      modifierGroups: [
        {
          name: "Ice Level & Temperature",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Normal Chilled Ice",
              description: "Recommended · crisp refreshment",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Less Ice",
              description: "More juice content",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "No Ice Chilled",
              description: "Served from walk-in cold cellar",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Room Temperature",
              description: "Ambient extraction state",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Citrus & Botanical Infusions",
          required: false,
          minSelect: 0,
          maxSelect: 1,
          options: [
            {
              name: "Pure Unblended",
              description: "Original natural taste · Standard",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Fresh Pressed Calamansi Lime Splash",
              description: "Zesty citrus punch",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Organic Crushed Moroccan Mint Leaves",
              description: "Muddled in glass",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Fresh Cold-Pressed Ginger Kick",
              description: "Subtle warming undertone",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Superfood Boosts & Add-ons",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Hydrating Chia Seed Infusion",
              description: "Rich in Omega-3 & dietary fiber",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Fresh Aloe Vera Jelly Cubes",
              description: "Slight chewy texture, soothing",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Collagen Peptides Booster Shot",
              description: "Marine peptide blend · Unflavored",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Himalayan Pink Salt Rim & Mint Sprig",
              description: "Accentuates natural melon sugars",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Serving Style & Straw",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Highball Glass with Bamboo Fiber Straw",
              description: "Dine-in standard · Chilled glassware",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Chilled To-Go Recyclable PLA Tumbler",
              description: "Sealed spill-proof lid",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "No Straw Requested",
              description: "Eco Choice · Sip directly",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant"],
    },
    {
      slug: "iced-lemon-tea",
      categorySlug: "cold-drinks",
      name: "Iced Meyer Lemon Ceylon Tea",
      description: "Slow-brewed single-estate Ceylon black tea infused with cold-pressed organic Meyer lemon juice, natural raw cane syrup, garnished with fresh sun-ripened citrus wheels and wild garden spearmint over handcrafted ice.",
      priceCents: 1200,
      imageUrl: "/catalog/kura-kitchen/iced-lemon-tea.jpg",
      badgeIds: ["fresh_daily"],
      ingredientIds: ["vegan", "gluten_free", "contains_caffeine"],
      kcal: 90,
      detail: {
        eyebrow: "Drinks / Artisanal Refreshments",
        heroNote: "Served chilled",
        stats: [
          {
            label: "Prep Time",
            value: "2–3 mins",
          },
        ],
        notesPlaceholder: "e.g. extra lemon on side, separate syrup",
      },
      modifierGroups: [
        {
          name: "Temperature / Serving Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Iced with Crushed Ice (Standard)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Less Ice",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Warm / Hot Infusion",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sweetness Level",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Unsweetened",
              description: "0%",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Subtle Wildflower Honey",
              description: "25%",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Half Sweet",
              description: "50%",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Classic Cane Sugar",
              description: "100%",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Citrus Infusion & Extras",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Extra Fresh Meyer Lemon Slices",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Add Organic Chia Seeds",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Infuse Wild Honey",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Aromatic Lemongrass Sprig",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant", "truffle-fries"],
    },
    {
      slug: "mineral-water",
      categorySlug: "cold-drinks",
      name: "Ivan Artisan Mineral Water",
      description: "Sourced from pristine highland springs, naturally filtered through subterranean basalt layers for an impeccably clean, silky palate. Bottled at source in eco-conscious recycled frosted glassware.",
      priceCents: 800,
      imageUrl: "/catalog/kura-kitchen/mineral-water.jpg",
      ingredientIds: ["vegan", "gluten_free", "no_added_sugar"],
      detail: {
        eyebrow: "Pure Artisan Hydration · Specialty Reserve",
        heroNote: "750ml glass decanter",
        heroNoteRight: "Highland reserve",
        stats: [
          {
            label: "Prep Time",
            value: "2–3 mins",
          },
          {
            label: "TDS Level",
            value: "<45 ppm · Ultra Soft",
          },
        ],
        notesPlaceholder: "E.g., Extra ice on side, sliced lemon instead of lime, serve with warm water...",
      },
      modifierGroups: [
        {
          name: "Carbonation Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Still Natural Spring",
              description: "Standard, silky mouthfeel, served room or chilled",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Gentle Fine Bubble Sparkling",
              description: "Effervescent champagne-style fine carbonation",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Intense Carbonated Crisp",
              description: "Bold extra fizz with sparkling citrus bite",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Serving Temperature",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Chilled 4°C with Glassware",
              description: "Standard cold pour with frosty exterior condensation",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Ambient Room Temperature",
              description: "Sommelier recommended for unmasked mineral notes",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Over Slow-Melting Clear Ice Sphere",
              description: "Hand-carved 60mm artisanal crystal ice orb",
              priceDeltaCents: 250,
              isDefault: false,
            },
          ],
        },
        {
          name: "Botanicals & Citrus Infusion",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Fresh Dehydrated Blood Orange Wheel",
              description: "Fragrant citrus aroma, slow release",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Organic Japanese Yuzu Peel & Mint",
              description: "Bright floral acidity, invigorating finish",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Fresh Cucumber Ribbon & Rosemary",
              description: "Cool crisp herbal undertone",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Fresh Lime Wedge on Rim",
              description: "As shown in hero presentation",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Service & Glassware",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Riedel Stemless Crystal Tumbler",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Chilled Fluted Highball Glass",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Takeaway Sealed Bottle Only",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant"],
    },
    {
      slug: "eggs-benedict",
      categorySlug: "breakfast",
      name: "Eggs Benedict",
      description: "Two pasture-raised organic poached eggs served over toasted sourdough brioche, wilted baby spinach, and our velvety citrus brown-butter hollandaise sauce. Finished with fresh chives and cracked black pepper.",
      priceCents: 2400,
      imageUrl: "/catalog/kura-kitchen/eggs-benedict.jpg",
      badgeIds: ["chef_recommended", "made_to_order"],
      ingredientIds: ["contains_egg", "contains_dairy", "contains_gluten", "contains_fish"],
      kcal: 540,
      detail: {
        eyebrow: "All-Day Brunch · Chef Special",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "12–15 mins",
          },
          {
            label: "Egg Origin",
            value: "Local Pasture",
          },
        ],
        notesPlaceholder: "e.g., Hollandaise strictly on side, extra crispy brioche, allergy alert...",
      },
      modifierGroups: [
        {
          name: "Poached Egg Doneness",
          description: "Pick 1 doneness level",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Soft Poached",
              description: "63°C runny yolk - Chef Recommended",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Medium Poached",
              description: "Custard-jammy yolk",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Firm Poached",
              description: "Fully set yolk",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Protein & Base Selection",
          description: "Pick 1 signature protein",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Atlantic Smoked Salmon",
              description: "Cured in-house with fresh dill & lemon zest",
              priceDeltaCents: 400,
              isDefault: true,
            },
            {
              name: "Smoked Artisanal Turkey Ham",
              description: "Lightly seared beechwood smoke",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Streaky Beef Bacon Strips",
              description: "Crisp skillet-fired glaze",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Grilled Portobello & Avocado",
              description: "Herb balsamic glaze · Vegetarian",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Hollandaise & Sauce Customization",
          description: "Pick 1 sauce preference",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Citrus Brown-Butter Hollandaise",
              description: "Velvety emulsion with lemon reduction",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Spicy Sriracha-Yuzu Hollandaise",
              description: "Subtle warm kick & citrus note",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Hollandaise On The Side",
              description: "Served in a warm ceramic dipping dish",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra Ladle of Warm Hollandaise",
              description: "Generous additional pour over sourdough",
              priceDeltaCents: 250,
              isDefault: false,
            },
          ],
        },
        {
          name: "Brunch Add-ons & Sides",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Fresh Hass Avocado Slices",
              description: "Seasoned with sea salt flakes & evoo",
              priceDeltaCents: 400,
              isDefault: true,
            },
            {
              name: "Crispy Hash Brown Rösti",
              description: "Hand-shredded Russet potato disc",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Grilled Cherry Vine Tomatoes",
              description: "Charred with fresh thyme",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Double Smoked Salmon Portion",
              description: "Extra 60g in-house cured salmon",
              priceDeltaCents: 600,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["flat-white"],
    },
    {
      slug: "avocado-toast",
      categorySlug: "breakfast",
      name: "Smashed Avocado Toast",
      description: "Toasted artisanal country sourdough topped with freshly smashed Hass avocados, cold-pressed olive oil, Australian Danish feta cheese crumbles, toasted white and black sesame furikake, heirloom micro-radish greens, and a squeeze of fresh lemon.",
      priceCents: 2200,
      imageUrl: "/catalog/kura-kitchen/avocado-toast.jpg",
      badgeIds: ["best_selling", "made_to_order"],
      ingredientIds: ["vegetarian", "contains_dairy", "contains_sesame", "contains_gluten", "contains_egg"],
      kcal: 480,
      detail: {
        eyebrow: "Breakfast & Mains · Plant-Rich",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "12–15 mins",
          },
        ],
        notesPlaceholder: "e.g. dressing on the side, well-toasted bread...",
      },
      modifierGroups: [
        {
          name: "Egg Preparation",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Soft Poached Organic Egg (Standard)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Sunny Side Up Fried Egg",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Scrambled Creamy Eggs",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "No Egg (Strict Vegan Prep)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sourdough Bread Choice",
          required: false,
          minSelect: 0,
          maxSelect: 1,
          options: [
            {
              name: "Rustic Country Sourdough",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Gluten-Free Seeded Sourdough",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Dark Rye Brioche Loaf",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Savory Add-Ons",
          description: "Customize your plate",
          required: false,
          minSelect: 0,
          maxSelect: 5,
          options: [
            {
              name: "Cured Norwegian Smoked Salmon (50g)",
              priceDeltaCents: 800,
              isDefault: false,
            },
            {
              name: "Crispy Streaky Beef Bacon",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Extra Smashed Avocado Scoop",
              priceDeltaCents: 500,
              isDefault: false,
            },
            {
              name: "Marinated Sautéed Wild Mushrooms",
              priceDeltaCents: 450,
              isDefault: false,
            },
            {
              name: "Roasted Cherry Tomatoes on Vine",
              priceDeltaCents: 350,
              isDefault: false,
            },
          ],
        },
        {
          name: "Spice & Seasoning",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Chili Flakes & Togarashi (Standard)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Mild (Black Pepper & Flaky Sea Salt Only)",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra Spicy (Habanero Pepper Oil drizzle)",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["flat-white", "watermelon-juice", "long-black"],
    },
    {
      slug: "big-breakfast",
      categorySlug: "breakfast",
      name: "The Craftsman's Big Breakfast",
      description: "Two pasture-raised sunny eggs, house-cured crispy beef bacon (or pork bacon), artisanal smoked chicken bratwurst, sautéed wild herb button mushrooms, blistered vine cherry tomatoes, baked cannellini beans in stoneware, served with grilled sourdough…",
      priceCents: 3200,
      imageUrl: "/catalog/kura-kitchen/big-breakfast.jpg",
      badgeIds: ["chef_recommended", "best_selling"],
      ingredientIds: ["contains_egg", "contains_gluten", "contains_dairy"],
      kcal: 820,
      detail: {
        eyebrow: "All-Day Breakfast",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "12–15 mins",
          },
        ],
        notesPlaceholder: "e.g. Extra crispy bacon, beans served in ramekin, unsalted butter...",
      },
      modifierGroups: [
        {
          name: "Choice of Eggs",
          description: "Select preparation style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Sunny Side Up (Standard)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Creamy Soft Scramble",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Over Easy",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Poached Eggs (2 pcs)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Toast Preference",
          description: "Baked daily in-house",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Country Sourdough (2 Slices)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Toasted Brioche Loaf",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Gluten-Free Seeded Loaf",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Choice of Protein",
          description: "Select bacon & sausage variant",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Crispy Beef Bacon & Chicken Sausage",
              description: "Halal-certified sources",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Streaky Pork Bacon & Pork Bratwurst",
              description: "Traditional recipe",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Grilled Halloumi & Fresh Avocado",
              description: "Vegetarian substitute",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Extra Sides & Toppings",
          description: "Customise your breakfast platter",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Sliced Hass Avocado (Half)",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Extra Chicken Bratwurst (1 pc)",
              priceDeltaCents: 550,
              isDefault: false,
            },
            {
              name: "Truffle Aromatics & Chives",
              priceDeltaCents: 450,
              isDefault: false,
            },
            {
              name: "Extra Sourdough Slice with Butter",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["flat-white"],
    },
    {
      slug: "fish-and-chips",
      categorySlug: "mains",
      name: "Crispy Beer-Battered Fish & Chips",
      description: "Crispy golden Pacific cod fillet fried in craft ale batter, accompanied by twice-cooked sea salt hand-cut chips, housemade dill tartar sauce, minted mushy peas, and fresh charred lemon.",
      priceCents: 2800,
      imageUrl: "/catalog/kura-kitchen/fish-and-chips.jpg",
      badgeIds: ["chef_recommended"],
      ingredientIds: ["contains_fish", "contains_gluten", "contains_dairy", "contains_alcohol", "pescatarian"],
      kcal: 850,
      detail: {
        eyebrow: "Mains · Chef Signature",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "14 mins",
          },
        ],
        notesPlaceholder: "e.g. Extra crispy batter, lemon on the side, salt separately...",
      },
      modifierGroups: [
        {
          name: "Choice of Side / Chips",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Hand-Cut Sea Salt Chips (Default)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Truffle Parmesan Fries",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Mixed Garden Salad with Citrus Vinaigrette",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sauce & Dip Options",
          description: "Customise portions & dressings",
          required: false,
          minSelect: 0,
          maxSelect: 5,
          options: [
            {
              name: "Housemade Dill Tartar Sauce",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Classic Tartar Sauce",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Black Truffle Aioli",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Traditional Malt Vinegar & Sea Salt",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Classic Mushy Peas",
              priceDeltaCents: 0,
              isDefault: true,
            },
          ],
        },
      ],
      upsellSlugs: ["iced-lemon-tea", "mineral-water", "basque-burnt-cheesecake"],
    },
    {
      slug: "chilean-seabass",
      categorySlug: "mains",
      name: "Pan-Seared Chilean Seabass",
      description: "Crisp-skinned Chilean seabass fillet on a brown butter and lemon beurre blanc, with charred asparagus and confit baby potatoes.",
      priceCents: 5800,
      imageUrl: "/catalog/kura-kitchen/chilean-seabass.jpg",
      badgeIds: ["chef_recommended"],
      ingredientIds: ["contains_fish", "contains_dairy", "gluten_free", "pescatarian"],
      kcal: 480,
      detail: {
        eyebrow: "Chef's Mains · Ocean Selection",
        heroNote: "Seared to order",
        heroNoteRight: "Sustainably sourced",
        stats: [
          {
            label: "Prep Time",
            value: "18–22 mins",
          },
          {
            label: "Cut",
            value: "180g Fillet",
          },
        ],
        notesPlaceholder: "e.g. well-done, no butter, allergy alert...",
      },
      modifierGroups: [
        {
          name: "Sauce",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Lemon Beurre Blanc",
              description: "Brown butter, lemon, chives",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Miso Glaze",
              description: "Sweet white miso lacquer",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Sauce on the Side",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Side Swap",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Confit Baby Potatoes",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Truffle Mash",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Garden Greens (Low Carb)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Add-Ons",
          required: false,
          minSelect: 0,
          maxSelect: 2,
          options: [
            {
              name: "Extra Charred Asparagus",
              priceDeltaCents: 500,
              isDefault: false,
            },
            {
              name: "Seared Hokkaido Scallops (2 pcs)",
              priceDeltaCents: 1400,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["mineral-water", "garden-salad"],
    },
    {
      slug: "lamb-shank",
      categorySlug: "mains",
      name: "Slow-Braised Australian Lamb Shank",
      description: "Australian lamb shank braised for eight hours in a rosemary and red wine jus until fall-off-the-bone, served over creamy parmesan polenta.",
      priceCents: 4800,
      imageUrl: "/catalog/kura-kitchen/lamb-shank.jpg",
      badgeIds: ["signature"],
      ingredientIds: ["contains_alcohol", "contains_dairy", "gluten_free"],
      kcal: 690,
      detail: {
        eyebrow: "Chef's Mains · Slow Braise",
        heroNote: "8-hour braise",
        heroNoteRight: "Australian lamb",
        stats: [
          {
            label: "Prep Time",
            value: "12–15 mins",
          },
          {
            label: "Braise",
            value: "8 Hours",
          },
        ],
        notesPlaceholder: "e.g. jus on the side, no polenta...",
      },
      modifierGroups: [
        {
          name: "Base",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Parmesan Polenta",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Buttered Mash",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Toasted Sourdough",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Jus Richness",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Rosemary Jus",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Jus on the Side",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Add-Ons",
          required: false,
          minSelect: 0,
          maxSelect: 2,
          options: [
            {
              name: "Glazed Heirloom Carrots",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Gremolata Crumb",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["mineral-water", "tiramisu"],
    },
    {
      slug: "pho-bo",
      categorySlug: "mains",
      name: "Wagyu Beef Pho Bo",
      description: "Simmered for 18 hours with charred ginger, star anise, cinnamon quills, and marrow bones. Served over artisanal hand-cut flat rice noodles, thinly shaved premium Australian Wagyu beef, sweet white onion ribbons, and fresh cilantro.",
      priceCents: 2450,
      imageUrl: "/catalog/kura-kitchen/pho-bo.jpg",
      badgeIds: ["signature"],
      ingredientIds: ["gluten_free", "halal", "contains_fish", "contains_soy"],
      kcal: 520,
      detail: {
        eyebrow: "Heritage Noodle Broths · Specialty Mains",
        heroNote: "18-hour simmered bone broth",
        heroNoteRight: "Wagyu sirloin",
        stats: [
          {
            label: "Prep Time",
            value: "15–20 mins",
          },
          {
            label: "Noodle Craft",
            value: "Rice Ban Pho · Gluten-Free",
          },
        ],
        notesPlaceholder: "E.g., soup extra hot, onions on the side, lime separated...",
      },
      modifierGroups: [
        {
          name: "Beef Doneness & Cut Selection",
          description: "Select exactly 1 preferred cut preparation",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Rare Wagyu (Cooks gently in hot broth)",
              description: "Paper-thin slices layered raw, flash-poached tableside",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Medium Rare Sirloin",
              description: "Quick pre-blanched cut for firmer bite",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Add Braised Beef Brisket & Tendon Combo",
              description: "Melt-in-mouth slow-braised Australian flank and tendon",
              priceDeltaCents: 600,
              isDefault: false,
            },
          ],
        },
        {
          name: "Noodle & Broth Customization",
          description: "Select noodle style and portion balance",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Standard Hand-Cut Flat Rice Noodles",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Noodles (+50% Portion)",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Broth Only (Low-Carb · Double Beansprouts & Veggies)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Fresh Herb Bouquet & Garnish",
          description: "Customize your complimentary fresh garden basket",
          required: false,
          minSelect: 0,
          maxSelect: 5,
          options: [
            {
              name: "Fresh Thai Basil & Sawtooth Coriander",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Crisp Raw Bean Sprouts & Fresh Lime Wedge",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Bird's Eye Red Chili & Sliced Jalapeños",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Housemade Sriracha & Sweet Hoisin Sauce Dip Ramekin",
              priceDeltaCents: 50,
              isDefault: false,
            },
            {
              name: "Extra Fresh Coriander & Scallion Oil",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Broth Intensity & Chili Oil",
          description: "Choose broth richness depth",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Clear Spiced Broth",
              description: "Balanced 18-hr marrow broth with pure aromatics",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Rich Broth with Extra Beef Tallow (Béo Nước)",
              description: "Decadent gloss with simmered ginger scallion tallow",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Spicy Lemongrass & Chili Sate Infusion",
              description: "Saigon-style wok-roasted red chili oil with garlic",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["spanish-latte"],
    },
    {
      slug: "mac-and-cheese",
      categorySlug: "pasta-pizza",
      name: "Baked Three-Cheese Mac & Cheese",
      description: "Elbow macaroni folded through a mornay of aged cheddar, gruyère and parmigiano, baked under a golden herb-crumb crust.",
      priceCents: 2200,
      imageUrl: "/catalog/kura-kitchen/mac-and-cheese.jpg",
      ingredientIds: ["contains_dairy", "contains_gluten", "contains_egg", "vegetarian"],
      kcal: 720,
      detail: {
        eyebrow: "Pasta & Pizza · Comfort Classic",
        heroNote: "Baked to order",
        heroNoteRight: "Three cheeses",
        stats: [
          {
            label: "Prep Time",
            value: "14–16 mins",
          },
        ],
        notesPlaceholder: "e.g. less salt, extra crispy top...",
      },
      modifierGroups: [
        {
          name: "Crust Finish",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Golden Herb Crumb",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Crispy Bake",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "No Crumb (Gluten-Sensitive)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Add-Ons",
          description: "Folded through before baking",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Crispy Beef Bacon Bits",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Truffle Oil Drizzle",
              priceDeltaCents: 450,
              isDefault: false,
            },
            {
              name: "Sautéed Wild Mushrooms",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Jalapeño Slices",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["iced-lemon-tea", "garden-salad"],
    },
    {
      slug: "beef-lasagna",
      categorySlug: "pasta-pizza",
      name: "Beef Lasagna Al Forno",
      description: "Layers of handmade durum wheat pasta sheets, 8-hour slow-simmered Australian beef ragù bolognese, silky velvety nutmeg béchamel sauce, gratinéed with Parmigiano-Reggiano and fresh Fior di Latte mozzarella.",
      priceCents: 2600,
      imageUrl: "/catalog/kura-kitchen/beef-lasagna.jpg",
      badgeIds: ["chef_recommended"],
      ingredientIds: ["contains_dairy", "contains_gluten", "halal"],
      kcal: 720,
      detail: {
        eyebrow: "Authentic Al Forno",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "18–20 mins",
          },
          {
            label: "Preparation",
            value: "Baked Fresh to Order",
          },
        ],
        notesPlaceholder: "e.g., extra crispy edge, sauce on side, less pepper",
      },
      modifierGroups: [
        {
          name: "Portion / Serving",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Standard Portion",
              description: "Serves 1 · Approx. 380g",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Hearty Portion",
              description: "+30% Ragù & Pasta · Approx. 500g",
              priceDeltaCents: 700,
              isDefault: false,
            },
          ],
        },
        {
          name: "Extra Crust & Cheese",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Extra Blistered Mozzarella Crust",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Aged 24-Month Parmigiano Shavings",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Fresh Truffle Oil Drizzle",
              priceDeltaCents: 500,
              isDefault: false,
            },
          ],
        },
        {
          name: "Bread & Sides Pairing",
          description: "Recommended",
          required: false,
          minSelect: 0,
          maxSelect: 2,
          options: [
            {
              name: "Garlic Herb Sourdough Toast",
              description: "2 thick cut slices",
              priceDeltaCents: 450,
              isDefault: false,
            },
            {
              name: "Side Petite Rocket & Cherry Tomato Salad",
              description: "Balsamic glaze dressing",
              priceDeltaCents: 500,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["coca-cola", "v60-pour-over"],
    },
    {
      slug: "truffle-spaghetti",
      categorySlug: "pasta-pizza",
      name: "Black Truffle & Forest Mushroom Spaghetti",
      description: "Bronze-die extruded artisanal spaghetti tossed in an emulsified brown-butter emulsion, wild porcini, cremini and shimeji mushrooms, infused with white truffle essence, finished with 24-month aged Parmigiano-Reggiano and fresh cracked Tellicherry…",
      priceCents: 2600,
      imageUrl: "/catalog/kura-kitchen/truffle-spaghetti.jpg",
      badgeIds: ["chef_recommended"],
      ingredientIds: ["contains_gluten", "contains_dairy", "vegetarian"],
      kcal: 640,
      detail: {
        eyebrow: "Handcrafted Mains · Pasta Lab",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "12–15 mins",
          },
          {
            label: "Pasta Style",
            value: "Bronze-Die Extruded",
          },
        ],
        notesPlaceholder: "e.g. Extra cracked pepper, sauce separated, allergen alert...",
      },
      modifierGroups: [
        {
          name: "Pasta Doneness",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Al Dente",
              description: "Traditional Firm Bite · Chef Recommended",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Classic Tender",
              description: "Softer texture",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Gluten-Free Spaghetti Substitute",
              description: "Artisanal corn & rice flour blend",
              priceDeltaCents: 350,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sauce & Truffle Richness",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Signature Brown-Butter Truffle Emulsion",
              description: "Balanced, silky, earthy depth",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Creamy Truffle Alfredo Style",
              description: "Rich double cream & parmesan reduction",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Light Olive Oil & Garlic Aglio Olio Style",
              description: "Crisp sliced garlic, parsley, light emulsion",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Chili & Heat Level",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "No Chili",
              description: "0/3 Heat · Authentic Taste",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Mild Chili Flakes",
              description: "1/3 Heat · Subtle Warmth",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Medium Spiced",
              description: "2/3 Heat · Crushed Calabrian",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra Bird's Eye",
              description: "3/3 Heat · Fiery Kick",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Gourmet Protein & Add-Ons",
          required: false,
          minSelect: 0,
          maxSelect: 5,
          options: [
            {
              name: "Grilled Tiger Prawns (3 pcs)",
              description: "Garlic-herb butter seared",
              priceDeltaCents: 700,
              isDefault: false,
            },
            {
              name: "Pan-Seared Smoked Duck Breast",
              description: "Sliced, crispy skin edge",
              priceDeltaCents: 650,
              isDefault: false,
            },
            {
              name: "Crispy Pancetta Strips",
              description: "Cured Italian pork belly lardons",
              priceDeltaCents: 450,
              isDefault: false,
            },
            {
              name: "Sous-Vide Onsen Egg",
              description: "63°C silky slow-cooked pasture egg",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Shaved Fresh Summer Black Truffle",
              description: "Directly planed tableside (3-4 shavings)",
              priceDeltaCents: 800,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dietary & Kitchen Preferences",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Extra Shaved Parmigiano-Reggiano",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "No Garlic & Onion",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Vegetarian Prep (No Animal Rennet)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["mineral-water"],
    },
    {
      slug: "carbonara",
      categorySlug: "pasta-pizza",
      name: "Classic Spaghetti alla Carbonara",
      description: "Traditional Roman recipe crafted with bronze-die spaghetti, slow-rendered crispy guanciale, pasture-raised organic egg yolk emulsion, aged Pecorino Romano DOP, and freshly cracked Tellicherry black pepper.",
      priceCents: 2800,
      imageUrl: "/catalog/kura-kitchen/carbonara.jpg",
      badgeIds: ["chef_recommended"],
      ingredientIds: ["contains_pork", "contains_egg", "contains_dairy", "contains_gluten"],
      kcal: 690,
      detail: {
        eyebrow: "Pasta & Pizza",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "14–18 mins",
          },
        ],
        notesPlaceholder: "e.g. less black pepper, sauce on the side...",
      },
      modifierGroups: [
        {
          name: "Pasta Selection",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Bronze-Die Spaghetti",
              description: "Standard portion (130g dry wt.)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "House-made Fresh Tagliatelle",
              description: "Hand-rolled daily with Italian semolina",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Gluten-Free Penne",
              description: "Corn & brown rice blend",
              priceDeltaCents: 400,
              isDefault: false,
            },
          ],
        },
        {
          name: "Pasta Doneness",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Authentic Al Dente",
              description: "Firm to the bite",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Standard Soft",
              description: "Tender throughout",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Extra Indulgence & Add-ons",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Extra Crispy Guanciale",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Shaved Fresh Black Truffle",
              description: "Umbrian seasonal truffle (3g)",
              priceDeltaCents: 1200,
              isDefault: false,
            },
            {
              name: "Organic 63°C Onsen Egg yolk",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Double Aged Pecorino Romano",
              priceDeltaCents: 400,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["spanish-latte", "watermelon-juice"],
    },
    {
      slug: "margherita-pizza",
      categorySlug: "pasta-pizza",
      name: "Wood-Fired Margherita D.O.P.",
      description: "Hand-stretched 48-hour slow-fermented sourdough crust blistered at 450°C in our volcanic stone oven. Topped with sweet San Marzano D.O.P.",
      priceCents: 2800,
      imageUrl: "/catalog/kura-kitchen/margherita-pizza.jpg",
      badgeIds: ["made_to_order", "chef_recommended"],
      ingredientIds: ["contains_gluten", "contains_dairy", "vegetarian"],
      kcal: 780,
      detail: {
        eyebrow: "Artisanal Pizza · Wood-Fired",
        heroNote: "Wood-fired · 48h fermentation",
        heroNoteRight: "Hand-stretched",
        stats: [
          {
            label: "Prep Time",
            value: "14–18 mins",
          },
          {
            label: "Dough",
            value: "48h Cold Ferment",
          },
        ],
        notesPlaceholder: "Allergens, crispiness preference, or packaging instructions...",
      },
      modifierGroups: [
        {
          name: "Crust & Base Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Neapolitan",
              description: "Puffy airy cornicione crust blistered light",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Thin & Crispy Romana",
              description: "Even golden snap with zero dough rim",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Cheesy Stuffed Crust",
              description: "Stuffed with molten fior di latte mozzarella",
              priceDeltaCents: 450,
              isDefault: false,
            },
          ],
        },
        {
          name: "Cheese & Sauce Preference",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Fior di Latte Mozzarella",
              description: "Chef's authentic balanced melt & salt profile",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Double Fior di Latte Cheese",
              description: "+50g decadent artisan cheese layer",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Creamy Buffalo Mozzarella D.O.P. Upgrade",
              description: "Imported Campania water buffalo milk curds",
              priceDeltaCents: 500,
              isDefault: false,
            },
            {
              name: "Vegan Plant-Based Mozzarella",
              description: "Cashew-coconut cultured melt",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Gourmet Toppings & Add-Ons",
          required: false,
          minSelect: 0,
          maxSelect: 5,
          options: [
            {
              name: "Fresh Shaved Black Truffle",
              description: "Umbrian black summer truffle (3g)",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Sliced Spanish Beef Pepperoni",
              description: "Dry-cured with paprika & smoked chili",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Wild Forest Porcini Mushrooms",
              description: "Sautéed with thyme and butter",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Fresh Burrata Crown",
              description: "Whole 120g stracciatella ball centered",
              priceDeltaCents: 850,
              isDefault: false,
            },
            {
              name: "Anchovy Fillets & Sicilian Capers",
              description: "Salt-cured Cantabrian fillets",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Finishing Drizzle & Oil",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Extra Virgin Cold Pressed Olive Oil (Standard)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "House Chili-Infused Hot Honey",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "White Truffle Oil Drizzle",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Fresh Basil Pesto Swirl",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dietary & Prep Requests",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Cut into 6 slices (Standard)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Leave uncut for maximum crispness",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Well-done extra crispy bake",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Chili flakes & dried oregano on side",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["mineral-water"],
    },
    {
      slug: "oxtail-soup",
      categorySlug: "soups-salads",
      name: "12-Hour Braised Oxtail Soup",
      description: "Tender grass-fed Australian oxtail slow-simmered for 12 hours with roasted aromatic root vegetables, shallots, star anise, nutmeg, and rich bone marrow reduction. Served with fresh coriander, spring onion curls, and toasted artisanal sourdough.",
      priceCents: 3400,
      imageUrl: "/catalog/kura-kitchen/oxtail-soup.jpg",
      badgeIds: ["signature"],
      ingredientIds: ["contains_dairy", "contains_gluten", "halal"],
      kcal: 560,
      detail: {
        eyebrow: "Heritage Mains · Slow-Simmered Broth",
        heroNote: "Grass-fed Australian beef",
        heroNoteRight: "12-hour braise",
        stats: [
          {
            label: "Prep Time",
            value: "8–12 mins",
          },
          {
            label: "Cut",
            value: "Australian Ox Tail",
          },
        ],
        notesPlaceholder: "E.g., Soup extra hot, less coriander, chili on the side...",
      },
      modifierGroups: [
        {
          name: "Soup Richness & Spice",
          description: "Select exactly 1 broth profile for your table serving.",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Heritage Broth",
              description: "Traditional aromatic herbs, comforting richness",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Spicy Cilantro & Bird's Eye Chili Kick",
              description: "Fresh chopped chili padi & lime twist",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Extra Concentrated Bone Marrow Infusion",
              description: "Ultra velvety, rich collagen body",
              priceDeltaCents: 400,
              isDefault: false,
            },
          ],
        },
        {
          name: "Carbohydrate & Accompaniment",
          description: "Choose your starch accompaniment (pick 1).",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Toasted Artisanal Sourdough & French Butter",
              description: "2 thick slices for dipping",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Steamed Jasmine Rice with Crispy Fried Shallots",
              description: "Fragrant local harvest bowl",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Handmade Mee Hoon Flat Noodles",
              description: "Immersed in hot broth",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Keto / Low-Carb Option",
              description: "Extra stewed carrots & celery, zero refined carbs",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Fresh Herbs & Condiments",
          description: "Multi-select available add-ons and table condiments.",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Extra Spring Onion & Fried Shallot Crisp",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Fresh Lime Wedges & Sambal Kicap Dip",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Extra Bone Marrow Piece",
              priceDeltaCents: 800,
              isDefault: false,
            },
            {
              name: "Pickled Green Chili & Calamansi",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dining Utensils & Service",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Dine-in Stoneware Ceramic Bowl & Wooden Ladle",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Insulated Thermal Takeaway Container",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["kopi-o"],
    },
    {
      slug: "caesar-salad",
      categorySlug: "soups-salads",
      name: "Classic Caesar Salad",
      description: "Crisp hand-torn baby romaine lettuce tossed in artisanal house-made garlic anchovy emulsion, topped with shaved 24-month aged Parmigiano-Reggiano, herb-buttered sourdough croutons, and a soft-boiled pasture egg with jammy yolk.",
      priceCents: 1850,
      imageUrl: "/catalog/kura-kitchen/caesar-salad.jpg",
      badgeIds: ["made_to_order"],
      ingredientIds: ["contains_egg", "contains_dairy", "contains_fish", "contains_gluten", "nut_free"],
      kcal: 380,
      detail: {
        eyebrow: "Greens & Salads",
        heroNote: "Made fresh to order",
        heroNoteRight: "Chef specialty",
        stats: [
          {
            label: "Prep Time",
            value: "8–12 mins",
          },
        ],
        notesPlaceholder: "e.g. extra cracked black pepper, hold the anchovies...",
      },
      modifierGroups: [
        {
          name: "Dressing Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Tossed Evenly (Chef Recommended)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Dressing on the Side",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Light Dressing",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Croutons & Crunch",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Garlic Sourdough Croutons (Extra Crunchy)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "No Croutons (Gluten-Sensitive)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Protein Add-Ons",
          required: false,
          minSelect: 0,
          maxSelect: 5,
          options: [
            {
              name: "Grilled Rosemary Lemon Chicken Breast",
              description: "120g Tender Sliced Chicken",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Smoked Norwegian Salmon Slices",
              description: "Cured in-house with dill",
              priceDeltaCents: 850,
              isDefault: false,
            },
            {
              name: "Pan-Seared Garlic Sea Prawns (3 pcs)",
              description: "Wild-caught black tiger prawns",
              priceDeltaCents: 900,
              isDefault: false,
            },
            {
              name: "Extra Jammy Pasture-Raised Egg",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Extra Shaved 24-Month Parmigiano-Reggiano",
              priceDeltaCents: 350,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant", "watermelon-juice"],
    },
    {
      slug: "garden-salad",
      categorySlug: "soups-salads",
      name: "Garden Salad",
      description: "Locally grown hydro-organic mixed baby greens, shaved English cucumber ribbons, heirloom sweet cherry tomatoes, watermelon radish, Hass avocado slices, toasted pepitas, and cold-pressed extra virgin olive oil vinaigrette.",
      priceCents: 1650,
      imageUrl: "/catalog/kura-kitchen/garden-salad.jpg",
      badgeIds: ["organic"],
      ingredientIds: ["vegan", "gluten_free", "dairy_free", "nut_free"],
      kcal: 210,
      detail: {
        eyebrow: "Soups & Salads",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "8–12 mins",
          },
        ],
        notesPlaceholder: "e.g. dressing on the side, no onions, extra seeds...",
      },
      modifierGroups: [
        {
          name: "Choice of Artisanal Dressing",
          description: "Crafted in-house daily with natural botanicals",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Citrus Herb Vinaigrette",
              description: "Yuzu, cold-pressed olive oil, thyme",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Japanese Roasted Sesame Goma",
              description: "Slow-toasted white sesame, mirin, tamari (Recommended)",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Balsamic Fig Glaze",
              description: "Aged Modena balsamic, organic wild figs",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Creamy Avocado Green Goddess",
              description: "Blended avocado, tarragon, lemon zest",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Salad Add-Ons & Protein",
          description: "Customize your nutrition and texture balance",
          required: false,
          minSelect: 0,
          maxSelect: 6,
          options: [
            {
              name: "Grilled Herb Chicken Breast",
              description: "Sous-vide 120g, rosemary sea salt",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Smoked Atlantic Salmon",
              description: "Cured beechwood slices (60g)",
              priceDeltaCents: 850,
              isDefault: false,
            },
            {
              name: "Pan-Seared Silken Tofu",
              description: "Artisanal non-GMO soy, shoyu marinade",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Crumbled Greek Feta Cheese",
              description: "Brined barrel-aged sheep's milk",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Hard Boiled Omega Egg",
              description: "Pasture raised, jammy yolk center",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Extra Sourdough Croutons",
              description: "House garlic butter baked cubes",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["spanish-latte", "watermelon-juice"],
    },
    {
      slug: "pumpkin-soup",
      categorySlug: "soups-salads",
      name: "Roasted Butternut & Kabocha Pumpkin Soup",
      description: "Slow-roasted butternut and kabocha pumpkin simmered with aromatic leeks, sage, and vegetable mirepoix, velvety smooth with coconut cream swirl, topped with roasted crunchy pepitas and cold-pressed herb oil. Served with warm country sourdough.",
      priceCents: 1600,
      imageUrl: "/catalog/kura-kitchen/pumpkin-soup.jpg",
      badgeIds: ["chef_recommended"],
      ingredientIds: ["vegan", "dairy_free", "contains_gluten", "contains_coconut"],
      kcal: 340,
      detail: {
        eyebrow: "Soups & Salads",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "8–12 mins",
          },
        ],
        notesPlaceholder: "E.g., soup extra hot, serve bread separated...",
      },
      modifierGroups: [
        {
          name: "Bread Selection",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Toasted Country Sourdough (2 Slices)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Garlic Confit Sourdough Toast",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Gluten-Free Seeded Sourdough",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "No Bread",
              priceDeltaCents: -100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Cream & Finish Swirl",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Organic Coconut Cream (Dairy-Free)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "French Crème Fraîche",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Extra Cold-Pressed Herb Olive Oil",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Extra Toppings & Add-Ons",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Extra Toasted Pumpkin Seeds & Pepitas",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Shaved Aged Parmigiano Reggiano",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Crispy Smoked Bacon Bits",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Housemade Golden Garlic Croutons",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant"],
    },
    {
      slug: "wild-mushroom-soup",
      categorySlug: "soups-salads",
      name: "Wild Mushroom Soup",
      description: "Slow-simmered blend of roasted portobello, cremini, and wild shiitake mushrooms enriched with Normandy dairy cream, fresh aromatic thyme, and white truffle oil drizzle. Served with house-baked toasted sourdough croutons.",
      priceCents: 1650,
      imageUrl: "/catalog/kura-kitchen/wild-mushroom-soup.jpg",
      badgeIds: ["made_to_order"],
      ingredientIds: ["vegetarian", "contains_dairy", "contains_gluten", "nut_free"],
      kcal: 310,
      detail: {
        eyebrow: "Soup & Starters",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "8–12 mins",
          },
        ],
        notesPlaceholder: "e.g. less cream, separate croutons...",
      },
      modifierGroups: [
        {
          name: "Serving Temperature",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Steaming Hot (Recommended)",
              description: "Freshly boiled from stovetop ladle",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Warm / Kid Friendly",
              description: "Resting bowl temperature for immediate eating",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sourdough Croutons",
          description: "Select 1 style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Extra Crunchy (On the Side)",
              description: "Served in a small ceramic ramekin",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Floating in Soup",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "No Croutons (Gluten-Sensitive)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Chef Add-Ons & Enhancements",
          description: "Customize your bowl",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Extra Shaved Truffle & Truffle Oil",
              description: "Black winter truffle aroma infusion",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Additional Sourdough Slices (2 pcs)",
              description: "Slow fermented country batard with sea salt butter",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Grated 24-Month Parmigiano Reggiano",
              description: "Aged crystalline umami notes",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Sauteed Wild Forest Mushrooms",
              description: "Pan-seared chanterelle and beech clusters",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["almond-croissant", "v60-pour-over"],
    },
    {
      slug: "hokkien-mee",
      categorySlug: "local-favourites",
      name: "Penang Hokkien Prawn Mee",
      description: "Yellow noodles and rice vermicelli in a rich prawn-and-pork-bone broth, topped with tiger prawns, kangkung, hard-boiled egg and crispy shallots.",
      priceCents: 1750,
      imageUrl: "/catalog/kura-kitchen/hokkien-mee.jpg",
      badgeIds: ["signature"],
      ingredientIds: ["contains_shellfish", "contains_pork", "contains_egg", "contains_soy", "spicy_mild"],
      kcal: 580,
      detail: {
        eyebrow: "Penang Heritage · Prawn Broth",
        heroNote: "Broth simmered 6 hours",
        heroNoteRight: "Penang style",
        stats: [
          {
            label: "Prep Time",
            value: "8–10 mins",
          },
          {
            label: "Broth",
            value: "Prawn Head · 6 Hours",
          },
        ],
        notesPlaceholder: "e.g. no kangkung, less oil, soup extra hot...",
      },
      modifierGroups: [
        {
          name: "Noodle Mix",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Yellow Mee + Bee Hoon (Classic)",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Bee Hoon Only",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Yellow Mee Only",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Sambal Level",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Mild",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Classic",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Pedas",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Add-Ons",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Extra Tiger Prawns (3 pcs)",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Pork Ribs",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Extra Crispy Shallots & Lard",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["iced-lemon-tea", "kopi-o"],
    },
    {
      slug: "roti-jala",
      categorySlug: "local-favourites",
      name: "Roti Jala with Kari Ayam",
      description: "Delicate hand-poured golden turmeric net crepes served with slow-simmered Nyonya chicken curry, tender potatoes, and aromatic coconut spiced gravy.",
      priceCents: 1850,
      imageUrl: "/catalog/kura-kitchen/roti-jala.jpg",
      badgeIds: ["signature"],
      ingredientIds: ["halal", "contains_coconut", "contains_gluten", "contains_egg", "spicy_mild"],
      kcal: 460,
      detail: {
        eyebrow: "Peranakan Heritage Selection",
        heroNote: "Wok-fired to order",
        stats: [
          {
            label: "Prep Time",
            value: "~10 mins",
          },
        ],
        notesPlaceholder: "e.g. Less oil, gravy separated in side bowl, extra coriander...",
      },
      modifierGroups: [
        {
          name: "Portion & Servings",
          description: "Select crepe quantity",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Regular",
              description: "5 pcs Roti Jala + Kari Ayam Bowl",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Large",
              description: "8 pcs Roti Jala + Extra Drumstick & Curry",
              priceDeltaCents: 600,
              isDefault: false,
            },
          ],
        },
        {
          name: "Curry Spice Level",
          description: "Hand-ground rempah heat preference",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Mild",
              description: "Aromatic",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Classic",
              description: "Recommended",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Pedas",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Add-ons & Extra Dippings",
          description: "Enhance your tasting plate",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Extra Roti Jala (3 pcs)",
              description: "Fresh golden lacy crepes",
              priceDeltaCents: 450,
              isDefault: false,
            },
            {
              name: "Extra Curry Gravy Bowl",
              description: "Rich coconut santan reduction",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Soft-Boiled Kampong Egg",
              description: "Organic farm egg with white pepper",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Sambal Tumis Onions",
              description: "Slow caramelized spicy relish",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["kopi-o", "iced-lemon-tea", "basque-burnt-cheesecake"],
    },
    {
      slug: "char-kway-teow",
      categorySlug: "local-favourites",
      name: "Signature Penang Duck Egg Char Kway Teow",
      description: "Wok-tossed flat rice noodles over high cast-iron flame with sea tiger prawns, fresh blood cockles, Chinese cured sausage, duck egg, crunchy pork lard croutons, yellow chives, and premium dark aged soy.",
      priceCents: 1850,
      imageUrl: "/catalog/kura-kitchen/char-kway-teow.jpg",
      badgeIds: ["signature", "best_selling"],
      ingredientIds: ["contains_shellfish", "contains_egg", "contains_pork", "contains_soy", "spicy_medium"],
      kcal: 640,
      detail: {
        eyebrow: "Local Favourites",
        heroNote: "Wok-fired to order",
        heroNoteRight: "Duck egg",
        stats: [
          {
            label: "Prep Time",
            value: "10–12 mins",
          },
          {
            label: "Cook Style",
            value: "High Heat Wok Hei",
          },
        ],
        notesPlaceholder: "e.g. Please sear cockles slightly well-done, extra calamansi lime on the side...",
      },
      modifierGroups: [
        {
          name: "Wok Hei & Heat Level",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Signature Char & Smokiness (Standard)",
              description: "Balanced caramelization, wok breath",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Wok Hei (Smoky & Charred edges)",
              description: "High scorched aroma & crisp rice noodle",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Gentle Fry (Mild char)",
              description: "Reduced scorched edges, smoother noodle",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Egg Selection",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Premium Pasture Duck Egg",
              description: "Rich golden yolk, deeper umami profile",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Double Duck Egg",
              description: "Extra luscious coat over every noodle strand",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Farm Fresh Chicken Egg",
              description: "Lighter, classic homestyle texture",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Chili & Sambal Intensity",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Medium Spicy",
              description: "Authentic Penang Heat",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Extra Spicy",
              description: "Bird's Eye Chili Kick",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Mild",
              description: "Gentle aroma",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Non-Spicy",
              description: "No chili",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Gourmet Add-Ons & Ingredients",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Crispy Pork Lard Cracklings",
              priceDeltaCents: 200,
              isDefault: true,
            },
            {
              name: "Extra Plump Sea Tiger Prawns (3 pcs)",
              priceDeltaCents: 600,
              isDefault: false,
            },
            {
              name: "Extra Blood Cockles (Kerang)",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Lup Cheong Slices",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dietary & Prep Preferences",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "No Bean Sprouts (Taugeh)",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "No Cockles",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "No Chinese Chives (Ku Chai)",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Halal Prep Style",
              description: "No Pork / No Lard, Fried in Plant Oil",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["iced-lemon-tea"],
    },
    {
      slug: "buffalo-wings",
      categorySlug: "sides-snacks",
      name: "Crispy Buffalo Chicken Wings",
      description: "Twice-fried free-range chicken wings tossed in a tangy Louisiana-style red hot glaze, served with celery batons and a house blue cheese dip.",
      priceCents: 1950,
      imageUrl: "/catalog/kura-kitchen/buffalo-wings.jpg",
      badgeIds: ["best_selling"],
      ingredientIds: ["contains_dairy", "contains_gluten", "spicy_medium", "halal"],
      kcal: 610,
      detail: {
        eyebrow: "Sides & Snacks · Kitchen Specialty",
        heroNote: "Fried to order",
        heroNoteRight: "Twice fried",
        stats: [
          {
            label: "Prep Time",
            value: "10–12 mins",
          },
          {
            label: "Glaze",
            value: "Louisiana Red Hot",
          },
        ],
        notesPlaceholder: "e.g. sauce on the side, extra crispy...",
      },
      modifierGroups: [
        {
          name: "Heat Level",
          description: "Pick your glaze intensity",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Medium",
              description: "Balanced tang and heat",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Mild Honey Buffalo",
              description: "Sweeter, gentle heat",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra Hot Habanero",
              description: "For heat seekers",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Portion",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "6 pieces",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "12 pieces sharing",
              priceDeltaCents: 1600,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dips & Extras",
          description: "Served in ramekins",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Extra Blue Cheese Dip",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Ranch Dip",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Extra Celery & Carrot Batons",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["coca-cola", "truffle-fries"],
    },
    {
      slug: "truffle-fries",
      categorySlug: "sides-snacks",
      name: "Hand-Cut Truffle & Rosemary Sea Salt Fries",
      description: "Twice-cooked hand-cut Russet potatoes tossed in aromatic fresh garden rosemary, Maldon flaky sea salt, and white truffle oil. Served piping hot with your choice of artisanal dipping emulsion.",
      priceCents: 1600,
      imageUrl: "/catalog/kura-kitchen/truffle-fries.jpg",
      badgeIds: ["best_selling"],
      ingredientIds: ["vegetarian", "contains_dairy", "gluten_free", "contains_egg"],
      kcal: 520,
      detail: {
        eyebrow: "Artisanal Sides · Kitchen Specialty",
        heroNote: "Made fresh to order",
        stats: [
          {
            label: "Prep Time",
            value: "8–10 mins",
          },
          {
            label: "Cut Profile",
            value: "7mm Shoestring",
          },
        ],
        notesPlaceholder: "E.g., Extra crispy, pack salt separately, severe peanut allergy alert...",
      },
      modifierGroups: [
        {
          name: "Cut Style & Seasoning",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Shoestring (7mm Ultra Crisp)",
              description: "Standard kitchen cut, golden fried",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Rustic Thick-Cut Wedge",
              description: "Fluffy potato center, crispy skin",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Sweet Potato Fries",
              description: "Natural sweetness, artisanal batter",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Truffle & Cheese Finishing",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Shaved Aged Parmigiano & Truffle Oil",
              description: "24-month Parmigiano Reggiano",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Double Truffle Glaze & Micro-Herbs",
              description: "Intense umami profile with fresh parsley",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Light Sea Salt & Cracked Black Pepper",
              description: "Dairy-free option (No Cheese)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Housemade Dipping Sauce",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Black Truffle Garlic Aioli",
              description: "Chef's signature cold emulsion",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Smoked Paprika & Chipotle Mayo",
              description: "Warm smokiness with mild piquancy",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Fermented Sriracha Kewpie",
              description: "Tangy, rich, and moderately spicy",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Classic Organic Tomato Chutney Ketchup",
              description: "Slow-simmered vine tomatoes",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Extra Dips & Accompaniments",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Extra Black Truffle Aioli",
              description: "+40g portion ramekin",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Melted Cheddar Mornay Cheese Dip",
              description: "Warm velvety cheese sauce",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Crispy Smoked Bacon Bits",
              description: "Applewood cold-smoked crumble",
              priceDeltaCents: 300,
              isDefault: false,
            },
            {
              name: "Extra Maldon Sea Salt on the side",
              description: "Finishing flake pinch pot",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["watermelon-juice", "spanish-latte"],
    },
    {
      slug: "tiramisu",
      categorySlug: "desserts-pastries",
      name: "Classic Venetian Tiramisu",
      description: "Traditional Treviso-style tiramisu made with artisanal Savoiardi sponge ladyfingers steeped in freshly pulled single-origin Ethiopian espresso and Marsala reduction, layered with velvety whipped Lombardy mascarpone cream sabayon, and finished with…",
      priceCents: 1800,
      imageUrl: "/catalog/kura-kitchen/tiramisu.jpg",
      badgeIds: ["chef_recommended"],
      ingredientIds: ["contains_dairy", "contains_egg", "contains_gluten", "contains_alcohol", "contains_caffeine", "vegetarian"],
      kcal: 430,
      detail: {
        eyebrow: "Authentic Italian Dolce · Traditional Recipe",
        heroNote: "Layered daily",
        heroNoteRight: "Espresso soaked",
        stats: [
          {
            label: "Prep Time",
            value: "2–3 mins",
          },
          {
            label: "Espresso",
            value: "Single Origin",
          },
        ],
        notesPlaceholder: "Allergen notes or dietary requests...",
      },
      modifierGroups: [
        {
          name: "Portion & Presentation",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Coupe Dish (160g)",
              description: "Chef Recommended",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Grande Sharing Plate (280g)",
              description: "Double layers",
              priceDeltaCents: 1000,
              isDefault: false,
            },
            {
              name: "Takeaway Chilled Glass Jar",
              description: "Eco-Friendly presentation",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Espresso Soak & Infusion",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Traditional Single-Origin Espresso & Marsala",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Alcohol-Free Espresso & Dark Cocoa Brew",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Kyoto 24h Cold Drip & Spiced Rum Infusion",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Decaf Swiss-Water Ethiopian Espresso",
              priceDeltaCents: 100,
              isDefault: false,
            },
          ],
        },
        {
          name: "Gourmet Finishing & Texture",
          required: false,
          minSelect: 0,
          maxSelect: 5,
          options: [
            {
              name: "Extra Heavy Valrhona 100% Cocoa Dusting",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Handcrafted Hazelnut Praline Feuilletine",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Shaved 70% Single-Estate Dark Chocolate Curls",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Housemade Amaretto Espresso Liqueur Pipette",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Crushed Italian Caramelized Cantucci Biscotti",
              priceDeltaCents: 200,
              isDefault: false,
            },
          ],
        },
        {
          name: "Service & Accompaniment",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Chilled Clean",
              description: "Standard presentation",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Side of Warm Salted Espresso Crema",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Side of Pistachio Chantilly Cream",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dietary & Service Requests",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Serve immediately after mains",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Birthday candle & message card",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra dessert spoons for sharing",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["v60-pour-over"],
    },
    {
      slug: "almond-croissant",
      categorySlug: "desserts-pastries",
      name: "Double-Baked Almond Croissant Au Beurre",
      description: "72-hour slow-fermented laminated pastry made with Normandy A.O.P. cultured butter, filled with rich slow-roasted California almond frangipane cream, twice-baked to a deep golden flake, and crowned with toasted sliced almonds and powdered sugar snow.",
      priceCents: 1450,
      imageUrl: "/catalog/kura-kitchen/almond-croissant.jpg",
      badgeIds: ["fresh_daily", "best_selling"],
      ingredientIds: ["contains_nuts", "contains_dairy", "contains_gluten", "contains_egg", "vegetarian"],
      kcal: 420,
      detail: {
        eyebrow: "French Viennoiserie · Artisan Bakery",
        heroNote: "Baked fresh daily at 07:30",
        heroNoteRight: "Twice baked",
        stats: [
          {
            label: "Prep Time",
            value: "3–5 mins",
          },
          {
            label: "Butter",
            value: "Normandy A.O.P.",
          },
        ],
        notesPlaceholder: "Special warming, allergen alerts, or packaging notes...",
      },
      modifierGroups: [
        {
          name: "Warming & Service Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Warmed & Crisp",
              description: "Toasted to 65°C for flaky crust & molten almond core",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Room Temperature / As-Is",
              description: "Natural flaky texture, freshly rested from morning bake",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra Crispy & Well-Toasted",
              description: "Extended deck oven re-heat for caramelized crunch",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Frangipane Filling & Style",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Signature Roasted Almond Frangipane",
              description: "Chef balanced sweetness & aromatic Madagascar vanilla",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Light Frangipane",
              description: "Subtle almond essence, reduced sugar profile",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Valrhona 70% Dark Chocolate & Almond Swirl",
              description: "Guanaja chocolate ganache ribbons folded through",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Gourmet Accompaniments & Spreads",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Artisan Salted Espresso Butter (30g)",
              description: "Whipped with Maldon sea salt flakes",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Housemade Wild Strawberry & Vanilla Bean Confiture",
              description: "Slow-simmered small batch preserves",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "French Clotted Cream & Organic Wildflower Honey",
              description: "Velvety dairy paired with local raw honey",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Extra Toasted Crunchy Sliced Almonds",
              description: "Served in a porcelain ramekin side",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dusting & Finishing",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Sugar",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Ceylon Cinnamon",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Valrhona Cocoa",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Naked (No Sugar)",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dietary & Service Requests",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Slice in half for sharing",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Serve with pastry fork & serrated knife",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Packed in eco-friendly bakery box for takeaway",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["flat-white"],
    },
    {
      slug: "italian-gelato",
      categorySlug: "desserts-pastries",
      name: "Handcrafted Gelato",
      description: "Slow-churned small batch Italian gelato with pure Madagascar bourbon vanilla & Bronte roasted pistachios. Served fresh with balanced texture and rustic simplicity.",
      priceCents: 1600,
      imageUrl: "/catalog/kura-kitchen/italian-gelato.jpg",
      badgeIds: ["fresh_daily"],
      ingredientIds: ["contains_dairy", "contains_nuts", "vegetarian", "gluten_free"],
      kcal: 280,
      detail: {
        eyebrow: "Desserts & Pastries",
        heroNote: "Churned in-house daily",
        heroNoteRight: "Small batch",
        stats: [
          {
            label: "Prep Time",
            value: "3–5 mins",
          },
        ],
        notesPlaceholder: "e.g. serve waffle tuile on side, extra napkins...",
      },
      modifierGroups: [
        {
          name: "Scoop Selection",
          description: "Select exactly 2 flavors (included)",
          required: true,
          minSelect: 2,
          maxSelect: 2,
          options: [
            {
              name: "Madagascar Bourbon Vanilla Bean",
              description: "Speckled with single-origin beans",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Bronte Roasted Pistachio",
              description: "DOP Sicily, lightly salted",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Valrhona 70% Dark Chocolate",
              description: "Bittersweet Guanaja cocoa",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Alphonso Mango Sorbetto",
              description: "Dairy-Free & refreshing",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Sicilian Blood Orange & Raspberry",
              description: "Dairy-Free crisp citrus",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Serving Style",
          description: "Choose 1 preference",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Fluted Ceramic Coupe / Chilled Cup",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Artisanal Waffle Cone",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Brioche Bun Gelato Sando",
              priceDeltaCents: 450,
              isDefault: false,
            },
          ],
        },
        {
          name: "Gourmet Toppings",
          description: "Optional additions",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "Crushed Caramelized Bronte Pistachios",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Warm Valrhona Dark Chocolate Fudge",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Salted Caramel Drizzle",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Crisp Almond Waffle Tuile",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["long-black", "vanilla-pistachio-gelato"],
    },
    {
      slug: "vanilla-pistachio-gelato",
      categorySlug: "desserts-pastries",
      name: "Madagascar Vanilla & Bronte Pistachio Gelato",
      description: "Slow-churned small batch artisanal Italian gelato crafted with fresh Jersey cow milk, organic vanilla bean caviar from Madagascar, and roasted D.O.P. Bronte pistachios. Ultra-silky density with low overrun, served in a chilled ceramic coupe.",
      priceCents: 1600,
      imageUrl: "/catalog/kura-kitchen/vanilla-pistachio-gelato.jpg",
      badgeIds: ["fresh_daily"],
      ingredientIds: ["contains_dairy", "contains_nuts", "vegetarian", "gluten_free"],
      kcal: 300,
      detail: {
        eyebrow: "Italian Artisan Gelato · House Churned",
        heroNote: "Churned in-house daily",
        heroNoteRight: "Small batch",
        stats: [
          {
            label: "Prep Time",
            value: "2–4 mins",
          },
          {
            label: "Milk",
            value: "Jersey Cow",
          },
        ],
        notesPlaceholder: "Dietary preferences, allergies, or special serving instructions...",
      },
      modifierGroups: [
        {
          name: "Scoop Configuration & Size",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Double Scoop (140g)",
              description: "Standard · Chef Recommended",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Single Scoop (75g)",
              description: "Petite portion",
              priceDeltaCents: -400,
              isDefault: false,
            },
            {
              name: "Triple Tasting Flight (210g)",
              description: "Includes crispy waffle wafer",
              priceDeltaCents: 550,
              isDefault: false,
            },
          ],
        },
        {
          name: "Flavor Pairing & Selection",
          required: true,
          minSelect: 2,
          maxSelect: 2,
          options: [
            {
              name: "Madagascar Bourbon Vanilla Bean",
              description: "Organic flecked vanilla caviar",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Roasted Sicilian Bronte Pistachio",
              description: "Pure D.O.P. pistachio paste",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "72% Valrhona Dark Chocolate Ganache",
              description: "Intense bittersweet cocoa",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Alfonso Mango & Passionfruit Sorbet",
              description: "Dairy-Free · Plant Based",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Kyoto Ceremonial Uji Matcha",
              description: "First harvest stoneground",
              priceDeltaCents: 150,
              isDefault: false,
            },
          ],
        },
        {
          name: "Gourmet Toppings & Textures",
          required: false,
          minSelect: 0,
          maxSelect: 5,
          options: [
            {
              name: "Crushed Caramelized Sicilian Pistachios",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Handcrafted Butter Waffle Crisp",
              priceDeltaCents: 150,
              isDefault: false,
            },
            {
              name: "Warm Salted Valrhona Fudge Drizzle",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Organic Honeycomb & Maldon Sea Salt Flakes",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Fresh Wild Raspberries & Mint Sprig",
              priceDeltaCents: 250,
              isDefault: false,
            },
          ],
        },
        {
          name: "Serving Style & Vessel",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Chilled Fluted Ceramic Bowl",
              description: "Signature dine-in experience",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Housemade Warm Waffle Cone",
              description: "Freshly pressed with vanilla butter",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Affogato Style (+ Hot Double Ristretto)",
              description: "Served with hot espresso on the side",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Takeaway Eco-Insulated Cup with Spoon",
              description: "100% compostable fiber container",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Dietary & Service Requests",
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            {
              name: "Serve immediately after mains",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Separate toppings in ramekin",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Extra dessert spoons for sharing",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["long-black"],
    },
    {
      slug: "basque-burnt-cheesecake",
      categorySlug: "desserts-pastries",
      name: "San Sebastian Basque Burnt Cheesecake",
      description: "Traditional San Sebastian recipe baked at intensely high temperatures for a caramelized, blistered exterior yielding to a rich, molten cream cheese center.",
      priceCents: 1650,
      imageUrl: "/catalog/kura-kitchen/basque-burnt-cheesecake.jpg",
      badgeIds: ["fresh_daily", "chef_recommended"],
      ingredientIds: ["contains_dairy", "contains_egg", "gluten_free", "vegetarian"],
      kcal: 390,
      detail: {
        eyebrow: "Patisserie D'Auteur · Bakery & Dessert",
        heroNote: "Oven baked daily",
        heroNoteRight: "San Sebastián recipe",
        stats: [
          {
            label: "Prep Time",
            value: "3–5 mins",
          },
          {
            label: "Origin",
            value: "Basque Country",
          },
        ],
        notesPlaceholder: "Allergen alerts, candle request, or special notes...",
      },
      modifierGroups: [
        {
          name: "Serving Temperature & Core Texture",
          description: "Choose the optimal core fluidity upon table arrival.",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Chilled & Set Core",
              description: "Clean silky slice, velvety firm texture",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Room Temperature / Molten Center",
              description: "Soft gooey lava core, authentic San Sebastian style",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Gently Warmed Crust",
              description: "Deck oven flashed for 30s to accentuate caramel aromas",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
        {
          name: "Infusion & Flavor Profile",
          description: "Infused dairy base layered into the custard batter.",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Classic Bourbon Vanilla Bean",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Ceremonial Uji Matcha Swirl",
              priceDeltaCents: 350,
              isDefault: false,
            },
            {
              name: "Valrhona 70% Dark Chocolate Marbled",
              priceDeltaCents: 400,
              isDefault: false,
            },
            {
              name: "Lotus Biscoff Caramelized Crunch Swirl",
              priceDeltaCents: 300,
              isDefault: false,
            },
          ],
        },
        {
          name: "Gourmet Coulis & Accompaniments",
          description: "Served in individual ceramic pouring ramekins.",
          required: false,
          minSelect: 0,
          maxSelect: 4,
          options: [
            {
              name: "House Wild Berry Compote",
              description: "Slow-simmered blackberries & raspberries",
              priceDeltaCents: 250,
              isDefault: false,
            },
            {
              name: "Maldon Smoked Sea Salt Flakes",
              description: "Served on the side to balance rich dairy notes",
              priceDeltaCents: 100,
              isDefault: false,
            },
            {
              name: "Organic Chantilly Whipped Cream",
              description: "Infused with raw cane sugar & lime zest",
              priceDeltaCents: 200,
              isDefault: false,
            },
            {
              name: "Sicilian Pistachio Crema Drizzle",
              description: "Pure Bronte pistachio stone-ground cream",
              priceDeltaCents: 350,
              isDefault: false,
            },
          ],
        },
        {
          name: "Plating & Cutlery Preference",
          description: "Specified presentation for table service.",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          options: [
            {
              name: "Dine-In Ceramic Plate with Dessert Fork",
              priceDeltaCents: 0,
              isDefault: true,
            },
            {
              name: "Packed in Artisanal Biodegradable Bakery Box",
              priceDeltaCents: 0,
              isDefault: false,
            },
            {
              name: "Slice in half with 2 dessert forks for sharing",
              priceDeltaCents: 0,
              isDefault: false,
            },
          ],
        },
      ],
      upsellSlugs: ["v60-pour-over"],
    },
  ],
};
