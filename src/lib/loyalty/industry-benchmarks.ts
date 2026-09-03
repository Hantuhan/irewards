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

/** Visual scale for the Step 5 earn-back verdict gauge (percent of spend). */
export const EARN_BACK_GAUGE_MAX_PERCENT = 12;

export type EarnBackVerdictTone = "tight" | "healthy" | "generous" | "too_high";

export type EarnBackVerdict = {
  tone: EarnBackVerdictTone;
  label: string;
  advice: string;
  countryLabel: string;
  industryMin: number;
  industryMax: number;
  industryTypical: number;
  /** 0–100 position on the gauge for the merchant's earn-back. */
  youMarkerPct: number;
  /** 0–100 position for industry typical. */
  industryMarkerPct: number;
};

export function countryLabelForCurrency(currency: "MYR" | "SGD"): string {
  return currency === "SGD" ? "Singapore" : "Malaysia";
}

/**
 * Plain-language verdict for cafe owners: is this earn-back good, tight, or too rich
 * vs MY/SG independent café norms.
 */
export function earnBackVerdict(
  earnBackPercent: number,
  currency: "MYR" | "SGD",
): EarnBackVerdict {
  const range = LOYALTY_INDUSTRY_BENCHMARKS.earnBackPercent;
  const country = countryLabelForCurrency(currency);
  const clampPct = (value: number) =>
    Math.min(100, Math.max(0, (value / EARN_BACK_GAUGE_MAX_PERCENT) * 100));

  const base = {
    countryLabel: country,
    industryMin: range.min,
    industryMax: range.max,
    industryTypical: range.typical,
    youMarkerPct: clampPct(earnBackPercent),
    industryMarkerPct: clampPct(range.typical),
  };

  if (earnBackPercent < range.min) {
    return {
      ...base,
      tone: "tight",
      label: "A bit tight",
      advice: `Customers may barely feel the reward. Most cafes in ${country} sit near ${range.typical}% (about ${range.min}–${range.max}%). Consider collecting a few more points or making each point worth a bit more.`,
    };
  }

  if (earnBackPercent <= range.max) {
    return {
      ...base,
      tone: "healthy",
      label: "Looks healthy",
      advice: `You're in the same ballpark as most cafes in ${country} — they usually stay near ${range.typical}% (about ${range.min}–${range.max}%). Good place to start; you can fine-tune later.`,
    };
  }

  if (earnBackPercent <= 5) {
    return {
      ...base,
      tone: "generous",
      label: "More generous than most",
      advice: `Customers will love it, but it costs more than the typical ${country} cafe (~${range.typical}%). Fine if you want a strong loyalty punch — watch the monthly cost below.`,
    };
  }

  return {
    ...base,
    tone: "too_high",
    label: "Too rich for most cafes",
    advice: `At ${earnBackPercent.toFixed(1)}%, a big chunk of every bill can come back as discounts someday. Most cafes in ${country} stay near ${range.typical}% — not ${earnBackPercent.toFixed(0)}%. Go back and collect fewer points or make each point worth less.`,
  };
}

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
