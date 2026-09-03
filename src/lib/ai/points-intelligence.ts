import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
import {
  suggestPointsProgram,
  type PointsCopilotSuggestion,
} from "@/lib/loyalty/points-copilot";

export async function advisePointsProgram(input: {
  merchantName: string;
  levels: { name: string; pointsMultiplier: number }[];
  settings: { pointsPerRinggit: number; pointsRedeemCentsPerPoint: number };
  userPrompt?: string;
  mode?: "default" | "higher" | "lower";
}): Promise<PointsCopilotSuggestion & { source: "deepseek" | "rules" }> {
  // Always mirror saved guide rates (including custom collect rates). Mode is ignored —
  // Faster/Slower were removed; collecting is configured only in the iRewards guide.
  const base = suggestPointsProgram(input.levels, input.settings);

  if (!isDeepseekConfigured()) {
    return { ...base, source: "rules" };
  }

  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `You advise F&B loyalty programs in Malaysia/Singapore.
Explain the merchant's current earn/redeem rates (custom rates are allowed).
You may suggest pointsPerRinggit (0.01-1) and pointsRedeemCentsPerPoint (1-100).
JSON only: { "rationale", "pointsPerRinggit", "pointsRedeemCentsPerPoint", "redemptionExamples": [{"points","valueRm"}] }`,
      },
      {
        role: "user",
        content: `Merchant: ${input.merchantName}
Tiers: ${input.levels.map((l) => `${l.name} ${l.pointsMultiplier}x`).join(", ")}
Current: ${input.settings.pointsPerRinggit} pt/RM, ${input.settings.pointsRedeemCentsPerPoint} sen/pt
Merchant ask: ${input.userPrompt ?? "Summarise this Collecting & using setup."}`,
      },
    ],
    { json: true },
  );

  const parsed = parseJsonFromModel<PointsCopilotSuggestion>(content ?? "");
  if (!parsed?.pointsPerRinggit) return { ...base, source: "rules" };

  const aligned = suggestPointsProgram(input.levels, {
    pointsPerRinggit: parsed.pointsPerRinggit,
    pointsRedeemCentsPerPoint:
      parsed.pointsRedeemCentsPerPoint || base.pointsRedeemCentsPerPoint,
  });

  return {
    rationale: parsed.rationale || base.rationale,
    pointsPerRinggit: aligned.pointsPerRinggit,
    pointsRedeemCentsPerPoint: aligned.pointsRedeemCentsPerPoint,
    tierEarning: aligned.tierEarning,
    redemptionExamples: parsed.redemptionExamples?.length
      ? parsed.redemptionExamples
      : aligned.redemptionExamples,
    source: "deepseek",
  };
}
