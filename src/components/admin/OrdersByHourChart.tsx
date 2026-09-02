"use client";

export type HourlyOrderPoint = {
  hour: number;
  count: number;
};

const CHART_HEIGHT = 200;
const PADDING = { top: 16, right: 12, bottom: 36, left: 36 };

function formatHour(hour: number) {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

type OrdersByHourChartProps = {
  points: HourlyOrderPoint[];
  subtitle?: string;
};

export function OrdersByHourChart({ points, subtitle }: OrdersByHourChartProps) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((sum, p) => sum + p.count, 0);
  const peak = points.reduce(
    (best, p) => (p.count > best.count ? p : best),
    points[0] ?? { hour: 0, count: 0 },
  );
  const activeHours = points.filter((p) => p.count > 0).length;

  const plotWidth = Math.max(320, points.length * 28);
  const innerW = plotWidth - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const barGap = 3;
  const barWidth = Math.max(6, innerW / points.length - barGap);

  const yTicks = [0, 0.5, 1].map((f) => ({
    value: Math.round(max * f),
    y: PADDING.top + innerH * (1 - f),
  }));

  return (
    <section className="border border-surface-container-highest bg-surface-container-lowest p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-sm text-primary">Orders by hour</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {subtitle ?? "Today’s order volume across the day"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label="Total" value={String(total)} />
          <StatPill
            label="Peak"
            value={peak.count > 0 ? `${formatHour(peak.hour)} · ${peak.count}` : "—"}
            highlight
          />
          <StatPill label="Active hours" value={String(activeHours)} />
        </div>
      </div>

      {total === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center border border-dashed border-surface-container-highest text-center">
          <p className="font-display text-headline-sm text-primary">No orders yet today</p>
          <p className="mt-1 max-w-xs text-body-md text-on-surface-variant">
            Bars will fill in as diners pay through the table QR menu.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            width={plotWidth}
            height={CHART_HEIGHT}
            className="min-w-full"
            role="img"
            aria-label="Orders by hour bar chart"
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
                  {tick.value}
                </text>
              </g>
            ))}

            {points.map((point, i) => {
              const x = PADDING.left + i * (barWidth + barGap);
              const barH = point.count > 0 ? Math.max(4, (point.count / max) * innerH) : 0;
              const y = PADDING.top + innerH - barH;
              const isPeak = point.hour === peak.hour && point.count > 0;
              return (
                <g key={point.hour}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    className={isPeak ? "fill-primary" : "fill-primary/45"}
                    rx={2}
                  >
                    <title>
                      {formatHour(point.hour)}: {point.count} order{point.count === 1 ? "" : "s"}
                    </title>
                  </rect>
                  {point.count > 0 && barH > 20 && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 4}
                      textAnchor="middle"
                      className="fill-primary text-[9px] font-medium"
                    >
                      {point.count}
                    </text>
                  )}
                  <text
                    x={x + barWidth / 2}
                    y={CHART_HEIGHT - 8}
                    textAnchor="middle"
                    className={`text-[8px] ${isPeak ? "fill-primary font-medium" : "fill-on-surface-variant"}`}
                  >
                    {point.hour % 3 === 0 || isPeak ? formatHour(point.hour) : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border px-3 py-1.5 ${
        highlight
          ? "border-primary bg-primary text-on-primary"
          : "border-surface-container-highest bg-surface-container-lowest"
      }`}
    >
      <p className="font-mono text-[9px] uppercase text-on-surface-variant">{label}</p>
      <p className={`font-mono text-label-mono ${highlight ? "text-primary" : "text-on-surface"}`}>
        {value}
      </p>
    </div>
  );
}
