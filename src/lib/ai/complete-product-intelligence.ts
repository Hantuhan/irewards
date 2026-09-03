import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
import { askMenuDetails } from "@/lib/ai/menu-details-intelligence";
import { askMenuMainIngredients } from "@/lib/ai/menu-main-ingredient-intelligence";
import { suggestMaxProfitUpsells, type MaxProfitCandidate } from "@/lib/ai/upsell-max-profit";
import type { MainIngredientId } from "@/lib/menu/main-ingredients";
import type { MenuIngredientPreset } from "@/lib/menu/menu-ingredients";
import type { UpsellLinkConfig } from "@/lib/menu/upsell-rules";
import { DEFAULT_TAKEAWAY_CHARGE, type TakeawayChargeConfig } from "@/lib/menu/takeaway-charge";

export type CompleteProductInput = {
  name: string;
  priceCents: number;
  categorySlug?: string;
  categoryLabel?: string;
  productKind: "drink" | "food";
  description?: string | null;
  availablePresets: MenuIngredientPreset[];
  upsellCandidates: MaxProfitCandidate[];
  targetLanguages?: Array<"zh" | "ms">;
  availableTakeaway?: boolean;
};

export type CompleteProductResult = {
  description: string | null;
  ingredientIds: string[];
  customIngredients: string | null;
  notes: string | null;
  kcal: number | null;
  sugarG: number | null;
  mainIngredientIds: MainIngredientId[];
  translations: {
    nameI18n: Record<string, string>;
    descriptionI18n: Record<string, string>;
    ingredientsI18n: Record<string, string>;
    itemNotesI18n: Record<string, string>;
  };
  upsellLinks: UpsellLinkConfig[];
  takeawayCharge: TakeawayChargeConfig | null;
  specialTags: string[];
  rationale: string;
  source: "ai" | "local" | "mixed";
};

type DescPayload = {
  description?: string;
  rationale?: string;
};

type TranslatePayload = {
  zh?: { name?: string; description?: string; ingredients?: string; notes?: string };
  ms?: { name?: string; description?: string; ingredients?: string; notes?: string };
};

async function draftDescription(input: {
  name: string;
  categoryLabel?: string;
  productKind: "drink" | "food";
  existing?: string | null;
}): Promise<{ description: string | null; source: "ai" | "local" }> {
  const title = input.name.trim();
  if (!title) return { description: null, source: "local" };

  const existing = input.existing?.trim() || null;
  // Keep merchant copy only when it still matches the title (avoid stale wrong AI text).
  if (existing && !descriptionConflictsWithTitle(title, existing)) {
    return { description: existing, source: "local" };
  }

  if (!isDeepseekConfigured()) {
    return {
      description: `${title} — made fresh to order.`.slice(0, 120),
      source: "local",
    };
  }

  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `Write one short cafe menu description (max 110 chars) for MY/SG diners.
The product TITLE is the only source of truth for what the item is.
Describe that exact item — ingredients, prep, or style that match the title.
Do NOT invent a different dish/drink because of menu category (category is only shelf location and may be wrong).
Example: title "Friend Noodle" → noodle dish copy. Never coffee/latte copy.
No emoji. No price. No marketing fluff.
Return JSON: {"description":"...","rationale":"one short sentence"}`,
      },
      {
        role: "user",
        content: JSON.stringify({
          title,
          shelfCategory: input.categoryLabel ?? "",
          shelfKindHint: input.productKind,
          previousDescriptionIgnored:
            existing && descriptionConflictsWithTitle(title, existing) ? existing : null,
        }),
      },
    ],
    { temperature: 0.3, json: true },
  );

  if (!content) {
    return {
      description: `${title} — made fresh to order.`.slice(0, 120),
      source: "local",
    };
  }
  const parsed = parseJsonFromModel<DescPayload>(content);
  const description = parsed?.description?.trim().slice(0, 140) || null;
  return {
    description: description || `${title} — made fresh to order.`.slice(0, 120),
    source: description ? "ai" : "local",
  };
}

function descriptionConflictsWithTitle(name: string, description: string): boolean {
  const n = name.toLowerCase();
  const d = description.toLowerCase();
  const foodName =
    /\b(noodle|mee|mie|ramen|laksa|nasi|rice|pasta|burger|sandwich|salad|chicken|beef|pork|dumpling|bao|curry|pizza|fries|katsu)\b/.test(
      n,
    );
  const drinkDesc =
    /\b(coffee|latte|espresso|cappuccino|americano|mocha|kopi|teh tarik|matcha latte|flat white)\b/.test(
      d,
    );
  const drinkName =
    /\b(latte|espresso|americano|cappuccino|mocha|kopi|teh|coffee|juice|smoothie|matcha)\b/.test(n);
  const foodDesc =
    /\b(noodle|mee|mie|ramen|laksa|nasi|rice|pasta|burger|sandwich|chicken rice)\b/.test(d);
  if (foodName && drinkDesc) return true;
  if (drinkName && foodDesc) return true;
  return false;
}

/** Prefer title/description when they conflict with the menu shelf category. */
export function inferProductKindFromCopy(input: {
  name: string;
  description?: string | null;
  fallback: "drink" | "food";
}): "drink" | "food" {
  const text = `${input.name} ${input.description ?? ""}`.toLowerCase();
  const food =
    /\b(noodle|mee|mie|ramen|laksa|nasi|rice|pasta|burger|sandwich|salad|chicken|beef|pork|lamb|duck|fish|seafood|egg|toast|waffle|pancake|croissant|pastry|bowl|chop|steak|dumpling|bao|curry|pizza|fries|katsu|udon|soba)\b/;
  const drink =
    /\b(latte|espresso|americano|cappuccino|mocha|flat\s*white|kopi|teh|tea|coffee|juice|smoothie|matcha|hot\s*chocolate|milkshake|soda|lemonade)\b/;
  const hasFood = food.test(text);
  const hasDrink = drink.test(text);
  if (hasFood && !hasDrink) return "food";
  if (hasDrink && !hasFood) return "drink";
  if (hasFood) return "food";
  return input.fallback;
}

async function draftInlineTranslations(input: {
  name: string;
  description: string | null;
  customIngredients: string | null;
  notes: string | null;
  targetLanguages: Array<"zh" | "ms">;
}): Promise<CompleteProductResult["translations"]> {
  const base = {
    nameI18n: { en: input.name } as Record<string, string>,
    descriptionI18n: { en: input.description ?? "" } as Record<string, string>,
    ingredientsI18n: { en: input.customIngredients ?? "" } as Record<string, string>,
    itemNotesI18n: { en: input.notes ?? "" } as Record<string, string>,
  };

  if (input.targetLanguages.length === 0 || !isDeepseekConfigured()) return base;

  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `Translate cafe menu fields for diners. Keep food names natural for the locale.
Return JSON only with keys for requested languages:
{"zh":{"name":"...","description":"...","ingredients":"...","notes":"..."},"ms":{...}}
Omit languages not requested. Empty source → empty string.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          targetLanguages: input.targetLanguages,
          name: input.name,
          description: input.description ?? "",
          ingredients: input.customIngredients ?? "",
          notes: input.notes ?? "",
        }),
      },
    ],
    { temperature: 0.2, json: true },
  );

  if (!content) return base;
  const parsed = parseJsonFromModel<TranslatePayload>(content);
  if (!parsed) return base;

  for (const lang of input.targetLanguages) {
    const block = parsed[lang];
    if (!block) continue;
    if (block.name?.trim()) base.nameI18n[lang] = block.name.trim();
    if (block.description?.trim()) base.descriptionI18n[lang] = block.description.trim();
    if (block.ingredients?.trim()) base.ingredientsI18n[lang] = block.ingredients.trim();
    if (block.notes?.trim()) base.itemNotesI18n[lang] = block.notes.trim();
  }
  return base;
}

/**
 * One-shot “Complete with AI” for the product editor.
 * Seeds from product title + optional short description; fills the rest.
 */
export async function completeProductWithAi(
  input: CompleteProductInput,
): Promise<CompleteProductResult> {
  const sources = new Set<"ai" | "local">();
  const seedDescription = input.description?.trim() || null;
  const productKind = inferProductKindFromCopy({
    name: input.name,
    description: seedDescription,
    fallback: input.productKind,
  });

  const desc = await draftDescription({
    name: input.name,
    categoryLabel: input.categoryLabel,
    productKind,
    existing: seedDescription,
  });
  sources.add(desc.source);

  // Prefer merchant-written short description when it matches the title.
  const groundedDescription =
    seedDescription && !descriptionConflictsWithTitle(input.name, seedDescription)
      ? seedDescription
      : desc.description;

  const details = await askMenuDetails({
    name: input.name,
    description: groundedDescription,
    categorySlug: input.categorySlug,
    categoryLabel: input.categoryLabel,
    productKind,
    availablePresets: input.availablePresets,
  });
  sources.add(details.source === "empty" ? "local" : details.source);

  let mainIngredientIds: MainIngredientId[] = [];
  if (productKind === "food") {
    const mains = await askMenuMainIngredients({
      name: input.name,
      description: groundedDescription,
      categorySlug: input.categorySlug,
      categoryLabel: input.categoryLabel,
      forceAi: true,
    }).catch(() => null);
    if (mains?.ids?.length) {
      mainIngredientIds = mains.ids;
      sources.add(mains.source === "ai" ? "ai" : "local");
    }
  }

  const translations = await draftInlineTranslations({
    name: input.name,
    description: groundedDescription,
    customIngredients: details.customIngredients,
    notes: details.notes,
    targetLanguages: input.targetLanguages ?? ["zh", "ms"],
  });
  if (isDeepseekConfigured()) sources.add("ai");

  const upsell = await suggestMaxProfitUpsells({
    candidates: input.upsellCandidates,
    context: {
      name: input.name,
      categoryLabel: input.categoryLabel,
      categorySlug: input.categorySlug,
      priceCents: input.priceCents,
    },
    max: 6,
  });
  sources.add(upsell.source);

  const takeawayCharge: TakeawayChargeConfig | null =
    input.availableTakeaway === false
      ? { ...DEFAULT_TAKEAWAY_CHARGE, enabled: false }
      : { ...DEFAULT_TAKEAWAY_CHARGE, enabled: true };

  const specialTags: string[] = [];
  // Light heuristic: popular cafe names get Best Selling badge suggestion.
  const seedText = `${input.name} ${groundedDescription ?? ""}`;
  if (/\b(latte|americano|croissant|club|nasi lemak|kopi|teh tarik)\b/i.test(seedText)) {
    specialTags.push("best_selling");
  }

  const source: CompleteProductResult["source"] =
    sources.has("ai") && sources.has("local")
      ? "mixed"
      : sources.has("ai")
        ? "ai"
        : "local";

  return {
    description: groundedDescription,
    ingredientIds: details.ingredientIds,
    customIngredients: details.customIngredients,
    notes: details.notes,
    kcal: details.kcal,
    sugarG: details.sugarG,
    mainIngredientIds,
    translations,
    upsellLinks: upsell.links,
    takeawayCharge,
    specialTags,
    rationale:
      details.rationale ??
      (seedDescription
        ? `Filled from “${input.name}” + your short description.`
        : `Filled from product title “${input.name}”.`),
    source,
  };
}
