"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { merchantApi } from "@/lib/merchant/fetch";

type CustomersAdminShellProps = { merchantSlug: string };

type Member = {
  id: string;
  name: string;
  phone: string | null;
  tier: string;
  points: number;
  lastVisit: string | null;
};

export function CustomersAdminShell({ merchantSlug }: CustomersAdminShellProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/merchant/${merchantSlug}/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`;
      const data = await merchantApi<{ members: Member[] }>(url);
      setMembers(data.members);
    } finally {
      setLoading(false);
    }
  }, [merchantSlug, query]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="customers"
      title="Member database"
      eyebrow="Retention"
      headerAction={
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members…"
          className="border border-surface-container-highest px-3 py-2"
        />
      }
    >
      {loading && <p>Loading members…</p>}
      <div className="overflow-x-auto border border-surface-container-highest bg-surface-container-lowest">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-surface-container-highest bg-surface-container-low">
              {["Member", "Phone", "Tier", "Points", "Last visit"].map((col) => (
                <th key={col} className="px-4 py-3 font-display text-eyebrow uppercase text-on-surface-variant">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-surface-container">
                <td className="px-4 py-3 font-display text-headline-sm text-primary">{member.name}</td>
                <td className="px-4 py-3 font-mono text-label-mono text-on-surface-variant">
                  {member.phone ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="border border-surface-container-highest bg-surface-container px-2 py-1 font-display text-eyebrow uppercase">
                    {member.tier}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-label-mono">{member.points}</td>
                <td className="px-4 py-3 text-body-md text-on-surface-variant">
                  {member.lastVisit
                    ? new Date(member.lastVisit).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
