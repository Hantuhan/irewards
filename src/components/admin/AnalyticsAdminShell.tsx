"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { merchantApi } from "@/lib/merchant/fetch";

type AnalyticsAdminShellProps = { merchantSlug: string };

type Analytics = {
  currency: string;
  revenueTodayCents: number;
  ordersToday: number;
  memberJoins: number;
  repeatRatePct: number;
  tierDistribution: { tier: string; pct: number }[];
  hourly: { hour: number; heightPct: number }[];
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
    <AdminShell merchantSlug={merchantSlug} active="analytics" title="Analytics" eyebrow="Performance">
      {loading && <p>Loading analytics…</p>}
      {data && (
        <>
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
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="border border-surface-container-highest bg-surface-container-lowest p-6">
              <h2 className="mb-4 font-display text-headline-sm text-primary">Orders by hour</h2>
              <div className="flex h-40 items-end gap-2">
                {data.hourly.map((h) => (
                  <div key={h.hour} className="flex-1 bg-primary" style={{ height: `${h.heightPct}%` }} title={`${h.hour}:00`} />
                ))}
              </div>
            </section>
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
