export type PaidOrderRow = {
  total_cents: number;
  paid_at: string;
};

import { INDUSTRY_AVG_ORDER_CENTS } from "@/lib/loyalty/industry-benchmarks";

export type DayOfWeekBenchmark = {
  day: string;
  dayIndex: number;
  avgRevenueCents: number;
  avgOrderCount: number;
  sampleDays: number;
};

export type PeriodComparison = {
  label: string;
  from: string;
  to: string;
  revenueCents: number;
  orderCount: number;
  avgOrderCents: number;
};

export type CompareReport = {
  current: PeriodComparison;
  previous: PeriodComparison;
  yearAgo: PeriodComparison | null;
  revenueChangePct: number;
  orderChangePct: number;
  dayOfWeekBenchmark: DayOfWeekBenchmark[];
  trend: {
    label: string;
    avgDailyRevenueCents: number;
    direction: "up" | "down" | "flat";
    changePct: number;
  };
  targets: {
    dailyTargetCents: number | null;
    weeklyTargetCents: number | null;
    monthlyTargetCents: number | null;
    actualVsDailyTargetPct: number | null;
  };
  industry: {
    label: string;
    avgOrderCents: number;
    yourAvgOrderCents: number;
    deltaPct: number;
    note: string;
  };
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sumPeriod(orders: PaidOrderRow[], fromMs: number, toMs: number): PeriodComparison {
  const filtered = orders.filter((o) => {
    const t = new Date(o.paid_at).getTime();
    return t >= fromMs && t <= toMs;
  });
  const revenueCents = filtered.reduce((s, o) => s + o.total_cents, 0);
  const orderCount = filtered.length;
  return {
    label: "",
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    revenueCents,
    orderCount,
    avgOrderCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
  };
}

function pctChange(current: number, baseline: number): number {
  if (baseline === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - baseline) / baseline) * 100);
}

export function buildDayOfWeekBenchmark(orders: PaidOrderRow[], days = 90): DayOfWeekBenchmark[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const byDay = new Map<number, { revenue: number; orders: number; dates: Set<string> }>();

  for (let i = 0; i < 7; i++) {
    byDay.set(i, { revenue: 0, orders: 0, dates: new Set() });
  }

  for (const order of orders) {
    const paid = new Date(order.paid_at);
    if (paid.getTime() < cutoff) continue;
    const dow = paid.getDay();
    const bucket = byDay.get(dow)!;
    bucket.revenue += order.total_cents;
    bucket.orders += 1;
    bucket.dates.add(paid.toISOString().slice(0, 10));
  }

  return [...byDay.entries()].map(([dayIndex, bucket]) => {
    const sampleDays = bucket.dates.size || 1;
    return {
      day: DAY_NAMES[dayIndex],
      dayIndex,
      avgRevenueCents: Math.round(bucket.revenue / sampleDays),
      avgOrderCount: Math.round((bucket.orders / sampleDays) * 10) / 10,
      sampleDays,
    };
  });
}

export function buildCompareReport(
  orders: PaidOrderRow[],
  currency: "MYR" | "SGD",
  targets: {
    dailyRevenueTargetCents?: number | null;
    weeklyRevenueTargetCents?: number | null;
    monthlyRevenueTargetCents?: number | null;
  },
  periodDays = 7,
): CompareReport {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const currentEnd = now;
  const currentStart = now - periodDays * dayMs;
  const previousEnd = currentStart - 1;
  const previousStart = previousEnd - periodDays * dayMs;
  const yearAgoEnd = currentEnd - 365 * dayMs;
  const yearAgoStart = currentStart - 365 * dayMs;

  const current = sumPeriod(orders, currentStart, currentEnd);
  current.label = `Last ${periodDays} days`;
  const previous = sumPeriod(orders, previousStart, previousEnd);
  previous.label = `Previous ${periodDays} days`;

  const yearOrders = orders.filter((o) => {
    const t = new Date(o.paid_at).getTime();
    return t >= yearAgoStart && t <= yearAgoEnd;
  });
  const yearAgo =
    yearOrders.length > 0
      ? { ...sumPeriod(orders, yearAgoStart, yearAgoEnd), label: "Same period last year" }
      : null;

  const avgDailyCurrent = Math.round(current.revenueCents / periodDays);
  const avgDailyPrevious = Math.round(previous.revenueCents / periodDays);
  const trendChange = pctChange(avgDailyCurrent, avgDailyPrevious);

  const dailyTarget = targets.dailyRevenueTargetCents ?? null;
  const actualVsDailyTargetPct =
    dailyTarget && dailyTarget > 0 ? pctChange(avgDailyCurrent, dailyTarget) : null;

  const industryAvg = INDUSTRY_AVG_ORDER_CENTS[currency] ?? 2800;

  return {
    current,
    previous,
    yearAgo,
    revenueChangePct: pctChange(current.revenueCents, previous.revenueCents),
    orderChangePct: pctChange(current.orderCount, previous.orderCount),
    dayOfWeekBenchmark: buildDayOfWeekBenchmark(orders),
    trend: {
      label: "Average daily revenue",
      avgDailyRevenueCents: avgDailyCurrent,
      direction: trendChange > 2 ? "up" : trendChange < -2 ? "down" : "flat",
      changePct: trendChange,
    },
    targets: {
      dailyTargetCents: dailyTarget,
      weeklyTargetCents: targets.weeklyRevenueTargetCents ?? null,
      monthlyTargetCents: targets.monthlyRevenueTargetCents ?? null,
      actualVsDailyTargetPct,
    },
    industry: {
      label: "Typical independent cafe (estimate)",
      avgOrderCents: industryAvg,
      yourAvgOrderCents: current.avgOrderCents,
      deltaPct: pctChange(current.avgOrderCents, industryAvg),
      note: "Industry benchmark is indicative. Set daily targets in Settings → Store for personalised goals.",
    },
  };
}

/** Round to nearest major currency unit; derive weekly/monthly from avg daily sales. */
export function suggestedRevenueTargetsFromAvgDaily(avgDailyRevenueCents: number) {
  const unit = 100;
  const daily = Math.max(unit, Math.round(avgDailyRevenueCents / unit) * unit);
  return {
    dailyRevenueTargetCents: daily,
    weeklyRevenueTargetCents: daily * 7,
    monthlyRevenueTargetCents: daily * 30,
  };
}
