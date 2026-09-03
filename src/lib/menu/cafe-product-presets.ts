/**
 * Curated starter products for MY/SG cafe menus.
 * Prices are starting suggestions in cents (MYR / SGD) — merchants can edit after add.
 */

import type { MerchantCurrency } from "@/lib/merchant/currency";

export type CafeProductPreset = {
  slug: string;
  /** Matches cafe category preset slug */
  categorySlug: string;
  name: string;
  description: string;
  priceMyrCents: number;
  priceSgdCents: number;
  tags?: string[];
  /** Apply coffee drink modifier template when category is coffee */
  useCoffeeModifiers?: boolean;
  /**
   * Typical serving energy (kcal). Only set when backed by a cited source
   * in docs/MENU_PRESET_KCAL.md (USDA FoodData Central or HPB/SHF).
   */
  kcal?: number;
  /** Typical serving total sugars (g), when the same source reports it. */
  sugarG?: number;
};

export const CAFE_PRODUCT_PRESETS: CafeProductPreset[] = [
  // —— Coffee ——
  {
    slug: "espresso",
    categorySlug: "coffee",
    name: "Espresso",
    description: "Single shot. Rich crema, short and bold.",
    priceMyrCents: 800,
    priceSgdCents: 350,
    tags: ["hot"],
    useCoffeeModifiers: true,
    kcal: 5,
    sugarG: 0,
  },
  {
    slug: "americano",
    categorySlug: "coffee",
    name: "Americano",
    description: "Espresso topped with hot water. Clean and classic.",
    priceMyrCents: 1000,
    priceSgdCents: 450,
    tags: ["hot", "iced"],
    useCoffeeModifiers: true,
    kcal: 10,
    sugarG: 0,
  },
  {
    slug: "latte",
    categorySlug: "coffee",
    name: "Latte",
    description: "Double espresso with steamed milk. Smooth and creamy.",
    priceMyrCents: 1200,
    priceSgdCents: 550,
    tags: ["hot", "iced"],
    useCoffeeModifiers: true,
    kcal: 155,
    sugarG: 15,
  },
  {
    slug: "cappuccino",
    categorySlug: "coffee",
    name: "Cappuccino",
    description: "Equal parts espresso, steamed milk, and foam.",
    priceMyrCents: 1200,
    priceSgdCents: 550,
    tags: ["hot"],
    useCoffeeModifiers: true,
    kcal: 65,
    sugarG: 6,
  },
  {
    slug: "flat-white",
    categorySlug: "coffee",
    name: "Flat White",
    description: "Velvety microfoam over double ristretto.",
    priceMyrCents: 1300,
    priceSgdCents: 580,
    tags: ["hot"],
    useCoffeeModifiers: true,
    kcal: 120,
    sugarG: 11,
  },
  {
    slug: "mocha",
    categorySlug: "coffee",
    name: "Mocha",
    description: "Espresso, chocolate, and steamed milk.",
    priceMyrCents: 1400,
    priceSgdCents: 620,
    tags: ["hot", "iced"],
    useCoffeeModifiers: true,
    kcal: 290,
  },
  {
    slug: "pour-over",
    categorySlug: "coffee",
    name: "Pour Over",
    description: "Single-origin filter brew. Bright and aromatic.",
    priceMyrCents: 1400,
    priceSgdCents: 650,
    tags: ["hot", "filter"],
    useCoffeeModifiers: true,
    kcal: 5,
    sugarG: 0,
  },

  // —— Kopi & Teh ——
  {
    slug: "kopi",
    categorySlug: "kopi",
    name: "Kopi",
    description: "Traditional local coffee with condensed milk.",
    priceMyrCents: 350,
    priceSgdCents: 180,
    tags: ["local", "hot"],
    kcal: 135,
    sugarG: 17.5,
  },
  {
    slug: "kopi-o",
    categorySlug: "kopi",
    name: "Kopi-O",
    description: "Black coffee with sugar. No milk.",
    priceMyrCents: 300,
    priceSgdCents: 160,
    tags: ["local", "hot"],
    kcal: 66,
  },
  {
    slug: "teh-tarik",
    categorySlug: "kopi",
    name: "Teh Tarik",
    description: "Pulled milk tea. Frothy and fragrant.",
    priceMyrCents: 350,
    priceSgdCents: 180,
    tags: ["local", "hot"],
    kcal: 229,
    sugarG: 41,
  },
  {
    slug: "yuan-yang",
    categorySlug: "kopi",
    name: "Yuan Yang",
    description: "Coffee + tea mix with condensed milk.",
    priceMyrCents: 400,
    priceSgdCents: 200,
    tags: ["local", "hot", "iced"],
    kcal: 150,
  },

  // —— Non-coffee ——
  {
    slug: "matcha-latte",
    categorySlug: "non-coffee",
    name: "Matcha Latte",
    description: "Ceremonial-grade matcha with steamed milk.",
    priceMyrCents: 1400,
    priceSgdCents: 620,
    tags: ["hot", "iced"],
  },
  {
    slug: "hot-chocolate",
    categorySlug: "non-coffee",
    name: "Hot Chocolate",
    description: "Rich cocoa with steamed milk.",
    priceMyrCents: 1200,
    priceSgdCents: 550,
    tags: ["hot"],
  },
  {
    slug: "chai-latte",
    categorySlug: "non-coffee",
    name: "Chai Latte",
    description: "Spiced tea concentrate with steamed milk.",
    priceMyrCents: 1300,
    priceSgdCents: 580,
    tags: ["hot", "iced"],
  },
  {
    slug: "english-breakfast-tea",
    categorySlug: "non-coffee",
    name: "English Breakfast Tea",
    description: "Classic black tea. Served with milk or lemon on request.",
    priceMyrCents: 800,
    priceSgdCents: 400,
    tags: ["hot", "tea"],
  },

  // —— Cold drinks ——
  {
    slug: "iced-latte",
    categorySlug: "cold-drinks",
    name: "Iced Latte",
    description: "Espresso over ice with cold milk.",
    priceMyrCents: 1300,
    priceSgdCents: 580,
    tags: ["iced"],
    useCoffeeModifiers: true,
    kcal: 155,
    sugarG: 15,
  },
  {
    slug: "frappe",
    categorySlug: "cold-drinks",
    name: "Coffee Frappe",
    description: "Blended ice coffee. Sweet and creamy.",
    priceMyrCents: 1500,
    priceSgdCents: 650,
    tags: ["iced", "blended"],
    kcal: 290,
  },
  {
    slug: "brown-sugar-milk",
    categorySlug: "cold-drinks",
    name: "Brown Sugar Milk",
    description: "Cold milk with house brown sugar syrup.",
    priceMyrCents: 1200,
    priceSgdCents: 550,
    tags: ["iced"],
    kcal: 200,
  },

  // —— Fresh juices ——
  {
    slug: "orange-juice",
    categorySlug: "fresh-juices",
    name: "Fresh Orange Juice",
    description: "Freshly squeezed. No concentrate.",
    priceMyrCents: 1200,
    priceSgdCents: 550,
    tags: ["fresh"],
    kcal: 120,
    sugarG: 21,
  },
  {
    slug: "watermelon-juice",
    categorySlug: "fresh-juices",
    name: "Watermelon Juice",
    description: "Chilled fresh watermelon.",
    priceMyrCents: 1100,
    priceSgdCents: 500,
    tags: ["fresh"],
    kcal: 75,
    sugarG: 16,
  },
  {
    slug: "lemonade",
    categorySlug: "fresh-juices",
    name: "Fresh Lemonade",
    description: "House lemonade. Lightly sweetened.",
    priceMyrCents: 1000,
    priceSgdCents: 480,
    tags: ["fresh"],
    kcal: 115,
    sugarG: 29,
  },
  {
    slug: "green-apple-juice",
    categorySlug: "fresh-juices",
    name: "Green Apple Juice",
    description: "Tart fresh green apple. No concentrate.",
    priceMyrCents: 1200,
    priceSgdCents: 550,
    tags: ["fresh"],
    kcal: 115,
    sugarG: 24,
  },
  {
    slug: "carrot-juice",
    categorySlug: "fresh-juices",
    name: "Carrot Juice",
    description: "Fresh pressed carrot. Earthy and sweet.",
    priceMyrCents: 1100,
    priceSgdCents: 500,
    tags: ["fresh"],
    kcal: 95,
    sugarG: 16,
  },

  // —— Signature drinks ——
  {
    slug: "gula-melaka-latte",
    categorySlug: "signature-drinks",
    name: "Gula Melaka Latte",
    description: "Espresso with coconut palm sugar syrup and milk.",
    priceMyrCents: 1500,
    priceSgdCents: 650,
    tags: ["signature", "local"],
    useCoffeeModifiers: true,
    kcal: 200,
    sugarG: 24,
  },
  {
    slug: "pandan-latte",
    categorySlug: "signature-drinks",
    name: "Pandan Latte",
    description: "Espresso, pandan syrup, and steamed milk.",
    priceMyrCents: 1500,
    priceSgdCents: 650,
    tags: ["signature", "local"],
    useCoffeeModifiers: true,
    kcal: 200,
    sugarG: 24,
  },
  {
    slug: "sea-salt-latte",
    categorySlug: "signature-drinks",
    name: "Sea Salt Latte",
    description: "Espresso latte finished with sea salt cream.",
    priceMyrCents: 1600,
    priceSgdCents: 680,
    tags: ["signature"],
    useCoffeeModifiers: true,
    kcal: 210,
    sugarG: 16,
  },

  // —— Brunch ——
  {
    slug: "eggs-benedict",
    categorySlug: "brunch",
    name: "Eggs Benedict",
    description: "Poached eggs, hollandaise, toasted English muffin.",
    priceMyrCents: 2800,
    priceSgdCents: 1800,
    tags: ["brunch"],
  },
  {
    slug: "avocado-toast",
    categorySlug: "brunch",
    name: "Avocado Toast",
    description: "Smashed avocado on sourdough with chilli flakes.",
    priceMyrCents: 2200,
    priceSgdCents: 1600,
    tags: ["brunch", "vegetarian"],
  },
  {
    slug: "big-breakfast",
    categorySlug: "brunch",
    name: "Big Breakfast",
    description: "Eggs, sausages, mushrooms, toast, and beans.",
    priceMyrCents: 3200,
    priceSgdCents: 2200,
    tags: ["brunch"],
  },
  {
    slug: "french-toast",
    categorySlug: "brunch",
    name: "French Toast",
    description: "Brioche French toast with maple syrup and berries.",
    priceMyrCents: 2400,
    priceSgdCents: 1700,
    tags: ["brunch", "sweet"],
  },
  {
    slug: "shakshuka",
    categorySlug: "brunch",
    name: "Shakshuka",
    description: "Eggs baked in spiced tomato sauce. Served with toast.",
    priceMyrCents: 2600,
    priceSgdCents: 1800,
    tags: ["brunch"],
  },

  // —— Pastries ——
  {
    slug: "butter-croissant",
    categorySlug: "pastries",
    name: "Butter Croissant",
    description: "Flaky, buttery layers baked fresh.",
    priceMyrCents: 800,
    priceSgdCents: 450,
    tags: ["baked"],
    kcal: 230,
    sugarG: 6,
  },
  {
    slug: "pain-au-chocolat",
    categorySlug: "pastries",
    name: "Pain au Chocolat",
    description: "Dark chocolate batons in laminated pastry.",
    priceMyrCents: 950,
    priceSgdCents: 500,
    tags: ["baked"],
    kcal: 295,
    sugarG: 14,
  },
  {
    slug: "banana-bread",
    categorySlug: "pastries",
    name: "Banana Bread",
    description: "House banana loaf. Toasted on request.",
    priceMyrCents: 900,
    priceSgdCents: 480,
    tags: ["baked"],
  },
  {
    slug: "cinnamon-roll",
    categorySlug: "pastries",
    name: "Cinnamon Roll",
    description: "Soft roll with cinnamon sugar and glaze.",
    priceMyrCents: 1000,
    priceSgdCents: 550,
    tags: ["baked"],
  },

  // —— Sandwiches ——
  {
    slug: "club-sandwich",
    categorySlug: "sandwiches",
    name: "Club Sandwich",
    description: "Chicken, egg, lettuce, and mayo on toasted bread.",
    priceMyrCents: 1800,
    priceSgdCents: 1400,
    tags: ["lunch"],
  },
  {
    slug: "grilled-cheese",
    categorySlug: "sandwiches",
    name: "Grilled Cheese",
    description: "Melted cheddar on sourdough.",
    priceMyrCents: 1400,
    priceSgdCents: 1100,
    tags: ["vegetarian"],
  },
  {
    slug: "tuna-melt",
    categorySlug: "sandwiches",
    name: "Tuna Melt",
    description: "Tuna mayo and cheese, grilled until golden.",
    priceMyrCents: 1600,
    priceSgdCents: 1200,
    tags: ["lunch"],
  },

  // —— Mains ——
  {
    slug: "aglio-olio",
    categorySlug: "mains",
    name: "Aglio Olio",
    description: "Spaghetti with garlic, chilli, and olive oil. Add chicken optional.",
    priceMyrCents: 2200,
    priceSgdCents: 1600,
    tags: ["pasta"],
  },
  {
    slug: "creamy-mushroom-pasta",
    categorySlug: "mains",
    name: "Creamy Mushroom Pasta",
    description: "Fettuccine in house mushroom cream sauce.",
    priceMyrCents: 2400,
    priceSgdCents: 1700,
    tags: ["pasta"],
  },
  {
    slug: "chicken-chop",
    categorySlug: "mains",
    name: "Grilled Chicken Chop",
    description: "Grilled chicken with sides and house gravy.",
    priceMyrCents: 2600,
    priceSgdCents: 1800,
    tags: ["grilled"],
  },
  {
    slug: "teriyaki-bowl",
    categorySlug: "mains",
    name: "Teriyaki Chicken Bowl",
    description: "Rice bowl with teriyaki chicken and vegetables.",
    priceMyrCents: 2200,
    priceSgdCents: 1600,
    tags: ["bowl"],
  },

  // —— Rice & noodles ——
  {
    slug: "nasi-lemak",
    categorySlug: "rice-noodles",
    name: "Nasi Lemak",
    description: "Coconut rice, sambal, egg, peanuts, and anchovies.",
    priceMyrCents: 1200,
    priceSgdCents: 800,
    tags: ["local"],
    kcal: 550,
  },
  {
    slug: "mie-goreng",
    categorySlug: "rice-noodles",
    name: "Mee Goreng",
    description: "Wok-fried noodles with vegetables and egg.",
    priceMyrCents: 1400,
    priceSgdCents: 900,
    tags: ["local"],
    kcal: 520,
  },
  {
    slug: "chicken-rice",
    categorySlug: "rice-noodles",
    name: "Chicken Rice",
    description: "Poached chicken with fragrant rice and chilli.",
    priceMyrCents: 1400,
    priceSgdCents: 850,
    tags: ["local"],
    kcal: 525,
  },

  // —— Salads & bowls ——
  {
    slug: "garden-salad",
    categorySlug: "salads",
    name: "Garden Salad",
    description: "Mixed greens, tomato, cucumber, house dressing.",
    priceMyrCents: 1600,
    priceSgdCents: 1200,
    tags: ["vegetarian"],
  },
  {
    slug: "acai-bowl",
    categorySlug: "salads",
    name: "Acai Bowl",
    description: "Acai base with granola, banana, and berries.",
    priceMyrCents: 2200,
    priceSgdCents: 1500,
    tags: ["bowl", "sweet"],
  },
  {
    slug: "caesar-salad",
    categorySlug: "salads",
    name: "Chicken Caesar Salad",
    description: "Romaine, grilled chicken, parmesan, caesar dressing.",
    priceMyrCents: 2200,
    priceSgdCents: 1600,
    tags: ["salad"],
  },

  // —— Light bites ——
  {
    slug: "truffle-fries",
    categorySlug: "light-bites",
    name: "Truffle Fries",
    description: "Crispy fries with truffle oil and parmesan.",
    priceMyrCents: 1600,
    priceSgdCents: 1200,
    tags: ["share"],
  },
  {
    slug: "garlic-bread",
    categorySlug: "light-bites",
    name: "Garlic Bread",
    description: "Toasted baguette with garlic butter.",
    priceMyrCents: 1000,
    priceSgdCents: 700,
    tags: ["share"],
  },
  {
    slug: "chicken-wings",
    categorySlug: "light-bites",
    name: "Chicken Wings",
    description: "Crispy wings with house dipping sauce.",
    priceMyrCents: 1800,
    priceSgdCents: 1400,
    tags: ["share"],
  },

  // —— Desserts ——
  {
    slug: "waffle",
    categorySlug: "desserts",
    name: "Classic Waffle",
    description: "Belgian waffle with maple syrup and butter.",
    priceMyrCents: 1600,
    priceSgdCents: 1200,
    tags: ["sweet"],
  },
  {
    slug: "brownie",
    categorySlug: "desserts",
    name: "Chocolate Brownie",
    description: "Warm brownie with ice cream.",
    priceMyrCents: 1400,
    priceSgdCents: 1100,
    tags: ["sweet"],
  },
  {
    slug: "tiramisu",
    categorySlug: "desserts",
    name: "Tiramisu",
    description: "Classic coffee-soaked sponge with mascarpone.",
    priceMyrCents: 1800,
    priceSgdCents: 1400,
    tags: ["sweet"],
  },

  // —— Cakes & bakes ——
  {
    slug: "cheesecake",
    categorySlug: "cakes",
    name: "New York Cheesecake",
    description: "Dense baked cheesecake slice.",
    priceMyrCents: 1600,
    priceSgdCents: 1200,
    tags: ["slice"],
  },
  {
    slug: "chocolate-cake",
    categorySlug: "cakes",
    name: "Chocolate Cake",
    description: "Rich chocolate layer cake slice.",
    priceMyrCents: 1500,
    priceSgdCents: 1100,
    tags: ["slice"],
  },
  {
    slug: "cookie",
    categorySlug: "cakes",
    name: "Chocolate Chip Cookie",
    description: "Fresh-baked cookie. Soft centre.",
    priceMyrCents: 600,
    priceSgdCents: 350,
    tags: ["baked"],
  },

  // —— Sides ——
  {
    slug: "fries",
    categorySlug: "sides",
    name: "French Fries",
    description: "Crispy fries with ketchup.",
    priceMyrCents: 900,
    priceSgdCents: 600,
    kcal: 320,
  },
  {
    slug: "extra-egg",
    categorySlug: "sides",
    name: "Extra Egg",
    description: "Fried or scrambled egg add-on.",
    priceMyrCents: 300,
    priceSgdCents: 200,
    kcal: 90,
  },
  {
    slug: "toast",
    categorySlug: "sides",
    name: "Toast (2 slices)",
    description: "Butter toast. White or wholemeal.",
    priceMyrCents: 400,
    priceSgdCents: 250,
    kcal: 150,
  },
];

export function cafeProductPresetKey(preset: CafeProductPreset): string {
  return `${preset.categorySlug}:${preset.slug}`;
}

/**
 * Everyday sellers per section (MY/SG cafe). Used only when the merchant
 * taps “Tick popular” — never auto-selected, to avoid dumping a mixed list.
 */
export const POPULAR_CAFE_PRODUCT_KEYS = new Set<string>([
  "coffee:latte",
  "coffee:americano",
  "kopi:kopi",
  "kopi:teh-tarik",
  "non-coffee:matcha-latte",
  "non-coffee:hot-chocolate",
  "cold-drinks:iced-latte",
  "cold-drinks:brown-sugar-milk",
  "fresh-juices:orange-juice",
  "fresh-juices:lemonade",
  "signature-drinks:gula-melaka-latte",
  "signature-drinks:pandan-latte",
  "brunch:eggs-benedict",
  "brunch:avocado-toast",
  "pastries:butter-croissant",
  "pastries:banana-bread",
  "sandwiches:club-sandwich",
  "sandwiches:grilled-cheese",
  "mains:aglio-olio",
  "mains:chicken-chop",
  "rice-noodles:nasi-lemak",
  "rice-noodles:chicken-rice",
  "salads:garden-salad",
  "salads:acai-bowl",
  "light-bites:truffle-fries",
  "light-bites:chicken-wings",
  "desserts:waffle",
  "desserts:brownie",
  "cakes:cheesecake",
  "cakes:chocolate-cake",
  "sides:fries",
  "sides:extra-egg",
]);

export function isPopularCafeProduct(preset: CafeProductPreset): boolean {
  return POPULAR_CAFE_PRODUCT_KEYS.has(cafeProductPresetKey(preset));
}

function sortPresetsPopularFirst(products: CafeProductPreset[]): CafeProductPreset[] {
  return [...products].sort((a, b) => {
    const ap = isPopularCafeProduct(a) ? 0 : 1;
    const bp = isPopularCafeProduct(b) ? 0 : 1;
    return ap - bp;
  });
}

export function cafeProductPresetsForCategory(categorySlug: string): CafeProductPreset[] {
  return sortPresetsPopularFirst(
    CAFE_PRODUCT_PRESETS.filter((p) => p.categorySlug === categorySlug),
  );
}

export type CafeProductPresetGroup = {
  categorySlug: string;
  label: string;
  products: CafeProductPreset[];
};

/** Group starter items under the sections they belong to — never a mixed flat list. */
export function groupCafeProductPresets(
  categories: Array<{ slug: string; label: string }>,
  products: CafeProductPreset[],
): CafeProductPresetGroup[] {
  const byCategory = new Map<string, CafeProductPreset[]>();
  for (const product of products) {
    const list = byCategory.get(product.categorySlug) ?? [];
    list.push(product);
    byCategory.set(product.categorySlug, list);
  }
  return categories
    .map((cat) => ({
      categorySlug: cat.slug,
      label: cat.label,
      products: sortPresetsPopularFirst(byCategory.get(cat.slug) ?? []),
    }))
    .filter((group) => group.products.length > 0);
}

export function popularKeysInPresets(products: CafeProductPreset[]): string[] {
  return products.filter(isPopularCafeProduct).map(cafeProductPresetKey);
}

export function popularSlugsInPresets(products: CafeProductPreset[]): string[] {
  return products.filter(isPopularCafeProduct).map((p) => p.slug);
}

export function cafeProductPresetPrice(
  preset: CafeProductPreset,
  currency: MerchantCurrency,
): number {
  return currency === "SGD" ? preset.priceSgdCents : preset.priceMyrCents;
}
