"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { EnrollNewMemberView } from "@/components/admin/EnrollNewMemberView";
import { MemberDetailView } from "@/components/admin/MemberDetailView";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";
import { manusHeaderPrimaryBtnClass } from "@/lib/ui/manus";

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
  const [showEnroll, setShowEnroll] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

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

  if (showEnroll) {
    return (
      <AdminShell
        merchantSlug={merchantSlug}
        active="customers"
        title="Enroll New Member"
        eyebrow="Retention · Members"
        hideHeader
      >
        <EnrollNewMemberView
          merchantSlug={merchantSlug}
          onCancel={() => setShowEnroll(false)}
          onEnrolled={(memberId) => {
            setShowEnroll(false);
            setSelectedMemberId(memberId);
            void load();
          }}
        />
      </AdminShell>
    );
  }

  if (selectedMemberId) {
    return (
      <AdminShell
        merchantSlug={merchantSlug}
        active="customers"
        title="Member detail"
        eyebrow="Retention"
      >
        <MemberDetailView
          merchantSlug={merchantSlug}
          memberId={selectedMemberId}
          onBack={() => {
            setSelectedMemberId(null);
            void load();
          }}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="customers"
      title="Member overview"
      eyebrow="Retention"
      headerAction={
        <div className="flex flex-nowrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            className="h-10 border border-surface-container-highest px-3 text-body-md"
          />
          <button
            type="button"
            onClick={() => setShowEnroll(true)}
            className={manusHeaderPrimaryBtnClass}
          >
            <Icon name="add" className="text-base" />
            Add member
          </button>
        </div>
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
              <tr
                key={member.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMemberId(member.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedMemberId(member.id);
                  }
                }}
                className="cursor-pointer border-b border-surface-container transition-colors hover:bg-surface-container-low"
              >
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
            {!loading && members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-body-md text-on-surface-variant">
                  No members found{query ? ` for “${query}”` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
