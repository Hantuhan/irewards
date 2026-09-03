/**
 * Cafe-menu main ingredient tags (MY/SG style).
 * Short headline proteins / diet marks — not full recipes.
 * Icons use Material Symbols names already used across the app.
 */

export type MainIngredientId =
  | "chicken"
  | "beef"
  | "pork"
  | "lamb"
  | "duck"
  | "fish"
  | "seafood"
  | "egg"
  | "tofu"
  | "vegetarian"
  | "vegan";

export type MainIngredientDef = {
  id: MainIngredientId;
  label: string;
  /** Material Symbols outlined name */
  icon: string;
  /** Keywords for local (non-AI) detection from product name */
  keywords: string[];
};

/** Curated set — keep short like a cafe legend, not a kitchen inventory. */
export const MAIN_INGREDIENTS: MainIngredientDef[] = [
  {
    id: "chicken",
    label: "Chicken",
    icon: "set_meal",
    keywords: ["chicken", "ayam", "poulet", "wings", "drumstick"],
  },
  {
    id: "beef",
    label: "Beef",
    icon: "outdoor_grill",
    keywords: ["beef", "steak", "daging lembu", "wagyu", "burger"],
  },
  {
    id: "pork",
    label: "Pork",
    icon: "outdoor_grill",
    keywords: ["pork", "bacon", "ham", "char siu", "babi", "prosciutto"],
  },
  {
    id: "lamb",
    label: "Lamb",
    icon: "outdoor_grill",
    keywords: ["lamb", "mutton", "kambing"],
  },
  {
    id: "duck",
    label: "Duck",
    icon: "set_meal",
    keywords: ["duck", "itik", "peking"],
  },
  {
    id: "fish",
    label: "Fish",
    icon: "set_meal",
    keywords: ["fish", "salmon", "tuna", "cod", "ikan", "snapper", "bass"],
  },
  {
    id: "seafood",
    label: "Seafood",
    icon: "ramen_dining",
    keywords: [
      "seafood",
      "prawn",
      "shrimp",
      "crab",
      "squid",
      "octopus",
      "mussel",
      "clam",
      "lobster",
      "udang",
      "ketam",
    ],
  },
  {
    id: "egg",
    label: "Egg",
    icon: "egg",
    keywords: ["egg", "eggs", "omelette", "omelet", "benedict", "shakshuka", "telur"],
  },
  {
    id: "tofu",
    label: "Tofu",
    icon: "rice_bowl",
    keywords: ["tofu", "beancurd", "tauhu", "tau fu"],
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    icon: "eco",
    keywords: ["vegetarian", "veggie", "veg ", "plant-based", "meatless"],
  },
  {
    id: "vegan",
    label: "Vegan",
    icon: "spa",
    keywords: ["vegan"],
  },
];

const BY_ID = new Map(MAIN_INGREDIENTS.map((d) => [d.id, d]));

export function mainIngredientDef(id: string): MainIngredientDef | undefined {
  return BY_ID.get(id as MainIngredientId);
}

export function isMainIngredientId(id: string): id is MainIngredientId {
  return BY_ID.has(id as MainIngredientId);
}

/** Cap at 2 — cafe menus rarely stack more than a primary + diet mark. */
export const MAIN_INGREDIENT_MAX = 2;

export function normalizeMainIngredientIds(ids: unknown): MainIngredientId[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<MainIngredientId>();
  const out: MainIngredientId[] = [];
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const id = raw.trim().toLowerCase();
    if (!isMainIngredientId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAIN_INGREDIENT_MAX) break;
  }
  return out;
}

export function toggleMainIngredientId(
  selected: MainIngredientId[],
  id: MainIngredientId,
): MainIngredientId[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  if (selected.length >= MAIN_INGREDIENT_MAX) {
    return [...selected.slice(0, MAIN_INGREDIENT_MAX - 1), id];
  }
  return [...selected, id];
}

/**
 * Fast local guess from product name / description (no AI).
 * Prefer meat/seafood over vegetarian when both appear.
 */
export function guessMainIngredientsFromText(input: {
  name: string;
  description?: string | null;
}): MainIngredientId[] {
  const hay = `${input.name} ${input.description ?? ""}`.toLowerCase();
  const hits: MainIngredientId[] = [];

  const priority: MainIngredientId[] = [
    "seafood",
    "fish",
    "chicken",
    "beef",
    "pork",
    "lamb",
    "duck",
    "egg",
    "tofu",
    "vegan",
    "vegetarian",
  ];

  for (const id of priority) {
    const def = mainIngredientDef(id);
    if (!def) continue;
    if (def.keywords.some((kw) => hay.includes(kw))) {
      hits.push(id);
      if (hits.length >= MAIN_INGREDIENT_MAX) break;
    }
  }

  // If a meat/seafood hit exists, drop vegetarian (name may say "veggie side")
  const hasAnimal = hits.some((id) =>
    ["chicken", "beef", "pork", "lamb", "duck", "fish", "seafood", "egg"].includes(id),
  );
  if (hasAnimal) {
    return hits.filter((id) => id !== "vegetarian" && id !== "vegan");
  }

  return hits;
}
