/**
 * Shared Simple product options for Fresh juices, Brunch, Mains, and Pastries.
 * Same option set on every product in that category (MY/SG cafe POS).
 */

import type { ModifierGroupInput } from "@/lib/db/modifiers-repository";
import type { MerchantCurrency } from "@/lib/merchant/currency";
import {
  emptySimpleCategoryProfile,
  parseSimpleCategoryProfile,
  type SimpleCategoryKind,
  type SimpleCategoryProfile,
} from "@/lib/menu/simple-category-profile";

export type SimpleOptionDef = {
  value: string;
  label: string;
  hint?: string;
  priceMyrCents?: number;
  priceSgdCents?: number;
};

export type SimpleGroupDef = {
  id: string;
  name: string;
  hint: string;
  required: boolean;
  options: SimpleOptionDef[];
};

export type SimpleCategoryDef = {
  kind: SimpleCategoryKind;
  title: string;
  simpleHint: string;
  extrasName: string;
  extrasHint: string;
  noteLabel: string;
  notes: string[];
  groups: SimpleGroupDef[];
  extras: SimpleOptionDef[];
};

function priceOf(option: SimpleOptionDef, currency: MerchantCurrency): number {
  if (currency === "SGD") return option.priceSgdCents ?? 0;
  return option.priceMyrCents ?? 0;
}

function optionName(option: SimpleOptionDef): string {
  return option.hint ? `${option.label} · ${option.hint}` : option.label;
}

export const SIMPLE_CATEGORY_DEFS: Record<SimpleCategoryKind, SimpleCategoryDef> = {
  juice: {
    kind: "juice",
    title: "Juice setup",
    simpleHint:
      "Same options on every Fresh juices product. Ice and no-sugar are the usual MY/SG diner requests.",
    extrasName: "Boosters",
    extrasHint: "Lemon, honey, ginger — typical juice-bar add-ons",
    noteLabel: "Blend notes",
    notes: ["Citrus", "Tropical", "Green", "Berry", "No added sugar", "Fresh daily"],
    groups: [
      {
        id: "size",
        name: "Size",
        hint: "Regular is the base price · Large is a typical juice-bar upsize",
        required: true,
        options: [
          { value: "regular", label: "Regular", hint: "16oz" },
          { value: "large", label: "Large", hint: "20oz", priceMyrCents: 200, priceSgdCents: 150 },
        ],
      },
      {
        id: "ice",
        name: "Ice",
        hint: "No ice is the most requested juice tweak in SG/MY",
        required: true,
        options: [
          { value: "none", label: "No ice" },
          { value: "less", label: "Less ice" },
          { value: "regular", label: "Regular ice" },
          { value: "extra", label: "Extra ice" },
        ],
      },
      {
        id: "sweetness",
        name: "Sweetness",
        hint: "Fresh juices are often unsweetened unless it is lemonade",
        required: true,
        options: [
          { value: "no_sugar", label: "No sugar" },
          { value: "less", label: "Less sugar" },
          { value: "regular", label: "Regular" },
          { value: "extra", label: "Extra sweet" },
        ],
      },
      {
        id: "pulp",
        name: "Pulp",
        hint: "Used most for orange and mixed juices",
        required: true,
        options: [
          { value: "with_pulp", label: "With pulp" },
          { value: "no_pulp", label: "No pulp" },
        ],
      },
      {
        id: "style",
        name: "Style",
        hint: "Squeezed vs whole-fruit blended",
        required: true,
        options: [
          { value: "fresh", label: "Fresh squeezed" },
          { value: "blended", label: "Blended" },
        ],
      },
    ],
    extras: [
      { value: "lemon", label: "Lemon", priceMyrCents: 100, priceSgdCents: 80 },
      { value: "honey", label: "Honey", priceMyrCents: 150, priceSgdCents: 100 },
      { value: "ginger", label: "Ginger", priceMyrCents: 150, priceSgdCents: 100 },
      { value: "mint", label: "Mint" },
      { value: "chia", label: "Chia seeds", priceMyrCents: 200, priceSgdCents: 150 },
      { value: "aloe", label: "Aloe vera", priceMyrCents: 200, priceSgdCents: 150 },
    ],
  },
  brunch: {
    kind: "brunch",
    title: "Brunch setup",
    simpleHint:
      "Same options on every Brunch product. Eggs, bread, and chilli are the usual cafe POS prompts.",
    extrasName: "Sides",
    extrasHint: "Extra egg, avocado, bacon — typical all-day breakfast add-ons",
    noteLabel: "Dietary notes",
    notes: ["Vegetarian option", "Contains pork", "Contains nuts", "Spicy", "Gluten-free bread"],
    groups: [
      {
        id: "eggs",
        name: "Eggs",
        hint: "How diners like their eggs · Not needed for sweet plates",
        required: true,
        options: [
          { value: "scrambled", label: "Scrambled" },
          { value: "fried", label: "Fried" },
          { value: "poached", label: "Poached" },
          { value: "sunny", label: "Sunny side" },
          { value: "omelette", label: "Omelette" },
          { value: "none", label: "Not needed" },
        ],
      },
      {
        id: "bread",
        name: "Bread",
        hint: "Sourdough is the usual cafe default",
        required: true,
        options: [
          { value: "sourdough", label: "Sourdough" },
          { value: "white", label: "White toast" },
          { value: "wholemeal", label: "Wholemeal" },
          { value: "muffin", label: "English muffin" },
          { value: "none", label: "No bread" },
        ],
      },
      {
        id: "chilli",
        name: "Chilli",
        hint: "Chilli flakes or sambal on the side is standard in MY/SG",
        required: true,
        options: [
          { value: "none", label: "None" },
          { value: "side", label: "On the side" },
          { value: "extra", label: "Extra" },
        ],
      },
    ],
    extras: [
      { value: "extra_egg", label: "Extra egg", priceMyrCents: 300, priceSgdCents: 200 },
      { value: "avocado", label: "Avocado", priceMyrCents: 400, priceSgdCents: 300 },
      { value: "bacon", label: "Bacon", priceMyrCents: 400, priceSgdCents: 300 },
      { value: "mushrooms", label: "Mushrooms", priceMyrCents: 300, priceSgdCents: 200 },
      { value: "hashbrown", label: "Hash brown", priceMyrCents: 300, priceSgdCents: 200 },
      { value: "tomato", label: "Grilled tomato", priceMyrCents: 200, priceSgdCents: 150 },
      { value: "salmon", label: "Smoked salmon", priceMyrCents: 800, priceSgdCents: 500 },
      { value: "extra_toast", label: "Extra toast", priceMyrCents: 200, priceSgdCents: 150 },
    ],
  },
  mains: {
    kind: "mains",
    title: "Mains setup",
    simpleHint:
      "Same options on every Mains product. Spice, sauce, and extra rice cover pasta, chops, and bowls.",
    extrasName: "Add-ons",
    extrasHint: "Cheese, egg, extra gravy — typical cafe mains extras",
    noteLabel: "Dietary notes",
    notes: ["Vegetarian option", "Contains nuts", "Contains dairy", "Spicy", "Gluten"],
    groups: [
      {
        id: "spice",
        name: "Spice",
        hint: "No chilli / mild / extra is the usual MY/SG mains prompt",
        required: true,
        options: [
          { value: "none", label: "No chilli" },
          { value: "mild", label: "Mild" },
          { value: "medium", label: "Medium" },
          { value: "extra", label: "Extra spicy" },
        ],
      },
      {
        id: "sauce",
        name: "Sauce",
        hint: "On the side keeps gravy or chilli off the plate",
        required: true,
        options: [
          { value: "on_dish", label: "On the dish" },
          { value: "on_side", label: "On the side" },
        ],
      },
      {
        id: "rice",
        name: "Extra rice",
        hint: "Used for chops and bowls · choose None for pasta",
        required: true,
        options: [
          { value: "none", label: "None" },
          { value: "extra", label: "Extra rice", priceMyrCents: 200, priceSgdCents: 150 },
        ],
      },
      {
        id: "portion",
        name: "Portion",
        hint: "Large is a common pasta / chop upsize",
        required: true,
        options: [
          { value: "regular", label: "Regular" },
          { value: "large", label: "Large", priceMyrCents: 300, priceSgdCents: 200 },
        ],
      },
    ],
    extras: [
      { value: "cheese", label: "Extra cheese", priceMyrCents: 300, priceSgdCents: 200 },
      { value: "fried_egg", label: "Fried egg", priceMyrCents: 300, priceSgdCents: 200 },
      { value: "chicken", label: "Add chicken", priceMyrCents: 500, priceSgdCents: 400 },
      { value: "gravy", label: "Extra gravy", priceMyrCents: 150, priceSgdCents: 100 },
      { value: "chilli_flakes", label: "Chilli flakes" },
    ],
  },
  pastries: {
    kind: "pastries",
    title: "Pastry setup",
    simpleHint:
      "Same options on every Pastries product. Warmed and kaya/butter are the usual bakery requests.",
    extrasName: "Spreads & extras",
    extrasHint: "Extra kaya, jam, or an ice cream scoop",
    noteLabel: "Allergen notes",
    notes: ["Contains nuts", "Contains dairy", "Contains gluten", "Contains egg", "Vegetarian"],
    groups: [
      {
        id: "serve",
        name: "Serve",
        hint: "Banana bread and croissants are often warmed to order",
        required: true,
        options: [
          { value: "as_is", label: "As is" },
          { value: "warmed", label: "Warmed" },
        ],
      },
      {
        id: "spread",
        name: "Spread",
        hint: "Butter, jam, and kaya are the usual MY/SG pastry extras",
        required: true,
        options: [
          { value: "none", label: "None" },
          { value: "butter", label: "Butter" },
          { value: "kaya", label: "Kaya" },
          { value: "jam", label: "Jam" },
        ],
      },
    ],
    extras: [
      { value: "extra_butter", label: "Extra butter", priceMyrCents: 100, priceSgdCents: 80 },
      { value: "extra_kaya", label: "Extra kaya", priceMyrCents: 150, priceSgdCents: 100 },
      { value: "extra_jam", label: "Extra jam", priceMyrCents: 150, priceSgdCents: 100 },
      { value: "ice_cream", label: "Ice cream scoop", priceMyrCents: 400, priceSgdCents: 250 },
    ],
  },
};

export function resolveSimpleCategory(
  slug: string,
  label?: string,
): SimpleCategoryKind | null {
  const s = slug.toLowerCase().trim();
  const l = (label ?? "").toLowerCase();

  if (
    s === "fresh-juices" ||
    s === "fresh-juice" ||
    s === "juices" ||
    s === "juice" ||
    /\bjuices?\b/.test(l)
  ) {
    return "juice";
  }
  if (s === "brunch" || s === "breakfast" || s === "all-day-breakfast" || /\b(brunch|breakfast)\b/.test(l)) {
    return "brunch";
  }
  if (s === "mains" || s === "main" || s === "main-course" || /\bmains?\b/.test(l)) {
    return "mains";
  }
  if (s === "pastries" || s === "pastry" || /\bpastries?\b/.test(l)) {
    return "pastries";
  }
  return null;
}

/** @deprecated Ingredients/notes/nutrition always show when filled. Kept for call-site compatibility. */
export function hidesGenericProductDetails(_kind: SimpleCategoryKind | "coffee" | null): boolean {
  return false;
}

export function defaultSimpleCategoryDefaults(kind: SimpleCategoryKind): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const group of SIMPLE_CATEGORY_DEFS[kind].groups) {
    defaults[group.id] = group.options[0]?.value ?? "";
  }
  if (kind === "juice") {
    defaults.ice = "regular";
    defaults.sweetness = "no_sugar";
    defaults.pulp = "with_pulp";
  }
  if (kind === "brunch") {
    defaults.chilli = "none";
  }
  if (kind === "mains") {
    defaults.spice = "mild";
    defaults.rice = "none";
  }
  if (kind === "pastries") {
    defaults.serve = "as_is";
    defaults.spread = "none";
  }
  return defaults;
}

export function createEmptySimpleCategoryProfile(kind: SimpleCategoryKind): SimpleCategoryProfile {
  return emptySimpleCategoryProfile(kind, defaultSimpleCategoryDefaults(kind));
}

export function parseCategoryProfile(
  kind: SimpleCategoryKind,
  raw: unknown,
): SimpleCategoryProfile {
  return parseSimpleCategoryProfile(kind, raw, defaultSimpleCategoryDefaults(kind));
}

function toModifierOption(
  option: SimpleOptionDef,
  currency: MerchantCurrency,
  isDefault: boolean,
): ModifierGroupInput["options"][number] {
  return {
    name: optionName(option),
    priceDeltaCents: priceOf(option, currency),
    isDefault,
    maxQuantity: 1,
  };
}

function toModifierGroup(
  group: SimpleGroupDef,
  currency: MerchantCurrency,
  defaultValue: string,
): ModifierGroupInput {
  return {
    name: group.name,
    required: group.required,
    minSelect: group.required ? 1 : 0,
    maxSelect: 1,
    options: group.options.map((option) =>
      toModifierOption(option, currency, option.value === defaultValue),
    ),
  };
}

export function simpleCategoryModifierTemplate(
  kind: SimpleCategoryKind,
  currency: MerchantCurrency,
  profile?: Pick<SimpleCategoryProfile, "defaults">,
): ModifierGroupInput[] {
  const def = SIMPLE_CATEGORY_DEFS[kind];
  const defaults = profile?.defaults ?? defaultSimpleCategoryDefaults(kind);
  return def.groups.map((group) =>
    toModifierGroup(group, currency, defaults[group.id] ?? group.options[0]?.value ?? ""),
  );
}

export function simpleCategoryExtrasGroup(
  kind: SimpleCategoryKind,
  currency: MerchantCurrency,
): ModifierGroupInput {
  const def = SIMPLE_CATEGORY_DEFS[kind];
  return {
    name: def.extrasName,
    required: false,
    minSelect: 0,
    maxSelect: Math.min(4, def.extras.length),
    options: def.extras.map((option) => toModifierOption(option, currency, false)),
  };
}

function simpleGroupNames(kind: SimpleCategoryKind): Set<string> {
  return new Set(SIMPLE_CATEGORY_DEFS[kind].groups.map((group) => group.name.trim().toLowerCase()));
}

export function isSimpleCategoryManagedGroup(kind: SimpleCategoryKind, name: string): boolean {
  return simpleGroupNames(kind).has(name.trim().toLowerCase());
}

/** Extra add-on groups only — excludes the category’s Simple option groups. */
export function simpleCategoryExtraModifierGroups(
  kind: SimpleCategoryKind,
  groups: ModifierGroupInput[],
): ModifierGroupInput[] {
  const names = simpleGroupNames(kind);
  return groups.filter((group) => !names.has(group.name.trim().toLowerCase()));
}

export function ensureSimpleCategoryModifiers(
  kind: SimpleCategoryKind,
  existing: ModifierGroupInput[],
  currency: MerchantCurrency,
  profile?: Pick<SimpleCategoryProfile, "defaults">,
): ModifierGroupInput[] {
  const template = simpleCategoryModifierTemplate(kind, currency, profile);
  const extras = simpleCategoryExtraModifierGroups(kind, existing);
  return [...template, ...extras];
}

export function applySimpleCategoryExtras(
  kind: SimpleCategoryKind,
  existing: ModifierGroupInput[],
  currency: MerchantCurrency,
  profile?: Pick<SimpleCategoryProfile, "defaults">,
): ModifierGroupInput[] {
  const extrasGroup = simpleCategoryExtrasGroup(kind, currency);
  const extrasName = extrasGroup.name.trim().toLowerCase();
  const base = ensureSimpleCategoryModifiers(kind, existing, currency, profile).filter(
    (group) => group.name.trim().toLowerCase() !== extrasName,
  );
  return [...base, extrasGroup];
}
