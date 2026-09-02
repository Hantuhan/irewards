"use client";

import { Icon } from "@/components/ui/Icon";
import type { ComplianceIssue, ComplianceReport } from "@/lib/whatsapp/meta-compliance";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant";

function IssueRow({ issue }: { issue: ComplianceIssue }) {
  const blocking = issue.severity === "block";
  return (
    <li className={`flex items-start gap-2 text-[12px] leading-snug ${blocking ? "text-red-800" : "text-amber-800"}`}>
      <Icon name={blocking ? "block" : "warning"} className="mt-px shrink-0 text-[14px]" />
      <span>
        {issue.message}
        {issue.hint && <span className="block text-[11px] opacity-80">{issue.hint}</span>}
      </span>
    </li>
  );
}

/**
 * The Meta linter's verdict, in merchant words. Blockers stop submission;
 * warnings are the usual reasons a review drags or quality ratings drop.
 */
export function MetaReadinessChecklist({
  report,
  title = "Meta readiness",
  compact = false,
  variant = "default",
}: {
  report: ComplianceReport | null | undefined;
  title?: string;
  compact?: boolean;
  variant?: "default" | "panel";
}) {
  if (!report) return null;
  const { blockers, warnings } = report;
  const clean = blockers.length === 0 && warnings.length === 0;

  const pill =
    blockers.length > 0
      ? { text: `${blockers.length} to fix`, className: "border-red-300 bg-red-50 text-red-800" }
      : warnings.length > 0
        ? { text: `${warnings.length} tip${warnings.length === 1 ? "" : "s"}`, className: "border-amber-300 bg-amber-50 text-amber-800" }
        : { text: "Ready to submit", className: "border-emerald-300 bg-emerald-50 text-emerald-800" };

  const shellClass =
    variant === "panel"
      ? clean
        ? "rounded-lg border border-emerald-200 bg-emerald-50/60 p-4"
        : blockers.length > 0
          ? "rounded-lg border border-red-200 bg-red-50/50 p-4"
          : "rounded-lg border border-amber-200 bg-amber-50/50 p-4"
      : compact
        ? ""
        : "rounded-md border border-outline-variant/70 bg-white p-3";

  return (
    <section aria-label={title} className={shellClass}>
      <div className="flex items-center justify-between gap-2">
        <p className={labelClass}>{title}</p>
        <span className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${pill.className}`}>
          {pill.text}
        </span>
      </div>
      {clean ? (
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-snug text-emerald-900">
          <Icon name="verified" className="mt-0.5 shrink-0 text-[18px] text-emerald-700" />
          Passes Meta&apos;s template checks — nothing here should slow the review down.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {blockers.map((issue) => (
            <IssueRow key={`${issue.code}-${issue.message}`} issue={issue} />
          ))}
          {warnings.map((issue) => (
            <IssueRow key={`${issue.code}-${issue.message}`} issue={issue} />
          ))}
        </ul>
      )}
    </section>
  );
}
