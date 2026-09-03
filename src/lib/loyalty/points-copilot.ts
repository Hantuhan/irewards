import { formatDecimal, formatMultiplier } from "@/lib/format/number";
import {
  MEMBERSHIP_DEFAULT_EARN,
  MEMBERSHIP_DEFAULT_REDEEM,
  MEMBERSHIP_EARN_PRESETS,
} from "@/lib/loyalty/membership-setup";

type LevelInput = { name: string; pointsMultiplier: number };

export type PointsCopilotSuggestion = {
  rationale: string;
  pointsPerRinggit: number;
  pointsRedeemCentsPerPoint: number;
  tierEarning: { name: string; pointsPerRm: number; multiplier: number }[];
  redemptionExamples: { points: number; valueRm: number }[];
};

/**
 * Program assistant mirrors whatever the iRewards guide saved —
 * including custom collect rates below the preset cards (e.g. 0.05).
 */
export function suggestPointsProgram(
  levels: LevelInput[],
  current: { pointsPerRinggit: number; pointsRedeemCentsPerPoint: number },
): PointsCopilotSuggestion {
  const baseRate =
    current.pointsPerRinggit > 0
      ? current.pointsPerRinggit
      : MEMBERSHIP_DEFAULT_EARN.pointsPerRinggit;
  const redeemCents =
    current.pointsRedeemCentsPerPoint > 0
      ? current.pointsRedeemCentsPerPoint
      : MEMBERSHIP_DEFAULT_REDEEM.centsPerPoint;
  const sorted = [...levels].sort((a, b) => a.pointsMultiplier - b.pointsMultiplier);

  const tierEarning = sorted.map((l) => ({
    name: l.name || `Tier ${l.pointsMultiplier}`,
    pointsPerRm: baseRate * l.pointsMultiplier,
    multiplier: l.pointsMultiplier,
  }));

  const redemptionExamples = [100, 200, 500, 1000].map((points) => ({
    points,
    valueRm: (points * redeemCents) / 100,
  }));

  const topTier = sorted[sorted.length - 1];
  const earnLabel =
    MEMBERSHIP_EARN_PRESETS.find((p) => Math.abs(p.pointsPerRinggit - baseRate) < 0.0005)
      ?.label ?? "Custom";
  const rationale = [
    "Same Collecting & using setup as the iRewards guide:",
    `${earnLabel} earn (${formatDecimal(baseRate)} pt/RM) with level speeds up to ${formatMultiplier(topTier?.pointsMultiplier ?? 2)}× on ${topTier?.name ?? "Platinum"}.`,
    `Redeem at ${redeemCents} sen/point — as configured in the guide.`,
  ].join(" ");

  return {
    rationale,
    pointsPerRinggit: baseRate,
    pointsRedeemCentsPerPoint: redeemCents,
    tierEarning,
    redemptionExamples,
  };
}
