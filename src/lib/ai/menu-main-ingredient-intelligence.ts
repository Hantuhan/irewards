import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
import {
  guessMainIngredientsFromText,
  isMainIngredientId,
  MAIN_INGREDIENT_MAX,
  MAIN_INGREDIENTS,
  type MainIngredientId,
} from "@/lib/menu/main-ingredients";

export type MenuMainIngredientAskResult = {
  ids: MainIngredientId[];
  source: "keyword" | "ai" | "empty";
  confidence: "high" | "medium" | "low";
  rationale?: string;
  message?: string;
};

type AiPayload = {
  ids?: string[];
  confidence?: "high" | "medium" | "low";
  rationale?: string;
};

function sanitizeIds(raw: unknown): MainIngredientId[] {
  if (!Array.isArray(raw)) return [];
  const out: MainIngredientId[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const id = entry.trim().toLowerCase();
    if (!isMainIngredientId(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length >= MAIN_INGREDIENT_MAX) break;
  }
  return out;
}

/**
 * Cafe-menu main tags from product name. Local keywords first; AI when unsure or forced.
 */
export async function askMenuMainIngredients(input: {
  name: string;
  description?: string | null;
  categorySlug?: string;
  categoryLabel?: string;
  forceAi?: boolean;
}): Promise<MenuMainIngredientAskResult> {
  const local = guessMainIngredientsFromText(input);
  if (local.length > 0 && !input.forceAi) {
    return { ids: local, source: "keyword", confidence: "high" };
  }

  if (!isDeepseekConfigured()) {
    if (local.length > 0) {
      return { ids: local, source: "keyword", confidence: "medium" };
    }
    return {
      ids: [],
      source: "empty",
      confidence: "low",
      message: "AI is not configured. Pick a main ingredient yourself.",
    };
  }

  const allowed = MAIN_INGREDIENTS.map((d) => d.id).join(", ");
  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `You label cafe/restaurant menu dishes for MY/SG menus with ONE primary main ingredient (optional second for diet mark only).
Think like a cafe legend: Chicken, Fish, Seafood, Beef, Vegetarian — not full recipes.
Allowed ids only: ${allowed}.
PRIMARY INPUTS: product title + short description. Ignore menu category if it conflicts.
Rules:
- Prefer the headline protein (chicken, fish, seafood, beef, pork, lamb, duck, egg, tofu).
- Use vegetarian or vegan only when the dish is clearly meat-free.
- Never return more than ${MAIN_INGREDIENT_MAX} ids.
- If unsure, return [].
Return JSON only: {"ids":["chicken"],"confidence":"high"|"medium"|"low","rationale":"short"}.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          title: input.name,
          shortDescription: input.description ?? "",
          shelfCategory: input.categoryLabel ?? input.categorySlug ?? "",
          localHint: local,
        }),
      },
    ],
    { temperature: 0.1, json: true },
  );

  if (!content) {
    if (local.length > 0) {
      return { ids: local, source: "keyword", confidence: "medium" };
    }
    return {
      ids: [],
      source: "empty",
      confidence: "low",
      message: "Could not reach AI. Pick a main ingredient yourself.",
    };
  }

  const parsed = parseJsonFromModel<AiPayload>(content);
  const ids = sanitizeIds(parsed?.ids);
  if (ids.length === 0) {
    if (local.length > 0) {
      return { ids: local, source: "keyword", confidence: "medium" };
    }
    return {
      ids: [],
      source: "empty",
      confidence: "low",
      message: parsed?.rationale ?? "Not enough detail — pick a main ingredient yourself.",
    };
  }

  return {
    ids,
    source: "ai",
    confidence: parsed?.confidence ?? "medium",
    rationale: parsed?.rationale?.trim() || undefined,
  };
}
