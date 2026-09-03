import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
import { estimateKcalFromProduct, type KcalEstimate } from "@/lib/menu/estimate-kcal";

export type MenuKcalAskResult = {
  kcal: number | null;
  sugarG: number | null;
  label: string;
  confidence: "high" | "medium" | "low";
  source: "preset" | "keyword" | "ai" | "empty";
  rationale?: string;
  message?: string;
};

type AiPayload = {
  kcal?: number;
  sugarG?: number | null;
  confidence?: "high" | "medium" | "low";
  serving?: string;
  rationale?: string;
};

function fromLocal(estimate: KcalEstimate): MenuKcalAskResult {
  return {
    kcal: estimate.kcal,
    sugarG: estimate.sugarG ?? null,
    label: estimate.label,
    confidence: estimate.confidence,
    source: estimate.source,
  };
}

/**
 * Prefer local trusted presets/keywords; fall back to DeepSeek when unsure / no match.
 */
export async function askMenuKcal(input: {
  name: string;
  description?: string | null;
  categorySlug?: string;
  categoryLabel?: string;
  /** Force AI even if a local match exists */
  forceAi?: boolean;
}): Promise<MenuKcalAskResult> {
  const local = estimateKcalFromProduct(input);
  if (local && !input.forceAi) return fromLocal(local);

  if (!isDeepseekConfigured()) {
    if (local) return fromLocal(local);
    return {
      kcal: null,
      sugarG: null,
      label: "",
      confidence: "low",
      source: "empty",
      message: "AI is not configured. Add a clearer product name, or enter kcal yourself.",
    };
  }

  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `You estimate typical cafe/restaurant serving energy for MY/SG menus.
Prefer USDA FoodData Central and Singapore HPB / Heart Foundation ranges when known.
Return JSON only:
{"kcal":number,"sugarG":number|null,"confidence":"high"|"medium"|"low","serving":"string","rationale":"one short sentence"}.
kcal must be a positive integer for one typical diner serving. If truly unknown, use null kcal.
Ground every answer on the product name and short description when provided.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          name: input.name,
          description: input.description ?? "",
          category: input.categoryLabel ?? input.categorySlug ?? "",
          localHint: local
            ? { kcal: local.kcal, sugarG: local.sugarG, label: local.label }
            : null,
        }),
      },
    ],
    { temperature: 0.2, json: true },
  );

  if (!content) {
    if (local) return fromLocal(local);
    return {
      kcal: null,
      sugarG: null,
      label: "",
      confidence: "low",
      source: "empty",
      message: "Could not reach AI. Enter kcal yourself.",
    };
  }

  const parsed = parseJsonFromModel<AiPayload>(content);
  const kcal =
    typeof parsed?.kcal === "number" && Number.isFinite(parsed.kcal) && parsed.kcal >= 0
      ? Math.round(parsed.kcal)
      : null;
  const sugarG =
    typeof parsed?.sugarG === "number" && Number.isFinite(parsed.sugarG) && parsed.sugarG >= 0
      ? Math.round(parsed.sugarG * 10) / 10
      : null;

  if (kcal == null) {
    if (local) return fromLocal(local);
    return {
      kcal: null,
      sugarG: null,
      label: "",
      confidence: "low",
      source: "empty",
      message: parsed?.rationale ?? "Not enough detail to estimate. Enter kcal yourself.",
    };
  }

  const serving = parsed?.serving?.trim() || "typical serving";
  return {
    kcal,
    sugarG,
    label: `AI · ${serving}`,
    confidence: parsed?.confidence ?? "medium",
    source: "ai",
    rationale: parsed?.rationale?.trim(),
  };
}
