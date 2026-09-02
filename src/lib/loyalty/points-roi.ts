import { effectiveEarnBackPercent, simulatePointsEarn } from "@/lib/loyalty/points-calculator";
import type { PointsRule } from "@/lib/loyalty/points-rules";
import { formatDecimal, formatMultiplier } from "@/lib/format/number";

export type PointsRoiScenario = {
  avgOrderRm: number;
  visitsPerMemberMonth: number;
  activeMembers: number;
  grossMarginPercent: number;
  redemptionRatePercent: number;
};

export type PointsRoiProgram = {
  pointsPerRinggit: number;
  centsPerPoint: number;
  currency: string;
  topTierName: string;
  topTierMultiplier: number;
  rules: PointsRule[];
};

export type PointsRoiResult = {
  earnBackPercent: number;
  pointsPerVisit: number;
  rewardValuePerVisitRm: number;
  monthlyPointsIssued: number;
  monthlyRedemptionLiabilityRm: number;
  monthlyGrossRevenueRm: number;
  netMarginAfterRewardsPercent: number;
  costAsPercentOfRevenue: number;
  visitsToBreakEven: number | null;
  insights: string[];
};

export const DEFAULT_ROI_SCENARIO: PointsRoiScenario = {
  avgOrderRm: 35,
  visitsPerMemberMonth: 2,
  activeMembers: 120,
  grossMarginPercent: 65,
  redemptionRatePercent: 40,
};

export function calculatePointsRoi(
  program: PointsRoiProgram,
  scenario: PointsRoiScenario,
): PointsRoiResult {
  const earnBackPercent = effectiveEarnBackPercent(program.pointsPerRinggit, program.centsPerPoint);
  const orderCents = Math.round(Math.max(0, scenario.avgOrderRm) * 100);

  const earn = simulatePointsEarn({
    totalCents: orderCents,
    pointsPerRinggit: program.pointsPerRinggit,
    tierMultiplier: program.topTierMultiplier,
    rules: program.rules.filter((r) => r.status === "active"),
    tierName: program.topTierName,
  });

  const pointsPerVisit = earn.finalPoints;
  const fullRedeemValueRm = (pointsPerVisit * program.centsPerPoint) / 100;
  const redemptionRate =
    Math.min(100, Math.max(0, scenario.redemptionRatePercent)) / 100;
  const rewardValuePerVisitRm = fullRedeemValueRm * redemptionRate;

  const monthlyVisits =
    Math.max(0, scenario.activeMembers) * Math.max(0, scenario.visitsPerMemberMonth);
  const monthlyGrossRevenueRm = monthlyVisits * Math.max(0, scenario.avgOrderRm);
  const monthlyPointsIssued = pointsPerVisit * monthlyVisits;
  const monthlyRedemptionLiabilityRm = rewardValuePerVisitRm * monthlyVisits;

  const margin = Math.min(100, Math.max(0, scenario.grossMarginPercent)) / 100;
  const grossProfitRm = monthlyGrossRevenueRm * margin;
  const netProfitAfterRewards = grossProfitRm - monthlyRedemptionLiabilityRm;
  const netMarginAfterRewardsPercent =
    monthlyGrossRevenueRm > 0 ? (netProfitAfterRewards / monthlyGrossRevenueRm) * 100 : 0;
  const costAsPercentOfRevenue =
    monthlyGrossRevenueRm > 0
      ? (monthlyRedemptionLiabilityRm / monthlyGrossRevenueRm) * 100
      : 0;

  const contributionPerVisit = Math.max(0, scenario.avgOrderRm) * margin;
  const visitsToBreakEven =
    contributionPerVisit > 0 && monthlyRedemptionLiabilityRm > 0
      ? Math.ceil(monthlyRedemptionLiabilityRm / contributionPerVisit)
      : null;

  const currencyLabel = program.currency === "SGD" ? "S$" : "RM";
  const insights = [
    `Top-tier members (${program.topTierName}, ${formatMultiplier(program.topTierMultiplier)}×) earn ~${pointsPerVisit} pts per ${currencyLabel} ${formatDecimal(scenario.avgOrderRm)} visit — ${formatDecimal(earnBackPercent)}% theoretical earn-back.`,
    `At ${formatDecimal(scenario.redemptionRatePercent, 0)}% redemption, rewards cost ~${formatDecimal(costAsPercentOfRevenue)}% of gross revenue each month.`,
    visitsToBreakEven
      ? `You need ~${visitsToBreakEven} extra visits/month to offset reward liability at ${formatDecimal(scenario.grossMarginPercent, 0)}% gross margin.`
      : "Low redemption keeps reward cost minimal this month.",
  ];

  return {
    earnBackPercent,
    pointsPerVisit,
    rewardValuePerVisitRm,
    monthlyPointsIssued,
    monthlyRedemptionLiabilityRm,
    monthlyGrossRevenueRm,
    netMarginAfterRewardsPercent,
    costAsPercentOfRevenue,
    visitsToBreakEven,
    insights,
  };
}
