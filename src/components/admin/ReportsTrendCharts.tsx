"use client";

import type { TrendChartsData } from "@/lib/reports/trend-charts";

type ReportsTrendChartsProps = {
  data: TrendChartsData;
  symbol: string;
  compareLabel?: string;
};

function money(symbol: string, cents: number) {
  return `${symbol} ${(cents / 100).toFixed(2)}`;
}

function pctText(value: number | null) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span className={positive ? "text-emerald-700" : "text-red-700"}>
      {positive ? "+" : ""}
      {value}% vs today
    </span>
  );
}

const CHART_HEIGHT = 192;
const PADDING = { top: 12, right: 8, bottom: 28, left: 44 };

export function ReportsTrendCharts({
  data,
  symbol,
  compareLabel = "Previous period",
}: ReportsTrendChartsProps) {
  const { seriesWithCompare, todayBenchmarks } = data;
  const maxTrend = Math.max(
    1,
    ...seriesWithCompare.flatMap((p) => [p.revenueCents, p.compareRevenueCents]),
  );
  const maxToday = Math.max(1, ...todayBenchmarks.map((b) => b.revenueCents));

  const plotWidth = Math.max(320, seriesWithCompare.length * 28);
  const innerW = plotWidth - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const barGap = 2;
  const barWidth = Math.max(4, innerW / seriesWithCompare.length - barGap);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    value: Math.round(maxTrend * f),
    y: PADDING.top + innerH * (1 - f),
  }));

  const linePoints = seriesWithCompare
    .map((point, i) => {
      const x = PADDING.left + i * (barWidth + barGap) + barWidth / 2;
      const y = PADDING.top + innerH * (1 - point.compareRevenueCents / maxTrend);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-headline-sm text-primary">Today vs benchmarks</h2>
          <p className="text-body-md text-on-surface-variant">How today compares to recent baselines</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {todayBenchmarks.map((bar) => {
            const heightPct = Math.max(6, (bar.revenueCents / maxToday) * 100);
            const isToday = bar.id === "today";
            return (
              <div
                key={bar.id}
                className={`border p-4 ${
                  isToday
                    ? "border-primary bg-primary text-on-primary"
                    : "border-surface-container-highest bg-surface-container-lowest"
                }`}
              >
                <p className="font-mono text-[10px] uppercase text-on-surface-variant">{bar.label}</p>
                <p className="mt-1 font-display text-headline-sm text-primary">
                  {money(symbol, bar.revenueCents)}
                </p>
                {bar.vsTodayPct !== null && (
                  <p className="mt-1 text-[11px]">{pctText(bar.vsTodayPct)}</p>
                )}
                <div className="mt-3 h-16">
                  <div className="flex h-full items-end">
                    <div
                      className={`w-full ${isToday ? "bg-primary" : "bg-primary/35"}`}
                      style={{ height: `${heightPct}%` }}
                      title={money(symbol, bar.revenueCents)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border border-surface-container-highest bg-surface-container-lowest p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-headline-sm text-primary">Revenue trend</h2>
          <div className="flex flex-wrap gap-4 text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 bg-primary" />
              Current period
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-5 bg-amber-600" />
              {compareLabel}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg
            width={plotWidth}
            height={CHART_HEIGHT}
            className="min-w-full"
            role="img"
            aria-label="Revenue trend with comparison line"
          >
            {yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={PADDING.left}
                  y1={tick.y}
                  x2={plotWidth - PADDING.right}
                  y2={tick.y}
                  stroke="currentColor"
                  strokeOpacity={0.08}
                />
                <text
                  x={PADDING.left - 6}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-on-surface-variant text-[9px]"
                >
                  {(tick.value / 100).toFixed(0)}
                </text>
              </g>
            ))}

            {seriesWithCompare.map((point, i) => {
              const x = PADDING.left + i * (barWidth + barGap);
              const barH = Math.max(2, (point.revenueCents / maxTrend) * innerH);
              const y = PADDING.top + innerH - barH;
              return (
                <g key={point.periodStart}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    className="fill-primary"
                  >
                    <title>
                      {point.label}: {money(symbol, point.revenueCents)}
                    </title>
                  </rect>
                  <text
                    x={x + barWidth / 2}
                    y={CHART_HEIGHT - 6}
                    textAnchor="end"
                    transform={`rotate(-90 ${x + barWidth / 2} ${CHART_HEIGHT - 6})`}
                    className="fill-on-surface-variant text-[8px]"
                  >
                    {point.label}
                  </text>
                </g>
              );
            })}

            <polyline
              points={linePoints}
              fill="none"
              stroke="#d97706"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {seriesWithCompare.map((point, i) => {
              const x = PADDING.left + i * (barWidth + barGap) + barWidth / 2;
              const y = PADDING.top + innerH * (1 - point.compareRevenueCents / maxTrend);
              return (
                <circle key={`cmp-${point.periodStart}`} cx={x} cy={y} r={2.5} fill="#d97706">
                  <title>
                    {compareLabel}: {money(symbol, point.compareRevenueCents)}
                  </title>
                </circle>
              );
            })}
          </svg>
        </div>
      </section>
    </div>
  );
}
