import { adminDb } from "@/lib/db/admin";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  getMerchantPaidOrdersForReports,
  listCustomersForMerchant,
} from "@/lib/db/merchant-repository";
import { buildCompareReport } from "@/lib/reports/compare";
import { buildMerchantProgramContext } from "@/lib/ai/merchant-agent";
import {
  formatIndustryBenchmarksBlock,
  INDUSTRY_AVG_ORDER_CENTS,
  LOYALTY_INDUSTRY_BENCHMARKS,
} from "@/lib/loyalty/industry-benchmarks";
import { formatDecimal } from "@/lib/format/number";

export type MerchantRoiActuals = {
  merchantName: string;
  currency: "MYR" | "SGD";
  symbol: string;
  paidOrderCount: number;
  totalRevenueCents: number;
  avgOrderCents: number;
  avgOrderRm: number;
  revenueLast30DaysCents: number;
  ordersLast30Days: number;
  revenueChangePct: number;
  memberCount: number;
  customerCount: number;
  memberPenetrationPct: number;
  avgVisitsPerMember90d: number;
  industryAvgOrderCents: number;
  vsIndustryAvgOrderPct: number;
};

function money(symbol: string, cents: number) {
  return `${symbol} ${(cents / 100).toFixed(2)}`;
}

function sumOrdersInWindow(
  orders: { total_cents: number; paid_at: string }[],
  fromMs: number,
  toMs: number,
) {
  const filtered = orders.filter((o) => {
    const t = new Date(o.paid_at).getTime();
    return t >= fromMs && t <= toMs;
  });
  const revenueCents = filtered.reduce((s, o) => s + o.total_cents, 0);
  return { revenueCents, orderCount: filtered.length };
}

export async function loadMerchantRoiActuals(merchantSlug: string): Promise<MerchantRoiActuals> {
  const merchant = await getMerchantBySlug(merchantSlug);
  if (!merchant) throw new Error("Merchant not found");

  const currency = merchant.currency;
  const symbol = currency === "SGD" ? "S$" : "RM";

  const [orders, customers] = await Promise.all([
    getMerchantPaidOrdersForReports(merchant.id),
    listCustomersForMerchant(merchant.id),
  ]);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const last30 = sumOrdersInWindow(orders, now - 30 * dayMs, now);
  const totalRevenueCents = orders.reduce((s, o) => s + o.total_cents, 0);
  const paidOrderCount = orders.length;
  const avgOrderCents =
    paidOrderCount > 0 ? Math.round(totalRevenueCents / paidOrderCount) : 0;

  const compare = buildCompareReport(
    orders,
    currency,
    {
      dailyRevenueTargetCents: merchant.daily_revenue_target_cents,
      weeklyRevenueTargetCents: merchant.weekly_revenue_target_cents,
      monthlyRevenueTargetCents: merchant.monthly_revenue_target_cents,
    },
    30,
  );

  const members = customers.filter((c) => c.is_member);
  const memberCount = members.length;
  const customerCount = customers.length;
  const memberPenetrationPct =
    customerCount > 0 ? Math.round((memberCount / customerCount) * 100) : 0;

  const d90 = now - 90 * dayMs;
  const fromIso90 = new Date(d90).toISOString();
  const { data: memberOrderRows } = await adminDb()
    .from("orders")
    .select("customer_id")
    .eq("merchant_id", merchant.id)
    .eq("status", "paid")
    .not("customer_id", "is", null)
    .gte("paid_at", fromIso90);

  const visitsByMember = new Map<string, number>();
  for (const row of memberOrderRows ?? []) {
    const cid = (row as { customer_id: string }).customer_id;
    visitsByMember.set(cid, (visitsByMember.get(cid) ?? 0) + 1);
  }
  const totalMemberVisits90d = [...visitsByMember.values()].reduce((s, n) => s + n, 0);
  const avgVisitsPerMember90d =
    memberCount > 0 ? Math.round((totalMemberVisits90d / memberCount) * 10) / 10 : 0;

  const industryAvgOrderCents = INDUSTRY_AVG_ORDER_CENTS[currency];
  const vsIndustryAvgOrderPct =
    industryAvgOrderCents > 0
      ? Math.round(((avgOrderCents - industryAvgOrderCents) / industryAvgOrderCents) * 100)
      : 0;

  return {
    merchantName: merchant.name,
    currency,
    symbol,
    paidOrderCount,
    totalRevenueCents,
    avgOrderCents,
    avgOrderRm: avgOrderCents / 100,
    revenueLast30DaysCents: last30.revenueCents,
    ordersLast30Days: last30.orderCount,
    revenueChangePct: compare.revenueChangePct,
    memberCount,
    customerCount,
    memberPenetrationPct,
    avgVisitsPerMember90d,
    industryAvgOrderCents,
    vsIndustryAvgOrderPct,
  };
}

export function formatMerchantRoiActualsBlock(actuals: MerchantRoiActuals): string {
  const b = LOYALTY_INDUSTRY_BENCHMARKS;
  const industryAvgRm = (actuals.industryAvgOrderCents / 100).toFixed(2);

  return `
THIS MERCHANT'S LIVE DATA (${actuals.merchantName}) — always use these numbers first:
- Currency: ${actuals.currency}
- All-time paid orders: ${actuals.paidOrderCount}
- All-time revenue: ${money(actuals.symbol, actuals.totalRevenueCents)}
- Your avg order: ${money(actuals.symbol, actuals.avgOrderCents)} (industry typical ${actuals.symbol} ${industryAvgRm}, ${actuals.vsIndustryAvgOrderPct >= 0 ? "+" : ""}${actuals.vsIndustryAvgOrderPct}% vs industry)
- Last 30 days: ${actuals.ordersLast30Days} orders, ${money(actuals.symbol, actuals.revenueLast30DaysCents)} revenue (${actuals.revenueChangePct >= 0 ? "+" : ""}${actuals.revenueChangePct}% vs prior 30 days)
- iRewards members: ${actuals.memberCount} of ${actuals.customerCount} customers (${actuals.memberPenetrationPct}% — industry typical ${b.memberPenetrationPercent.typical}%)
- Avg member visits (90d): ${formatDecimal(actuals.avgVisitsPerMember90d)} (industry typical ~${b.visitsPerMemberMonth.typical}/month)
`.trim();
}

export async function buildPointsRoiAiContext(merchantSlug: string): Promise<string> {
  const [programContext, actuals] = await Promise.all([
    buildMerchantProgramContext(merchantSlug),
    loadMerchantRoiActuals(merchantSlug),
  ]);

  return `${formatMerchantRoiActualsBlock(actuals)}

${programContext}

${formatIndustryBenchmarksBlock(actuals.currency)}`;
}
