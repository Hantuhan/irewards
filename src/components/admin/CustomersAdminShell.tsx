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

type FeedbackItem = {
  id: string;
  rating: number;
  note: string | null;
  createdAt: string;
  memberName: string | null;
  phone: string | null;
  needsFollowUp: boolean;
};

export function CustomersAdminShell({ merchantSlug }: CustomersAdminShellProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/merchant/${merchantSlug}/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`;
      const data = await merchantApi<{ members: Member[]; feedback?: FeedbackItem[] }>(url);
      setMembers(data.members);
      setFeedback(data.feedback ?? []);
    } finally {
      setLoading(false);
    }
  }, [merchantSlug, query]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const followUps = feedback.filter((f) => f.needsFollowUp);

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

      {followUps.length > 0 && (
        <section className="mb-6 border border-surface-container-highest bg-surface-container-low p-4">
          <h2 className="font-display text-headline-sm text-primary">Needs follow-up</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Private WhatsApp ratings (1–4). Call or message these guests soon.
          </p>
          <ul className="mt-3 space-y-2">
            {followUps.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body-md">
                <span className="font-display text-headline-sm">{item.memberName ?? "Member"}</span>
                <span className="font-mono text-label-mono text-on-surface-variant">{item.phone ?? "—"}</span>
                <span className="border border-surface-container-highest px-2 py-0.5 font-display text-eyebrow uppercase">
                  Rating {item.rating}
                </span>
                <span className="text-on-surface-variant">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
