"use client";

import { Icon } from "@/components/ui/Icon";
import {
  isTemplateSendable,
  templateMatchesMessage,
  type CampaignTemplateSummary,
} from "@/lib/whatsapp/template-spec";

type WhatsAppApprovalPanelProps = {
  campaignId: string | null;
  template: CampaignTemplateSummary | null | undefined;
  messageBody: string;
  busy?: boolean;
  blockers?: string[];
  onSubmit?: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type PanelState =
  | "no_campaign"
  | "blockers"
  | "not_submitted"
  | "pending"
  | "approved"
  | "changed"
  | "rejected"
  | "other";

function resolveState(
  campaignId: string | null,
  template: CampaignTemplateSummary | null | undefined,
  messageBody: string,
  blockers: string[],
): PanelState {
  if (!campaignId) return "no_campaign";
  if (blockers.length > 0) return "blockers";
  if (!template || template.status === "draft") return "not_submitted";

  const drifted = !templateMatchesMessage(template.bodyText, messageBody);

  if (drifted && (template.status === "approved" || template.status === "pending")) {
    return "changed";
  }
  if (template.status === "pending") return "pending";
  if (template.status === "approved" && isTemplateSendable(template)) return "approved";
  if (template.status === "rejected" || template.status === "failed") return "rejected";
  return "other";
}

/**
 * One-line Meta status for the workflow builder sidebar.
 * Plain language only — no template IDs or dev jargon.
 */
export function WhatsAppApprovalPanel({
  campaignId,
  template,
  messageBody,
  busy = false,
  blockers = [],
  onSubmit,
  onRefresh,
}: WhatsAppApprovalPanelProps) {
  const state = resolveState(campaignId, template, messageBody, blockers);

  const canSubmit =
    !!onSubmit &&
    messageBody.trim().length > 0 &&
    (state === "not_submitted" || state === "changed" || state === "rejected" || state === "other");

  return (
    <section aria-label="WhatsApp Meta status" className="rounded-lg border border-surface-container-highest bg-white p-4">
      {state === "no_campaign" && (
        <>
          <StatusRow icon="info" tone="neutral" title="Save first" detail="Create the campaign, then submit the message to Meta." />
        </>
      )}

      {state === "blockers" && (
        <>
          <StatusRow
            icon="block"
            tone="bad"
            title="Fix message before submitting"
            detail="Meta will reject this copy as-is."
          />
          <ul className="mt-2 space-y-1 text-[12px] leading-snug text-red-800">
            {blockers.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-600" />
                {item}
              </li>
            ))}
          </ul>
        </>
      )}

      {state === "not_submitted" && (
        <>
          <StatusRow
            icon="send"
            tone="neutral"
            title="Not sent to Meta yet"
            detail="WhatsApp broadcasts need Meta to approve your message first. This usually takes up to 48 hours."
          />
          <ActionButton
            label="Submit to Meta"
            icon="send"
            primary
            busy={busy}
            disabled={!canSubmit}
            onClick={() => onSubmit?.()}
          />
        </>
      )}

      {state === "pending" && (
        <>
          <StatusRow
            icon="hourglass_top"
            tone="pending"
            title="Waiting for Meta"
            detail={`Submitted ${formatWhen(template?.submittedAt ?? null)}. We'll update automatically — usually within a few hours.`}
          />
          <p className="mt-3 text-[12px] leading-snug text-on-surface-variant">
            You can&apos;t go live until Meta approves. No action needed right now.
          </p>
          {onRefresh && (
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={busy}
              className="mt-3 text-[12px] font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
            >
              Check status now
            </button>
          )}
        </>
      )}

      {state === "approved" && (
        <StatusRow
          icon="verified"
          tone="good"
          title="Meta approved — can run"
          detail="This message is approved. Activate the campaign when you're ready."
        />
      )}

      {state === "changed" && (
        <>
          <StatusRow
            icon="edit_note"
            tone="pending"
            title="Message changed"
            detail="You edited the copy after submitting. Submit the new version to Meta."
          />
          <ActionButton
            label="Submit updated message"
            icon="send"
            primary
            busy={busy}
            disabled={!canSubmit}
            onClick={() => onSubmit?.()}
          />
        </>
      )}

      {state === "rejected" && (
        <>
          <StatusRow
            icon="gpp_bad"
            tone="bad"
            title="Meta declined this message"
            detail={template?.rejectionReason ?? "Edit the copy and submit again."}
          />
          <ActionButton
            label="Submit again"
            icon="send"
            primary
            busy={busy}
            disabled={!canSubmit}
            onClick={() => onSubmit?.()}
          />
        </>
      )}

      {state === "other" && (
        <>
          <StatusRow
            icon="warning"
            tone="bad"
            title="Template unavailable"
            detail="Meta paused or disabled this template. Edit the message and submit a new version."
          />
          <ActionButton
            label="Submit new version"
            icon="send"
            primary
            busy={busy}
            disabled={!canSubmit}
            onClick={() => onSubmit?.()}
          />
        </>
      )}
    </section>
  );
}

function StatusRow({
  icon,
  tone,
  title,
  detail,
}: {
  icon: string;
  tone: "neutral" | "pending" | "good" | "bad";
  title: string;
  detail: string;
}) {
  const toneClass = {
    neutral: "text-on-surface",
    pending: "text-amber-950",
    good: "text-emerald-950",
    bad: "text-red-950",
  }[tone];

  const iconClass = {
    neutral: "text-on-surface-variant",
    pending: "text-amber-700",
    good: "text-emerald-700",
    bad: "text-red-700",
  }[tone];

  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} className={`mt-0.5 shrink-0 text-[22px] ${iconClass}`} />
      <div>
        <p className={`text-[14px] font-semibold leading-snug ${toneClass}`}>{title}</p>
        <p className="mt-1 text-[12px] leading-snug text-on-surface-variant">{detail}</p>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  primary,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  icon: string;
  primary?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md px-4 text-[13px] font-medium disabled:opacity-40 ${
        primary
          ? "bg-[#1a3d2e] text-white hover:opacity-90"
          : "border border-surface-container-highest bg-white hover:bg-surface-container-low"
      }`}
    >
      <Icon name={icon} className="text-base" />
      {busy ? "Working…" : label}
    </button>
  );
}
