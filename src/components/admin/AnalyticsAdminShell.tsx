"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrdersByHourChart } from "@/components/admin/OrdersByHourChart";
import { merchantApi } from "@/lib/merchant/fetch";

type AnalyticsAdminShellProps = { merchantSlug: string };

type MemberSegment = {
  key: string;
  label: string;
  count: number;
  pct: number;
  detail: string;
  color: string;
};

type Analytics = {
  currency: string;
  revenueTodayCents: number;
  ordersToday: number;
  memberJoins: number;
  repeatRatePct: number;
  tierDistribution: { tier: string; pct: number }[];
  hourly: { hour: number; count: number; heightPct: number }[];
  memberInsights?: {
    totalMembers: number;
    segments: MemberSegment[];
  };
};

export function AnalyticsAdminShell({ merchantSlug }: AnalyticsAdminShellProps) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    merchantApi<Analytics>(`/api/merchant/${merchantSlug}/analytics`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [merchantSlug]);

  const symbol = data?.currency === "SGD" ? "S$" : "RM";

  return (
    <AdminShell merchantSlug={merchantSlug} active="analytics" title="Dashboards" eyebrow="Insights">
      {loading && <p>Loading analytics…</p>}
      {data && (
        <>
          <p className="mb-6 text-body-md text-on-surface-variant">
            Insights and reports for {data.memberInsights?.totalMembers ?? data.memberJoins} members
          </p>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Revenue today", value: `${symbol} ${(data.revenueTodayCents / 100).toFixed(2)}` },
              { label: "Orders today", value: String(data.ordersToday) },
              { label: "iRewards members", value: String(data.memberJoins) },
              { label: "Repeat rate", value: `${data.repeatRatePct}%` },
            ].map((metric) => (
              <div key={metric.label} className="border border-surface-container-highest bg-surface-container-lowest p-6">
                <p className="font-display text-eyebrow uppercase text-on-surface-variant">{metric.label}</p>
                <p className="mt-2 font-display text-headline-md text-primary">{metric.value}</p>
              </div>
            ))}
          </div>

          {data.memberInsights && data.memberInsights.segments.length > 0 && (
            <section className="mb-8 border border-surface-container-highest bg-surface-container-lowest p-6">
              <h2 className="mb-4 font-display text-headline-sm text-primary">Member insights</h2>
              <div className="mb-6 flex h-4 w-full overflow-hidden rounded-full">
                {data.memberInsights.segments.map((s) =>
                  s.pct > 0 ? (
                    <div
                      key={s.key}
                      style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                      title={`${s.label} ${s.pct}%`}
                    />
                  ) : null,
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {data.memberInsights.segments.map((s) => (
                  <div key={s.key} className="border border-surface-container p-4">
                    <p className="font-display text-eyebrow uppercase" style={{ color: s.color }}>
                      {s.label}
                    </p>
                    <p className="mt-1 font-display text-headline-md text-primary">{s.count}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
                      {s.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <OrdersByHourChart
              points={data.hourly.map((h) => ({ hour: h.hour, count: h.count }))}
            />
            <section className="border border-surface-container-highest bg-surface-container-lowest p-6">
              <h2 className="mb-4 font-display text-headline-sm text-primary">Tier distribution</h2>
              <ul className="space-y-3">
                {data.tierDistribution.map((row) => (
                  <li key={row.tier}>
                    <div className="mb-1 flex justify-between text-body-md">
                      <span>{row.tier}</span>
                      <span className="font-mono text-label-mono">{row.pct}%</span>
                    </div>
                    <div className="h-2 bg-surface-container">
                      <div className="h-full bg-primary" style={{ width: `${row.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </AdminShell>
  );
}
