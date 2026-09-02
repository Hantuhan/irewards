import { deepseekChat, isDeepseekConfigured, type DeepseekMessage } from "@/lib/ai/deepseek";
import { POINTS_PROGRAM_KNOWLEDGE } from "@/lib/loyalty/points-program-knowledge";
import {
  buildPointsRoiAiContext,
  loadMerchantRoiActuals,
  type MerchantRoiActuals,
} from "@/lib/loyalty/load-merchant-roi-context";
import { LOYALTY_INDUSTRY_BENCHMARKS } from "@/lib/loyalty/industry-benchmarks";
import {
  calculatePointsRoi,
  type PointsRoiResult,
  type PointsRoiScenario,
} from "@/lib/loyalty/points-roi";
import { formatDecimal } from "@/lib/format/number";

export type PointsRoiChatTurn = { role: "user" | "assistant"; content: string };

export type PointsRoiChatResult = {
  reply: string;
  source: "deepseek" | "rules";
};

export const POINTS_ROI_CHAT_STARTERS = [
  "How does my program compare to industry?",
  "Is my earn rate too generous for my avg order?",
  "What happens if I double points on Mondays?",
  "How much margin do I lose at 50% redemption?",
  "How many extra visits pay for this program?",
];

function compareToIndustry(
  value: number,
  range: { min: number; max: number; typical: number },
): string {
  if (value < range.min) return `below industry (${range.min}–${range.max}%, typical ~${range.typical}%)`;
  if (value > range.max) return `above industry (${range.min}–${range.max}%, typical ~${range.typical}%)`;
  return `within industry range (${range.min}–${range.max}%, typical ~${range.typical}%)`;
}

function fallbackRoiReply(
  message: string,
  roi: PointsRoiResult,
  actuals: MerchantRoiActuals,
): string {
  const { symbol } = actuals;
  const industry = LOYALTY_INDUSTRY_BENCHMARKS;
  const lower = message.toLowerCase();

  if (/^(hi|hello|hey|help)\b/i.test(message.trim())) {
    return `I'm using **${actuals.merchantName}'s** live data: ${actuals.paidOrderCount} paid orders, avg order **${symbol} ${formatDecimal(actuals.avgOrderRm)}**, **${actuals.memberCount}** iRewards members.\n\nAsk how your program compares to industry, or how slider changes affect margin.`;
  }

  if (lower.includes("industry") || lower.includes("compare") || lower.includes("benchmark")) {
    return `**${actuals.merchantName}** vs industry (${industry.region}):\n\n- Avg order: **${symbol} ${formatDecimal(actuals.avgOrderRm)}** vs industry **${symbol} ${formatDecimal(actuals.industryAvgOrderCents / 100)}** (${actuals.vsIndustryAvgOrderPct >= 0 ? "+" : ""}${actuals.vsIndustryAvgOrderPct}%)\n- Your earn-back: **${formatDecimal(roi.earnBackPercent)}%** — ${compareToIndustry(roi.earnBackPercent, industry.earnBackPercent)}\n- Reward cost / revenue: **${formatDecimal(roi.costAsPercentOfRevenue)}%** — ${compareToIndustry(roi.costAsPercentOfRevenue, industry.netLiabilityPercent)}\n- Members: **${actuals.memberPenetrationPct}%** penetration (industry typical ~${industry.memberPenetrationPercent.typical}%)`;
  }

  if (lower.includes("generous") || lower.includes("too high") || lower.includes("lower")) {
    return `For **${actuals.merchantName}**, modelled earn-back is **${formatDecimal(roi.earnBackPercent)}%** (${compareToIndustry(roi.earnBackPercent, industry.earnBackPercent)}).\n\nReward cost is **${formatDecimal(roi.costAsPercentOfRevenue)}%** of revenue — industry typical is **~${industry.netLiabilityPercent.typical}%**. Your avg order is **${symbol} ${formatDecimal(actuals.avgOrderRm)}**.`;
  }

  if (lower.includes("redemption") || lower.includes("redeem")) {
    return `**${actuals.merchantName}** at your scenario: monthly liability **${symbol} ${formatDecimal(roi.monthlyRedemptionLiabilityRm)}** on **${symbol} ${formatDecimal(roi.monthlyGrossRevenueRm)}** revenue.\n\nIndustry typical redemption: **~${industry.redemptionRatePercent.typical}%**. Net margin after rewards: **${formatDecimal(roi.netMarginAfterRewardsPercent)}%**.`;
  }

  if (lower.includes("visit") || lower.includes("break")) {
    const visitNote =
      actuals.avgVisitsPerMember90d > 0
        ? ` Your members average **${formatDecimal(actuals.avgVisitsPerMember90d)}** visits in 90 days (industry ~${industry.visitsPerMemberMonth.typical}/month).`
        : "";
    if (roi.visitsToBreakEven) {
      return `For **${actuals.merchantName}**, you need about **${roi.visitsToBreakEven} extra visits/month** to offset reward liability.${visitNote}`;
    }
    return `With low redemption, break-even visits are minimal for **${actuals.merchantName}**.${visitNote}`;
  }

  if (lower.includes("monday") || lower.includes("double")) {
    return `**${actuals.merchantName}**: Monday double-points rules multiply earn on matching days. Set a rule under **Points rule**, then re-check ROI with a higher tier multiplier.`;
  }

  const merchantInsights = roi.insights.map((line) => line.replace(/^/, `${actuals.merchantName}: `));
  return `${merchantInsights.join("\n\n")}\n\n*(Using your store data — add DEEPSEEK_API_KEY for deeper analysis.)*`;
}

export async function chatWithPointsRoi(input: {
  merchantSlug: string;
  message: string;
  history?: PointsRoiChatTurn[];
  scenario: PointsRoiScenario;
  program: {
    pointsPerRinggit: number;
    centsPerPoint: number;
    currency: string;
    topTierName: string;
    topTierMultiplier: number;
    rules: import("@/lib/loyalty/points-rules").PointsRule[];
  };
}): Promise<PointsRoiChatResult> {
  const [roi, actuals, merchantContext] = await Promise.all([
    Promise.resolve(calculatePointsRoi(input.program, input.scenario)),
    loadMerchantRoiActuals(input.merchantSlug),
    buildPointsRoiAiContext(input.merchantSlug),
  ]);

  const symbol = actuals.symbol;
  const scenarioBlock = `
Calculator scenario (merchant-adjustable what-if — may differ from live averages above):
- Avg order: ${symbol} ${formatDecimal(input.scenario.avgOrderRm)} (live avg: ${symbol} ${formatDecimal(actuals.avgOrderRm)})
- Active members: ${input.scenario.activeMembers} (live members: ${actuals.memberCount})
- Visits/member/month: ${formatDecimal(input.scenario.visitsPerMemberMonth)} (live ~${formatDecimal(actuals.avgVisitsPerMember90d / 3)} from 90d data)
- Gross margin: ${formatDecimal(input.scenario.grossMarginPercent, 0)}%
- Redemption rate: ${formatDecimal(input.scenario.redemptionRatePercent, 0)}%

Computed ROI from scenario:
- Earn-back: ${formatDecimal(roi.earnBackPercent)}%
- Points/visit: ${roi.pointsPerVisit}
- Monthly liability: ${symbol} ${formatDecimal(roi.monthlyRedemptionLiabilityRm)}
- Cost % of revenue: ${formatDecimal(roi.costAsPercentOfRevenue)}%
- Net margin after rewards: ${formatDecimal(roi.netMarginAfterRewardsPercent)}%
- Break-even extra visits: ${roi.visitsToBreakEven ?? "n/a"}
`.trim();

  if (!isDeepseekConfigured()) {
    return {
      reply: fallbackRoiReply(input.message, roi, actuals),
      source: "rules",
    };
  }

  const system = `You are the iRewards loyalty ROI advisor for ONE merchant.
CRITICAL RULES:
1. ALWAYS ground answers in THIS merchant's live data first (name, orders, revenue, members, program settings).
2. When the user asks about benchmarks, compare their numbers to industry standards — clearly label "your store" vs "industry typical".
3. NEVER invent statistics. Only use numbers from the context below.
4. If calculator sliders differ from live actuals, explain both (e.g. "your real avg order is X, but you're modelling Y").
5. Be concise, practical, and cite ${symbol} amounts.

${POINTS_PROGRAM_KNOWLEDGE}

${merchantContext}

${scenarioBlock}`;

  const history: DeepseekMessage[] = (input.history ?? []).slice(-8).map((t) => ({
    role: t.role,
    content: t.content,
  }));

  const reply = await deepseekChat(
    [
      { role: "system", content: system },
      ...history,
      { role: "user", content: input.message },
    ],
    { temperature: 0.35 },
  );

  if (!reply) {
    return {
      reply: fallbackRoiReply(input.message, roi, actuals),
      source: "rules",
    };
  }

  return { reply, source: "deepseek" };
}
