import type { SalesPeriod, SalesReportBucket } from "@/lib/merchant/sales-report";
import type { PaidOrderRow } from "@/lib/reports/compare";

export type TrendComparePoint = {
  periodStart: string;
  label: string;
  revenueCents: number;
  compareRevenueCents: number;
};

export type TodayBenchmarkBar = {
  id: "today" | "yesterday" | "weekly" | "lastMonth";
  label: string;
  revenueCents: number;
  /** % difference vs today's revenue (null for today) */
  vsTodayPct: number | null;
};

export type TrendChartsData = {
  seriesWithCompare: TrendComparePoint[];
  todayBenchmarks: TodayBenchmarkBar[];
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function datePartsInTz(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addDays(year: number, month: number, day: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function weekStartFromDate(date: Date, timeZone: string) {
  const { year, month, day, weekday } = datePartsInTz(date, timeZone);
  const mondayOffset = ((WEEKDAY_INDEX[weekday] ?? 0) + 6) % 7;
  return addDays(year, month, day, -mondayOffset);
}

function bucketKeyForDate(date: Date, period: SalesPeriod, timeZone: string): string {
  const { year, month, day } = datePartsInTz(date, timeZone);
  if (period === "daily") return toDateKey(year, month, day);
  if (period === "monthly") return `${year}-${pad(month)}`;
  const weekStart = weekStartFromDate(date, timeZone);
  return toDateKey(weekStart.year, weekStart.month, weekStart.day);
}

function revenueByBucket(
  orders: PaidOrderRow[],
  period: SalesPeriod,
  timeZone: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const order of orders) {
    if (!order.paid_at) continue;
    const key = bucketKeyForDate(new Date(order.paid_at), period, timeZone);
    map.set(key, (map.get(key) ?? 0) + order.total_cents);
  }
  return map;
}

function pctChange(current: number, baseline: number): number {
  if (baseline === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - baseline) / baseline) * 100);
}

function shiftBucketKey(key: string, period: SalesPeriod, delta: number): string {
  if (period === "monthly") {
    const [year, month] = key.split("-").map(Number);
    let m = month + delta;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    return `${y}-${pad(m)}`;
  }
  const [year, month, day] = key.split("-").map(Number);
  const step = period === "weekly" ? delta * 7 : delta;
  const shifted = addDays(year, month, day, step);
  return toDateKey(shifted.year, shifted.month, shifted.day);
}

export function buildTrendChartsData(
  orders: PaidOrderRow[],
  series: SalesReportBucket[],
  period: SalesPeriod,
  timeZone: string,
): TrendChartsData {
  const byBucket = revenueByBucket(orders, period, timeZone);

  const seriesWithCompare: TrendComparePoint[] = series.map((row) => {
    const currentKey =
      period === "monthly"
        ? row.periodStart.slice(0, 7)
        : row.periodStart.slice(0, 10);
    const compareKey = shiftBucketKey(currentKey, period, -1);
    return {
      periodStart: row.periodStart,
      label: row.label,
      revenueCents: row.revenueCents,
      compareRevenueCents: byBucket.get(compareKey) ?? 0,
    };
  });

  const dailyByBucket = revenueByBucket(orders, "daily", timeZone);
  const now = new Date();
  const { year, month, day } = datePartsInTz(now, timeZone);
  const todayKey = toDateKey(year, month, day);
  const yesterdayParts = addDays(year, month, day, -1);
  const yesterdayKey = toDateKey(yesterdayParts.year, yesterdayParts.month, yesterdayParts.day);

  const todayCents = dailyByBucket.get(todayKey) ?? 0;
  const yesterdayCents = dailyByBucket.get(yesterdayKey) ?? 0;

  let weeklyTotal = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(year, month, day, -i);
    weeklyTotal += dailyByBucket.get(toDateKey(d.year, d.month, d.day)) ?? 0;
  }
  const weeklyAvgCents = Math.round(weeklyTotal / 7);

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const daysInPrevMonth = new Date(prevMonth.year, prevMonth.month, 0).getDate();
  let lastMonthTotal = 0;
  for (let d = 1; d <= daysInPrevMonth; d++) {
    lastMonthTotal +=
      dailyByBucket.get(toDateKey(prevMonth.year, prevMonth.month, d)) ?? 0;
  }
  const lastMonthAvgCents = Math.round(lastMonthTotal / daysInPrevMonth);

  const todayBenchmarks: TodayBenchmarkBar[] = [
    {
      id: "today",
      label: "Today",
      revenueCents: todayCents,
      vsTodayPct: null,
    },
    {
      id: "yesterday",
      label: "Yesterday",
      revenueCents: yesterdayCents,
      vsTodayPct: pctChange(todayCents, yesterdayCents),
    },
    {
      id: "weekly",
      label: "7-day avg",
      revenueCents: weeklyAvgCents,
      vsTodayPct: pctChange(todayCents, weeklyAvgCents),
    },
    {
      id: "lastMonth",
      label: "Last month avg",
      revenueCents: lastMonthAvgCents,
      vsTodayPct: pctChange(todayCents, lastMonthAvgCents),
    },
  ];

  return { seriesWithCompare, todayBenchmarks };
}
