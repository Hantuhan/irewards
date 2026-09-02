"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";
import { exportSalesReport } from "@/lib/reports/export";
import type { SalesPeriod } from "@/lib/merchant/sales-report";
import type { CompareReport } from "@/lib/reports/compare";
import type { IntelligenceReport } from "@/lib/reports/intelligence";
import { ReportsIntelligentPanel } from "@/components/admin/ReportsIntelligentPanel";

type ReportsAdminShellProps = { merchantSlug: string };

type ReportTab = "overview" | "compare" | "intelligent" | "export";

type SalesReportResponse = {
  currency: string;
  period: SalesPeriod;
  from: string;
  to: string;
  summary: {
    revenueCents: number;
    orderCount: number;
    avgOrderCents: number;
  };
  series: {
    periodStart: string;
    label: string;
    revenueCents: number;
    orderCount: number;
  }[];
};

const TABS: { id: ReportTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "bar_chart" },
  { id: "compare", label: "Compare", icon: "compare_arrows" },
  { id: "intelligent", label: "Intelligent", icon: "psychology" },
  { id: "export", label: "Export", icon: "download" },
];

const PERIODS: { id: SalesPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

function money(symbol: string, cents: number) {
  return `${symbol} ${(cents / 100).toFixed(2)}`;
}

function pctBadge(value: number) {
  const positive = value >= 0;
  return (
    <span className={positive ? "text-emerald-700" : "text-red-700"}>
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

export function ReportsAdminShell({ merchantSlug }: ReportsAdminShellProps) {
  const [tab, setTab] = useState<ReportTab>("overview");
  const [period, setPeriod] = useState<SalesPeriod>("daily");
  const [periodDays, setPeriodDays] = useState(7);
  const [merchantName, setMerchantName] = useState(merchantSlug);
  const [overview, setOverview] = useState<SalesReportResponse | null>(null);
  const [compare, setCompare] = useState<(CompareReport & { currency: string }) | null>(null);
  const [intelligence, setIntelligence] = useState<(IntelligenceReport & { currency: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingTargets, setSyncingTargets] = useState(false);
  const [targetsSynced, setTargetsSynced] = useState(false);

  const loadOverview = useCallback(async () => {
    const data = await merchantApi<SalesReportResponse>(
      `/api/merchant/${merchantSlug}/reports?period=${period}`,
    );
    return data;
  }, [merchantSlug, period]);

  useEffect(() => {
    merchantApi<{ name: string }>(`/api/merchant/${merchantSlug}/settings`)
      .then((s) => setMerchantName(s.name || merchantSlug))
      .catch(() => undefined);
  }, [merchantSlug]);

  const loadCompare = useCallback(async () => {
    return merchantApi<CompareReport & { currency: string; periodDays: number }>(
      `/api/merchant/${merchantSlug}/reports/compare?periodDays=${periodDays}`,
    );
  }, [merchantSlug, periodDays]);

  const loadIntelligence = useCallback(async () => {
    return merchantApi<IntelligenceReport & { currency: string }>(
      `/api/merchant/${merchantSlug}/reports/intelligence`,
    );
  }, [merchantSlug]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "overview" || tab === "export") {
        setOverview(await loadOverview());
      }
      if (tab === "compare") {
        setCompare(await loadCompare());
      }
      if (tab === "intelligent") {
        setIntelligence(await loadIntelligence());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [tab, loadOverview, loadCompare, loadIntelligence]);

  useEffect(() => {
    load();
  }, [load]);

  async function syncRevenueTargets() {
    setSyncingTargets(true);
    setError(null);
    setTargetsSynced(false);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/reports/sync-targets`, {
        method: "POST",
        body: JSON.stringify({ periodDays }),
      });
      setCompare(await loadCompare());
      setTargetsSynced(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync targets");
    } finally {
      setSyncingTargets(false);
    }
  }

  const currencyCode = overview?.currency ?? compare?.currency ?? intelligence?.currency ?? "MYR";
  const symbol = currencyCode === "SGD" ? "S$" : "RM";
  const currency = currencyCode;
  const maxRevenue = Math.max(1, ...(overview?.series.map((row) => row.revenueCents) ?? [1]));

  return (
    <AdminShell merchantSlug={merchantSlug} active="reports" title="Reports" eyebrow="Sales & insights">
      <p className="mb-6 max-w-3xl text-body-md text-on-surface-variant">
        Sales overview, period benchmarks, campaign intelligence, and exports. Analytics member
        dashboards remain under <strong>Dashboards</strong>.
      </p>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-surface-container-highest">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 px-4 py-2 font-mono text-label-mono uppercase ${
              tab === item.id
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <Icon name={item.icon} className="text-base" />
            {item.label}
          </button>
        ))}
      </div>

      {loading && <p>Loading report…</p>}
      {error && <p className="text-red-700">{error}</p>}

      {!loading && tab === "overview" && overview && (
        <>
          <div className="mb-6 flex flex-wrap gap-1">
            {PERIODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`px-3 py-1.5 font-mono text-label-mono ${
                  period === item.id ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total revenue", value: money(symbol, overview.summary.revenueCents) },
              { label: "Orders", value: String(overview.summary.orderCount) },
              { label: "Avg order value", value: money(symbol, overview.summary.avgOrderCents) },
            ].map((metric) => (
              <div key={metric.label} className="border border-surface-container-highest bg-surface-container-lowest p-6">
                <p className="font-display text-eyebrow uppercase text-on-surface-variant">{metric.label}</p>
                <p className="mt-2 font-display text-headline-md text-primary">{metric.value}</p>
              </div>
            ))}
          </div>

          <section className="mb-8 border border-surface-container-highest bg-surface-container-lowest p-6">
            <h2 className="mb-4 font-display text-headline-sm text-primary">Revenue trend</h2>
            <div className="flex h-48 items-end gap-1 overflow-x-auto pb-2">
              {overview.series.map((row) => (
                <div key={row.periodStart} className="flex min-w-[2rem] flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary"
                    style={{ height: `${Math.max(4, (row.revenueCents / maxRevenue) * 100)}%` }}
                    title={`${row.label}: ${money(symbol, row.revenueCents)}`}
                  />
                  <span className="max-w-full truncate text-center text-[10px] text-on-surface-variant [writing-mode:vertical-rl] rotate-180">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <SalesTable overview={overview} symbol={symbol} />

          <section className="mt-8 border border-surface-container-highest bg-surface-container-lowest p-6">
            <h2 className="font-display text-headline-sm text-primary">Quick export</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {(["csv", "excel", "pdf"] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() =>
                    exportSalesReport(format, overview.series, currency, merchantName, period)
                  }
                  className="flex items-center gap-2 border border-primary px-4 py-2 font-display text-eyebrow uppercase text-primary hover:bg-primary/5"
                >
                  <Icon name="download" />
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {!loading && tab === "compare" && compare && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">Compare window</span>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setPeriodDays(days)}
                className={`px-3 py-1.5 font-mono text-label-mono ${
                  periodDays === days ? "bg-primary text-on-primary" : "bg-surface-container"
                }`}
              >
                {days} days
              </button>
            ))}
          </div>

          <div className="mb-8 grid gap-4 lg:grid-cols-3">
            {[compare.current, compare.previous, compare.yearAgo].filter(Boolean).map((block) => (
              <div key={block!.label} className="border border-surface-container-highest bg-surface-container-lowest p-6">
                <p className="font-display text-eyebrow uppercase text-on-surface-variant">{block!.label}</p>
                <p className="mt-2 font-display text-headline-md text-primary">{money(symbol, block!.revenueCents)}</p>
                <p className="mt-1 text-body-md text-on-surface-variant">{block!.orderCount} orders · avg {money(symbol, block!.avgOrderCents)}</p>
              </div>
            ))}
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-surface-container-highest bg-surface-container-lowest p-6">
              <p className="font-display text-eyebrow uppercase text-on-surface-variant">vs previous period</p>
              <p className="mt-2 text-body-md">Revenue {pctBadge(compare.revenueChangePct)} · Orders {pctBadge(compare.orderChangePct)}</p>
            </div>
            <div className="border border-surface-container-highest bg-surface-container-lowest p-6">
              <p className="font-display text-eyebrow uppercase text-on-surface-variant">{compare.trend.label}</p>
              <p className="mt-2 font-display text-headline-sm text-primary">{money(symbol, compare.trend.avgDailyRevenueCents)}/day</p>
              <p className="text-body-md">{pctBadge(compare.trend.changePct)} vs prior window</p>
            </div>
          </div>

          <section className="mb-8 border border-surface-container-highest bg-surface-container-lowest p-6">
            <h2 className="mb-4 font-display text-headline-sm text-primary">Day-of-week benchmark (90 days)</h2>
            <div className="grid gap-2 sm:grid-cols-7">
              {compare.dayOfWeekBenchmark.map((row) => (
                <div key={row.day} className="border border-surface-container-highest p-3 text-center">
                  <p className="font-mono text-label-mono text-primary">{row.day}</p>
                  <p className="mt-1 text-[11px] text-on-surface-variant">{money(symbol, row.avgRevenueCents)}</p>
                  <p className="text-[10px] text-on-surface-variant">{row.avgOrderCount} orders</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="border border-surface-container-highest bg-surface-container-lowest p-6">
              <h2 className="font-display text-headline-sm text-primary">Your targets</h2>
              <dl className="mt-4 space-y-2 text-body-md">
                <div className="flex justify-between">
                  <dt>Daily target</dt>
                  <dd className="font-mono text-label-mono">
                    {compare.targets.dailyTargetCents ? money(symbol, compare.targets.dailyTargetCents) : "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Weekly target</dt>
                  <dd className="font-mono text-label-mono">
                    {compare.targets.weeklyTargetCents ? money(symbol, compare.targets.weeklyTargetCents) : "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Monthly target</dt>
                  <dd className="font-mono text-label-mono">
                    {compare.targets.monthlyTargetCents ? money(symbol, compare.targets.monthlyTargetCents) : "Not set"}
                  </dd>
                </div>
                {compare.targets.actualVsDailyTargetPct != null && (
                  <div className="flex justify-between">
                    <dt>Actual vs daily target</dt>
                    <dd>{pctBadge(compare.targets.actualVsDailyTargetPct)}</dd>
                  </div>
                )}
              </dl>
              <button
                type="button"
                onClick={syncRevenueTargets}
                disabled={syncingTargets || compare.trend.avgDailyRevenueCents <= 0}
                className="mt-4 flex w-full items-center justify-center gap-2 bg-primary py-3 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
              >
                <Icon name="sync" />
                {syncingTargets ? "Syncing…" : "Set & sync from sales"}
              </button>
              <p className="mt-2 text-center text-body-md text-on-surface-variant">
                Uses avg daily revenue ({money(symbol, compare.trend.avgDailyRevenueCents)}) from the last{" "}
                {periodDays} days and saves to Settings → Store.
              </p>
              {targetsSynced && (
                <p className="mt-2 text-center text-body-md text-emerald-700">
                  Targets synced to store settings.
                </p>
              )}
            </div>
            <div className="border border-dashed border-surface-container-highest bg-surface-container-low p-6">
              <h2 className="font-display text-headline-sm text-primary">{compare.industry.label}</h2>
              <p className="mt-2 text-body-md">
                Industry avg order {money(symbol, compare.industry.avgOrderCents)} · Yours{" "}
                {money(symbol, compare.industry.yourAvgOrderCents)} ({pctBadge(compare.industry.deltaPct)})
              </p>
              <p className="mt-2 text-body-md text-on-surface-variant">{compare.industry.note}</p>
            </div>
          </section>
        </>
      )}

      {!loading && tab === "intelligent" && intelligence && (
        <ReportsIntelligentPanel
          merchantSlug={merchantSlug}
          intelligence={intelligence}
          symbol={symbol}
        />
      )}

      {!loading && tab === "export" && overview && (
        <section className="border border-surface-container-highest bg-surface-container-lowest p-6">
          <h2 className="font-display text-headline-sm text-primary">Export sales data</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Download the current {period} overview ({overview.series.length} rows).
          </p>
          <div className="mt-4 flex flex-wrap gap-1">
            {PERIODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`px-3 py-1.5 font-mono text-label-mono ${
                  period === item.id ? "bg-primary text-on-primary" : "bg-surface-container"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {(["csv", "excel", "pdf"] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() =>
                  exportSalesReport(format, overview.series, currency, merchantName, period)
                }
                className="flex items-center gap-2 border border-primary px-4 py-3 font-display text-eyebrow uppercase text-primary hover:bg-primary/5"
              >
                <Icon name="download" />
                {format.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="mt-4 text-body-md text-on-surface-variant">
            PDF opens a print-ready view — use Save as PDF in your browser.
          </p>
        </section>
      )}
    </AdminShell>
  );
}

function SalesTable({ overview, symbol }: { overview: SalesReportResponse; symbol: string }) {
  return (
    <section className="border border-surface-container-highest bg-surface-container-lowest">
      <div className="border-b border-surface-container-highest px-6 py-4">
        <h2 className="font-display text-headline-sm text-primary">Sales records</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-body-md">
          <thead>
            <tr className="border-b border-surface-container-highest text-on-surface-variant">
              <th className="px-6 py-3 font-display text-eyebrow uppercase">Period</th>
              <th className="px-6 py-3 font-display text-eyebrow uppercase">Orders</th>
              <th className="px-6 py-3 font-display text-eyebrow uppercase">Revenue</th>
              <th className="px-6 py-3 font-display text-eyebrow uppercase">Avg order</th>
            </tr>
          </thead>
          <tbody>
            {[...overview.series].reverse().map((row) => (
              <tr key={row.periodStart} className="border-b border-surface-container-highest">
                <td className="px-6 py-3">{row.label}</td>
                <td className="px-6 py-3 font-mono text-label-mono">{row.orderCount}</td>
                <td className="px-6 py-3 font-mono text-label-mono">{money(symbol, row.revenueCents)}</td>
                <td className="px-6 py-3 font-mono text-label-mono">
                  {row.orderCount > 0 ? money(symbol, Math.round(row.revenueCents / row.orderCount)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

