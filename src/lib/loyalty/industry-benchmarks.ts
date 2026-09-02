/** MY/SG F&B loyalty & café benchmarks for ROI comparisons (indicative, not merchant data). */

export const INDUSTRY_AVG_ORDER_CENTS: Record<"MYR" | "SGD", number> = {
  MYR: 2800,
  SGD: 3200,
};

export type LoyaltyIndustryBenchmarks = {
  region: string;
  earnBackPercent: { min: number; max: number; typical: number };
  netLiabilityPercent: { min: number; max: number; typical: number };
  redemptionRatePercent: { min: number; max: number; typical: number };
  visitsPerMemberMonth: { min: number; max: number; typical: number };
  grossMarginPercent: { min: number; max: number; typical: number };
  memberPenetrationPercent: { min: number; max: number; typical: number };
};

export const LOYALTY_INDUSTRY_BENCHMARKS: LoyaltyIndustryBenchmarks = {
  region: "MY/SG independent café",
  earnBackPercent: { min: 1, max: 2.5, typical: 1.5 },
  netLiabilityPercent: { min: 1, max: 3, typical: 2 },
  redemptionRatePercent: { min: 25, max: 50, typical: 40 },
  visitsPerMemberMonth: { min: 1.5, max: 3, typical: 2 },
  grossMarginPercent: { min: 58, max: 72, typical: 65 },
  memberPenetrationPercent: { min: 15, max: 40, typical: 28 },
};

export function formatIndustryBenchmarksBlock(currency: "MYR" | "SGD"): string {
  const b = LOYALTY_INDUSTRY_BENCHMARKS;
  const symbol = currency === "SGD" ? "S$" : "RM";
  const avgOrder = (INDUSTRY_AVG_ORDER_CENTS[currency] / 100).toFixed(2);

  return `
Industry standards (${b.region}) — for comparison only, NOT this merchant's data:
- Typical avg order: ${symbol} ${avgOrder}
- Earn-back (theoretical): ${b.earnBackPercent.min}–${b.earnBackPercent.max}% (typical ~${b.earnBackPercent.typical}%)
- Net reward liability: ${b.netLiabilityPercent.min}–${b.netLiabilityPercent.max}% of revenue (typical ~${b.netLiabilityPercent.typical}%)
- Points redemption rate: ${b.redemptionRatePercent.min}–${b.redemptionRatePercent.max}% (typical ~${b.redemptionRatePercent.typical}%)
- Member visits/month: ${b.visitsPerMemberMonth.min}–${b.visitsPerMemberMonth.max} (typical ~${b.visitsPerMemberMonth.typical})
- Gross margin: ${b.grossMarginPercent.min}–${b.grossMarginPercent.max}% (typical ~${b.grossMarginPercent.typical}%)
`.trim();
}
