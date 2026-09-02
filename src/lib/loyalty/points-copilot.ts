import { formatDecimal, formatMultiplier } from "@/lib/format/number";

type LevelInput = { name: string; pointsMultiplier: number };

export type PointsCopilotSuggestion = {
  rationale: string;
  pointsPerRinggit: number;
  pointsRedeemCentsPerPoint: number;
  tierEarning: { name: string; pointsPerRm: number }[];
  redemptionExamples: { points: number; valueRm: number }[];
};

/** Rule-based earn/redeem suggestions from tier ladder (no external AI). */
export function suggestPointsProgram(
  levels: LevelInput[],
  current: { pointsPerRinggit: number; pointsRedeemCentsPerPoint: number },
): PointsCopilotSuggestion {
  const baseRate = current.pointsPerRinggit > 0 ? current.pointsPerRinggit : 0.1;
  const redeemCents = current.pointsRedeemCentsPerPoint || 10;
  const sorted = [...levels].sort((a, b) => a.pointsMultiplier - b.pointsMultiplier);

  const tierEarning = sorted.map((l) => ({
    name: l.name || `Tier ${l.pointsMultiplier}`,
    pointsPerRm: Math.round(baseRate * l.pointsMultiplier * 10) / 10,
  }));

  const redemptionExamples = [100, 200, 500, 1000].map((points) => ({
    points,
    valueRm: (points * redeemCents) / 100,
  }));

  const topTier = sorted[sorted.length - 1];
  const rationale = [
    "Based on F&B loyalty best practices for MY/SG cafes:",
    `Base earn of ${formatDecimal(baseRate)} pt/RM keeps rewards attainable while tier multipliers (up to ${formatMultiplier(topTier?.pointsMultiplier ?? 2)}x on ${topTier?.name ?? "top tier"}) reward regulars.`,
    `Redemption at ${redeemCents} sen/point (~${Math.round(100 / baseRate / (redeemCents / 100))} RM spend per 100 pts redeemed) balances margin with perceived value.`,
  ].join(" ");

  return {
    rationale,
    pointsPerRinggit: baseRate,
    pointsRedeemCentsPerPoint: redeemCents,
    tierEarning,
    redemptionExamples,
  };
}

export function suggestHigherEarn(current: PointsCopilotSuggestion): PointsCopilotSuggestion {
  return suggestPointsProgram(
    current.tierEarning.map((t, i) => ({
      name: t.name,
      pointsMultiplier: 1 + i * 0.15 + 0.1,
    })),
    {
      pointsPerRinggit: Math.round((current.pointsPerRinggit + 0.05) * 100) / 100,
      pointsRedeemCentsPerPoint: current.pointsRedeemCentsPerPoint,
    },
  );
}

export function suggestLowerEarn(current: PointsCopilotSuggestion): PointsCopilotSuggestion {
  return suggestPointsProgram(
    current.tierEarning.map((t, i) => ({
      name: t.name,
      pointsMultiplier: Math.max(1, 1 + i * 0.1),
    })),
    {
      pointsPerRinggit: Math.max(0.05, current.pointsPerRinggit - 0.05),
      pointsRedeemCentsPerPoint: current.pointsRedeemCentsPerPoint,
    },
  );
}
