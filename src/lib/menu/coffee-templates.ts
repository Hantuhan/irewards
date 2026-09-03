import type { ModifierGroupInput } from "@/lib/db/modifiers-repository";
import type { MenuIngredientPreset } from "@/lib/menu/menu-ingredients";
import type { MerchantCurrency } from "@/lib/merchant/currency";

type ModifierOptionInput = ModifierGroupInput["options"][number];

function option(
  name: string,
  priceDeltaCents = 0,
  isDefault = false,
  maxQuantity = 1,
): ModifierOptionInput {
  return { name, priceDeltaCents, isDefault, maxQuantity };
}

function group(
  name: string,
  options: ModifierOptionInput[],
  required = false,
  maxSelect = 1,
): ModifierGroupInput {
  return {
    name,
    required,
    minSelect: required ? 1 : 0,
    maxSelect,
    options,
  };
}

/** Coffee, Kopi, and Teh categories share Simple drink options. */
export function isCoffeeMenuCategory(slug: string, label?: string): boolean {
  const s = slug.toLowerCase().trim();
  if (s === "coffee" || s === "kopi" || s === "teh" || s === "kopi-teh") return true;
  const l = (label ?? "").toLowerCase();
  return /\b(coffee|kopi|teh)\b/.test(l);
}

/**
 * Any drink category — coffee/kopi/teh plus non-coffee, cold drinks, juices, signatures.
 * Used to hide food-only ingredient chips (spice, pork, fish bone, flour…).
 */
export function isDrinkMenuCategory(slug: string, label?: string): boolean {
  if (isCoffeeMenuCategory(slug, label)) return true;
  const s = slug.toLowerCase().trim();
  if (
    s === "non-coffee" ||
    s === "cold-drinks" ||
    s === "cold-drink" ||
    s === "fresh-juices" ||
    s === "fresh-juice" ||
    s === "juices" ||
    s === "juice" ||
    s === "signature-drinks" ||
    s === "signature-drink" ||
    s === "drinks" ||
    s === "beverages" ||
    s === "beverage"
  ) {
    return true;
  }
  const l = (label ?? "").toLowerCase();
  return /\b(drinks?|beverages?|juices?|matcha|latte|cocoa|chocolate)\b/.test(l);
}

/** Menu categories that should get coffee-specific product tooling. */
export function isCoffeeCategory(slug: string, label?: string): boolean {
  const tokens = [slug, label ?? ""].map((s) => s.toLowerCase().trim());
  const coffeeHints = [
    "coffee",
    "espresso",
    "hot drink",
    "cold drink",
    "pour over",
    "latte",
    "cappuccino",
  ];
  return tokens.some((t) => coffeeHints.some((hint) => t.includes(hint)));
}

function currencyPricing(currency: MerchantCurrency) {
  if (currency === "SGD") {
    return { altMilk: 100, sizeMd: 100, sizeLg: 200, syrup: 80, shot: 100, topping: 80 };
  }
  return { altMilk: 200, sizeMd: 150, sizeLg: 300, syrup: 150, shot: 150, topping: 150 };
}

/** Temperature, size, milk, syrups, espresso, toppings — for café drinks. */
export function coffeeDrinkModifierTemplate(currency: MerchantCurrency): ModifierGroupInput[] {
  const p = currencyPricing(currency);
  return [
    group(
      "Temperature",
      [
        option("Hot", 0, true),
        option("Iced", 0),
        option("Blended / Frappe", p.sizeMd),
      ],
      true,
    ),
    group(
      "Ice level",
      [
        option("No ice"),
        option("Light ice"),
        option("Regular ice", 0, true),
        option("Extra ice"),
      ],
      false,
    ),
    group(
      "Size",
      [
        option("Small · 8oz", 0, true),
        option("Medium · 12oz", p.sizeMd),
        option("Large · 16oz", p.sizeLg),
      ],
      true,
    ),
    group(
      "Milk",
      [
        option("Whole milk", 0, true),
        option("Oat milk", p.altMilk),
        option("Almond milk", p.altMilk),
        option("Soy milk", p.altMilk),
        option("Skim milk"),
      ],
      true,
    ),
    group(
      "Syrup",
      [
        option("Vanilla", p.syrup),
        option("Caramel", p.syrup),
        option("Hazelnut", p.syrup),
        option("Sugar-free vanilla", p.syrup),
      ],
      false,
      2,
    ),
    group(
      "Syrup pumps",
      [option("1 pump"), option("2 pumps", 0, true), option("3 pumps")],
      false,
    ),
    group(
      "Espresso",
      [
        option("Single shot", 0, true),
        option("Double shot", p.shot),
        option("Triple shot", p.shot * 2),
        option("Decaf shot"),
      ],
      false,
    ),
    group(
      "Toppings",
      [
        option("Whipped cream", p.topping),
        option("Cocoa dust"),
        option("Caramel drizzle", p.topping),
        option("Cinnamon"),
      ],
      false,
      3,
    ),
  ];
}

/** Extra disclosure chips commonly used on coffee menus. */
export const COFFEE_INGREDIENT_PRESETS: MenuIngredientPreset[] = [
  { id: "whole_milk", label: "Whole milk", group: "Dairy" },
  { id: "vanilla_syrup", label: "Vanilla syrup", group: "Syrups" },
  { id: "caramel_syrup", label: "Caramel syrup", group: "Syrups" },
  { id: "hazelnut_syrup", label: "Hazelnut syrup", group: "Syrups" },
  { id: "decaf_available", label: "Decaf available", group: "Coffee" },
  { id: "single_origin", label: "Single origin", group: "Coffee" },
  { id: "blend", label: "House blend", group: "Coffee" },
  { id: "arabica", label: "100% Arabica", group: "Coffee" },
  { id: "geisha", label: "Geisha variety", group: "Coffee" },
  { id: "bourbon_variety", label: "Bourbon variety", group: "Coffee" },
];

export function mergeCoffeeIngredientPresets(catalog: MenuIngredientPreset[]): MenuIngredientPreset[] {
  const seen = new Set(catalog.map((p) => p.id));
  const merged = [...catalog];
  for (const preset of COFFEE_INGREDIENT_PRESETS) {
    if (!seen.has(preset.id)) {
      merged.push(preset);
      seen.add(preset.id);
    }
  }
  return merged;
}
