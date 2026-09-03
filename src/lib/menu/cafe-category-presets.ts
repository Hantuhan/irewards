/**
 * Default cafe menu categories for MY/SG F&B merchants.
 * Sources: common specialty-cafe / brunch / kopitiam-adjacent menus
 * (coffee, non-coffee, brunch, pastries, mains, desserts, local drinks).
 */

export type CafeCategoryPreset = {
  slug: string;
  label: string;
  /** Grouping for the picker UI */
  group: "drinks" | "food" | "sweets";
  /** Short hint shown under the chip */
  hint: string;
};

export const CAFE_CATEGORY_PRESET_GROUPS: Array<{
  id: CafeCategoryPreset["group"];
  label: string;
}> = [
  { id: "drinks", label: "Drinks" },
  { id: "food", label: "Food" },
  { id: "sweets", label: "Sweets & sides" },
];

export const CAFE_CATEGORY_PRESETS: CafeCategoryPreset[] = [
  // Drinks — specialty + local
  {
    slug: "coffee",
    label: "Coffee",
    group: "drinks",
    hint: "Espresso, latte, flat white, filter",
  },
  {
    slug: "kopi",
    label: "Kopi & Teh",
    group: "drinks",
    hint: "Local kopi, teh tarik, yuan yang",
  },
  {
    slug: "non-coffee",
    label: "Non-coffee",
    group: "drinks",
    hint: "Matcha, chocolate, tea, cocoa",
  },
  {
    slug: "cold-drinks",
    label: "Cold drinks",
    group: "drinks",
    hint: "Iced specials, frappes, shakes",
  },
  {
    slug: "fresh-juices",
    label: "Fresh juices",
    group: "drinks",
    hint: "Fruit juices, lemonade, coolers",
  },
  {
    slug: "signature-drinks",
    label: "Signature drinks",
    group: "drinks",
    hint: "House specials & seasonal cups",
  },

  // Food
  {
    slug: "brunch",
    label: "Brunch",
    group: "food",
    hint: "Eggs, toast, all-day breakfast",
  },
  {
    slug: "pastries",
    label: "Pastries",
    group: "food",
    hint: "Croissants, scones, banana bread",
  },
  {
    slug: "sandwiches",
    label: "Sandwiches",
    group: "food",
    hint: "Toasties, wraps, bagels",
  },
  {
    slug: "mains",
    label: "Mains",
    group: "food",
    hint: "Pasta, rice bowls, chops",
  },
  {
    slug: "rice-noodles",
    label: "Rice & noodles",
    group: "food",
    hint: "Nasi, mee, local plates",
  },
  {
    slug: "salads",
    label: "Salads & bowls",
    group: "food",
    hint: "Salads, acai, grain bowls",
  },
  {
    slug: "light-bites",
    label: "Light bites",
    group: "food",
    hint: "Small plates & shareables",
  },

  // Sweets & sides
  {
    slug: "desserts",
    label: "Desserts",
    group: "sweets",
    hint: "Waffles, brownies, plated sweets",
  },
  {
    slug: "cakes",
    label: "Cakes & bakes",
    group: "sweets",
    hint: "Slice cakes, cookies, brownies",
  },
  {
    slug: "sides",
    label: "Sides",
    group: "sweets",
    hint: "Fries, extras, add-ons",
  },
];

/** Suggested starter set for a typical MY/SG specialty cafe. */
export const CAFE_CATEGORY_STARTER_SLUGS = [
  "coffee",
  "non-coffee",
  "pastries",
  "brunch",
  "mains",
  "desserts",
] as const;

export function cafeCategoryPresetsByGroup(
  group: CafeCategoryPreset["group"],
): CafeCategoryPreset[] {
  return CAFE_CATEGORY_PRESETS.filter((p) => p.group === group);
}

export function findCafeCategoryPreset(slug: string): CafeCategoryPreset | undefined {
  return CAFE_CATEGORY_PRESETS.find((p) => p.slug === slug);
}
