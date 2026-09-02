export type SalesPeriod = "daily" | "weekly" | "monthly";

export type SalesReportBucket = {
  periodStart: string;
  label: string;
  revenueCents: number;
  orderCount: number;
};

export type SalesReport = {
  period: SalesPeriod;
  from: string;
  to: string;
  summary: {
    revenueCents: number;
    orderCount: number;
    avgOrderCents: number;
  };
  series: SalesReportBucket[];
};

type PaidOrder = { total_cents: number; paid_at: string };

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

function labelForBucket(key: string, period: SalesPeriod): string {
  if (period === "monthly") {
    const [year, month] = key.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString("en-MY", { month: "short", year: "numeric" });
  }
  const [year, month, day] = key.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  if (period === "weekly") {
    return `Week of ${d.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`;
  }
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
}

function rangeForPeriod(period: SalesPeriod, timeZone: string) {
  const now = new Date();
  const { year, month, day } = datePartsInTz(now, timeZone);
  const endKey = toDateKey(year, month, day);

  if (period === "daily") {
    const start = addDays(year, month, day, -29);
    return { fromKey: toDateKey(start.year, start.month, start.day), toKey: endKey };
  }
  if (period === "weekly") {
    const start = addDays(year, month, day, -7 * 11);
    const weekStart = weekStartFromDate(
      new Date(Date.UTC(start.year, start.month - 1, start.day)),
      timeZone,
    );
    return { fromKey: toDateKey(weekStart.year, weekStart.month, weekStart.day), toKey: endKey };
  }
  const startMonth = month - 11 <= 0 ? month - 11 + 12 : month - 11;
  const startYear = month - 11 <= 0 ? year - 1 : year;
  return { fromKey: `${startYear}-${pad(startMonth)}`, toKey: `${year}-${pad(month)}` };
}

function enumerateBucketKeys(
  fromKey: string,
  toKey: string,
  period: SalesPeriod,
): string[] {
  const keys: string[] = [];
  if (period === "monthly") {
    const [fromY, fromM] = fromKey.split("-").map(Number);
    const [toY, toM] = toKey.split("-").map(Number);
    let y = fromY;
    let m = fromM;
    while (y < toY || (y === toY && m <= toM)) {
      keys.push(`${y}-${pad(m)}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return keys;
  }

  const [fromY, fromM, fromD] = fromKey.split("-").map(Number);
  const [toY, toM, toD] = toKey.split("-").map(Number);
  let { year, month, day } = { year: fromY, month: fromM, day: fromD };
  const end = new Date(toY, toM - 1, toD).getTime();
  const step = period === "weekly" ? 7 : 1;

  while (new Date(year, month - 1, day).getTime() <= end) {
    const key = toDateKey(year, month, day);
    if (!keys.includes(key)) keys.push(key);
    ({ year, month, day } = addDays(year, month, day, step));
  }
  return keys;
}

export function buildSalesReport(
  orders: PaidOrder[],
  period: SalesPeriod,
  timeZone: string,
): SalesReport {
  const { fromKey, toKey } = rangeForPeriod(period, timeZone);
  const bucketKeys = enumerateBucketKeys(fromKey, toKey, period);
  const buckets = new Map<string, { revenueCents: number; orderCount: number }>();

  for (const key of bucketKeys) {
    buckets.set(key, { revenueCents: 0, orderCount: 0 });
  }

  for (const order of orders) {
    if (!order.paid_at) continue;
    const key = bucketKeyForDate(new Date(order.paid_at), period, timeZone);
    if (!buckets.has(key)) continue;
    const bucket = buckets.get(key)!;
    bucket.revenueCents += order.total_cents;
    bucket.orderCount += 1;
  }

  const series: SalesReportBucket[] = bucketKeys.map((key) => {
    const bucket = buckets.get(key)!;
    return {
      periodStart: period === "monthly" ? `${key}-01` : key,
      label: labelForBucket(key, period),
      revenueCents: bucket.revenueCents,
      orderCount: bucket.orderCount,
    };
  });

  const revenueCents = series.reduce((sum, row) => sum + row.revenueCents, 0);
  const orderCount = series.reduce((sum, row) => sum + row.orderCount, 0);

  return {
    period,
    from: period === "monthly" ? `${fromKey}-01` : fromKey,
    to: toKey,
    summary: {
      revenueCents,
      orderCount,
      avgOrderCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
    },
    series,
  };
}

export function queryFromForPeriod(period: SalesPeriod, timeZone: string): string {
  const { fromKey } = rangeForPeriod(period, timeZone);
  if (period === "monthly") return `${fromKey}-01T00:00:00.000Z`;
  return `${fromKey}T00:00:00.000Z`;
}
