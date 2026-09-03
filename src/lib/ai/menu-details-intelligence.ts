import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
import { askMenuKcal } from "@/lib/ai/menu-kcal-intelligence";
import { estimateKcalFromProduct } from "@/lib/menu/estimate-kcal";
import {
  sanitizeIngredientIds,
  type MenuIngredientPreset,
} from "@/lib/menu/menu-ingredients";

export type MenuDetailsAskResult = {
  ingredientIds: string[];
  customIngredients: string | null;
  notes: string | null;
  kcal: number | null;
  sugarG: number | null;
  label: string;
  confidence: "high" | "medium" | "low";
  source: "ai" | "local" | "empty";
  rationale?: string;
  message?: string;
};

type AiPayload = {
  ingredientIds?: string[];
  customIngredients?: string | null;
  notes?: string | null;
  kcal?: number | null;
  sugarG?: number | null;
  confidence?: "high" | "medium" | "low";
  serving?: string;
  rationale?: string;
};

/** Cheap keyword hints when AI is off or fails. */
function guessIngredientIds(
  name: string,
  description: string | null | undefined,
  allowed: Set<string>,
): string[] {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  const picks: string[] = [];
  const maybe = (id: string, ...needles: RegExp[]) => {
    if (!allowed.has(id) || picks.includes(id)) return;
    if (needles.some((re) => re.test(text))) picks.push(id);
  };

  // Dairy = animal milk products only — coconut milk must not match.
  maybe(
    "contains_dairy",
    /\b(milk|latte|cappuccino|flat\s*white|mocha|cream|cheese|butter|yogurt|dairy|evaporated\s*milk|condensed\s*milk)\b/,
  );
  // Avoid false dairy from coconut milk alone
  if (
    picks.includes("contains_dairy") &&
    /\bcoconut\s*(milk|cream)\b/.test(text) &&
    !/\b(cow|dairy|evaporated|condensed|fresh\s*milk|full\s*cream|cheese|butter|yogurt|latte|cappuccino)\b/.test(
      text.replace(/\bcoconut\s*(milk|cream)\b/g, ""),
    )
  ) {
    const idx = picks.indexOf("contains_dairy");
    if (idx >= 0) picks.splice(idx, 1);
  }
  maybe("contains_nuts", /\b(nut|almond|hazelnut|peanut|cashew|pistachio|walnut)\b/);
  maybe("contains_egg", /\b(egg|mayonnaise|aioli|meringue)\b/);
  maybe("contains_shellfish", /\b(shrimp|prawn|crab|lobster|shellfish|clam|mussel|squid)\b/);
  maybe("contains_pork", /\b(pork|bacon|ham|lard|char\s*siu|bak\s*kut)\b/);
  maybe("contains_fish_bone", /\b(fish|ikan|salmon|cod|bass)\b/);
  maybe("gluten_free", /\bgluten[\s-]?free\b/);
  maybe("vegan", /\bvegan\b/);
  maybe("halal", /\bhalal\b/);
  maybe("spicy_hot", /\b(extra\s*spicy|very\s*spicy|pedas\s*sangat)\b/);
  maybe("spicy_medium", /\b(medium\s*spicy|pedas\s*sederhana)\b/);
  maybe("spicy_mild", /\b(mild\s*spicy|slightly\s*spicy)\b/);
  maybe("spicy", /\b(spicy|chili|chilli|sambal|pedas|curry)\b/);

  const spice = ["spicy_hot", "spicy_medium", "spicy_mild", "spicy"].filter((id) =>
    picks.includes(id),
  );
  if (spice.length > 1) {
    const keep = spice[0];
    return sanitizeIngredientIds(picks.filter((id) => !spice.includes(id) || id === keep));
  }
  return sanitizeIngredientIds(picks);
}

function guessCustomIngredients(
  name: string,
  description: string | null | undefined,
  productKind: "drink" | "food",
): string | null {
  const desc = description?.trim();
  if (desc && desc.length <= 120) return desc;
  const n = name.trim().toLowerCase();
  if (productKind === "drink") {
    if (/\b(pour[\s-]?over|filter|black)\b/.test(n)) return "Brewed coffee, hot water";
    if (/\bespresso\b/.test(n)) return "Espresso";
    if (/\bamericano\b/.test(n)) return "Espresso, hot water";
    if (/\b(latte|cappuccino|flat\s*white)\b/.test(n)) return "Espresso, steamed milk";
  }
  return null;
}

function pickAllowedIds(raw: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const id = entry.trim();
    if (!allowed.has(id) || out.includes(id)) continue;
    out.push(id);
  }
  return sanitizeIngredientIds(out);
}

/**
 * One-shot fill for product detail chips + custom ingredients + nutrition.
 * Uses DeepSeek when configured; falls back to local kcal + keyword chips.
 */
export async function askMenuDetails(input: {
  name: string;
  description?: string | null;
  categorySlug?: string;
  categoryLabel?: string;
  productKind: "drink" | "food";
  /** Presets visible in the picker — AI may only choose these ids. */
  availablePresets: MenuIngredientPreset[];
}): Promise<MenuDetailsAskResult> {
  const allowed = new Set(input.availablePresets.map((p) => p.id));
  const localIds = guessIngredientIds(input.name, input.description, allowed);
  const localCustom = guessCustomIngredients(
    input.name,
    input.description,
    input.productKind,
  );
  const localKcal = estimateKcalFromProduct({
    name: input.name,
    description: input.description,
    categorySlug: input.categorySlug,
    categoryLabel: input.categoryLabel,
  });

  if (!isDeepseekConfigured()) {
    if (!localKcal && localIds.length === 0 && !localCustom) {
      return {
        ingredientIds: [],
        customIngredients: null,
        notes: null,
        kcal: null,
        sugarG: null,
        label: "",
        confidence: "low",
        source: "empty",
        message: "AI is not configured. Add a clearer product name, or fill fields yourself.",
      };
    }
    return {
      ingredientIds: localIds,
      customIngredients: localCustom,
      notes: null,
      kcal: localKcal?.kcal ?? null,
      sugarG: localKcal?.sugarG ?? null,
      label: localKcal?.label ?? "Local match",
      confidence: localKcal?.confidence ?? "medium",
      source: "local",
      rationale: "Filled from product name (AI not configured).",
    };
  }

  const catalog = input.availablePresets.map((p) => ({
    id: p.id,
    label: p.label,
    group: p.group,
  }));

  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `You fill cafe menu product-detail fields for MY/SG menus (allergens, dietary tags, custom ingredients, kcal, sugar).
Only use ingredientIds from the provided catalog ids — never invent ids.
Ground every field on the product title and short description when provided.
Menu category is shelf location only — ignore it if it conflicts with the title/description.
Example: title "Curry Mee" with prawns → seafood + shellfish, not coffee.
Rules:
- Pick allergen / dietary / warning / spice chips that clearly apply. Prefer fewer accurate chips over guessing.
- Never mark Halal and Contains pork together.
- Coconut milk / coconut cream is NOT dairy — only use contains_dairy when cow/goat milk, cream, butter, or cheese is present.
- For drinks: milk/syrup order options are NOT chips — use Contains dairy when milk is in the drink; put syrups in customIngredients.
- customIngredients: short comma-separated RECIPE ingredients only (e.g. "coconut milk, yellow noodles, tofu puffs, prawns"). Never put "Contains dairy" or chip labels here — those belong in ingredientIds.
- notes: optional short diner-facing tip, or null.
- kcal: positive integer for one typical serving; sugarG grams or null.
Return JSON only:
{"ingredientIds":["contains_shellfish"],"customIngredients":"string|null","notes":"string|null","kcal":number|null,"sugarG":number|null,"confidence":"high"|"medium"|"low","serving":"string","rationale":"one short sentence"}`,
      },
      {
        role: "user",
        content: JSON.stringify({
          title: input.name,
          shortDescription: input.description ?? "",
          shelfCategory: input.categoryLabel ?? input.categorySlug ?? "",
          productKindHint: input.productKind,
          catalog,
          localHint: {
            ingredientIds: localIds,
            customIngredients: localCustom,
            kcal: localKcal
              ? { kcal: localKcal.kcal, sugarG: localKcal.sugarG, label: localKcal.label }
              : null,
          },
        }),
      },
    ],
    { temperature: 0.2, json: true },
  );

  if (!content) {
    // Fall back: kcal AI path + local chips
    const kcalResult = await askMenuKcal({
      name: input.name,
      description: input.description,
      categorySlug: input.categorySlug,
      categoryLabel: input.categoryLabel,
      forceAi: true,
    });
    return {
      ingredientIds: localIds,
      customIngredients: localCustom,
      notes: null,
      kcal: kcalResult.kcal,
      sugarG: kcalResult.sugarG,
      label: kcalResult.label || "Partial fill",
      confidence: kcalResult.confidence,
      source: kcalResult.kcal != null ? "ai" : localKcal ? "local" : "empty",
      rationale: kcalResult.rationale,
      message: kcalResult.message,
    };
  }

  const parsed = parseJsonFromModel<AiPayload>(content);
  const ingredientIds = pickAllowedIds(parsed?.ingredientIds, allowed);
  const custom =
    typeof parsed?.customIngredients === "string" && parsed.customIngredients.trim()
      ? parsed.customIngredients.trim().slice(0, 160)
      : localCustom;
  const notes =
    typeof parsed?.notes === "string" && parsed.notes.trim()
      ? parsed.notes.trim().slice(0, 120)
      : null;

  let kcal =
    typeof parsed?.kcal === "number" && Number.isFinite(parsed.kcal) && parsed.kcal >= 0
      ? Math.round(parsed.kcal)
      : null;
  let sugarG =
    typeof parsed?.sugarG === "number" && Number.isFinite(parsed.sugarG) && parsed.sugarG >= 0
      ? Math.round(parsed.sugarG * 10) / 10
      : null;

  if (kcal == null && localKcal) {
    kcal = localKcal.kcal;
    sugarG = sugarG ?? localKcal.sugarG ?? null;
  }

  if (kcal == null && ingredientIds.length === 0 && !custom) {
    return {
      ingredientIds: localIds,
      customIngredients: localCustom,
      notes: null,
      kcal: null,
      sugarG: null,
      label: "",
      confidence: "low",
      source: "empty",
      message: parsed?.rationale ?? "Not enough detail — try a clearer product name.",
    };
  }

  const serving = parsed?.serving?.trim() || "typical serving";
  return {
    ingredientIds: ingredientIds.length > 0 ? ingredientIds : localIds,
    customIngredients: custom,
    notes,
    kcal,
    sugarG,
    label: `AI · ${serving}`,
    confidence: parsed?.confidence ?? "medium",
    source: "ai",
    rationale: parsed?.rationale?.trim(),
  };
}
