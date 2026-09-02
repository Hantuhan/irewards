import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
import {
  suggestPointsProgram,
  suggestHigherEarn,
  suggestLowerEarn,
  type PointsCopilotSuggestion,
} from "@/lib/loyalty/points-copilot";

export async function advisePointsProgram(input: {
  merchantName: string;
  levels: { name: string; pointsMultiplier: number }[];
  settings: { pointsPerRinggit: number; pointsRedeemCentsPerPoint: number };
  userPrompt?: string;
  mode?: "default" | "higher" | "lower";
}): Promise<PointsCopilotSuggestion & { source: "deepseek" | "rules" }> {
  const base =
    input.mode === "higher"
      ? suggestHigherEarn(
          suggestPointsProgram(input.levels, input.settings),
        )
      : input.mode === "lower"
        ? suggestLowerEarn(
            suggestPointsProgram(input.levels, input.settings),
          )
        : suggestPointsProgram(input.levels, input.settings);

  if (!isDeepseekConfigured()) {
    return { ...base, source: "rules" };
  }

  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `You advise F&B loyalty programs in Malaysia/Singapore. 
Suggest pointsPerRinggit (0.05-0.2) and pointsRedeemCentsPerPoint (5-15).
JSON only: { "rationale", "pointsPerRinggit", "pointsRedeemCentsPerPoint", "tierEarning": [{"name","pointsPerRm"}], "redemptionExamples": [{"points","valueRm"}] }`,
      },
      {
        role: "user",
        content: `Merchant: ${input.merchantName}
Tiers: ${input.levels.map((l) => `${l.name} ${l.pointsMultiplier}x`).join(", ")}
Current: ${input.settings.pointsPerRinggit} pt/RM, ${input.settings.pointsRedeemCentsPerPoint} sen/pt
Merchant ask: ${input.userPrompt ?? "Suggest a balanced earn and redeem structure."}`,
      },
    ],
    { json: true },
  );

  const parsed = parseJsonFromModel<PointsCopilotSuggestion>(content ?? "");
  if (!parsed?.pointsPerRinggit) return { ...base, source: "rules" };

  return {
    rationale: parsed.rationale || base.rationale,
    pointsPerRinggit: parsed.pointsPerRinggit,
    pointsRedeemCentsPerPoint: parsed.pointsRedeemCentsPerPoint || base.pointsRedeemCentsPerPoint,
    tierEarning: parsed.tierEarning?.length ? parsed.tierEarning : base.tierEarning,
    redemptionExamples: parsed.redemptionExamples?.length
      ? parsed.redemptionExamples
      : base.redemptionExamples,
    source: "deepseek",
  };
}
