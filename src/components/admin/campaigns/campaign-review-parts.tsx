"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PhoneFrame } from "@/components/ui/PhoneFrame";
import { applyMessagePreview } from "@/lib/campaigns/message-spec";
import {
  PROGRAM_LANGUAGES,
  resolveLocalized,
  type LocalizedMap,
  type ProgramLanguage,
} from "@/lib/i18n/program-locale";
import type { ComplianceReport } from "@/lib/whatsapp/meta-compliance";
import {
  isTemplateSendable,
  type CampaignTemplateSummary,
} from "@/lib/whatsapp/template-spec";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant";

function MetaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2c-2.8 0-5 2.2-5 5 0 1.9 1.1 3.5 2.7 4.3C8.3 12.8 7 14.8 7 17c0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.2-1.3-4.2-2.7-5.7C15.9 10.5 17 8.9 17 7c0-2.8-2.2-5-5-5zm0 2c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm0 10c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3z" />
    </svg>
  );
}

/** Phone-framed WhatsApp preview for the review / confirmation step. */
export function WhatsAppPhonePreview({
  merchantName,
  messageBody,
  headerImageUrl,
  channel = "whatsapp",
  title = "Final WhatsApp preview",
  widthClassName,
  messageBodies,
  previewLanguages,
}: {
  merchantName: string;
  messageBody: string;
  headerImageUrl?: string | null;
  channel?: "whatsapp" | "sms";
  title?: string;
  widthClassName?: string;
  /** Optional EN/ZH/MS template variants for the language switcher. */
  messageBodies?: LocalizedMap | null;
  /** Languages to offer in the switcher (defaults to keys present in messageBodies). */
  previewLanguages?: string[];
}) {
  const availableLangs = useMemo(() => {
    const fromBodies = (["en", "zh", "ms"] as ProgramLanguage[]).filter((c) =>
      Boolean(messageBodies?.[c]?.trim()),
    );
    // Prefer all translated variants when the template ships them.
    if (fromBodies.length > 1) return fromBodies;
    const fromProps = (previewLanguages ?? []).filter(
      (c): c is ProgramLanguage => c === "en" || c === "zh" || c === "ms",
    );
    const list = fromProps.length > 0 ? fromProps : fromBodies;
    return list.length > 0 ? list : (["en"] as ProgramLanguage[]);
  }, [previewLanguages, messageBodies]);

  const showSwitcher = Boolean(messageBodies) && availableLangs.length > 1;
  const [previewLang, setPreviewLang] = useState<ProgramLanguage>(availableLangs[0] ?? "en");

  const activeBody = showSwitcher
    ? resolveLocalized(messageBodies, previewLang, messageBody)
    : messageBody;

  const preview = applyMessagePreview(activeBody, {
    merchant: merchantName,
    name: "Alex",
    code: "SAVE10",
  });
  const isWhatsApp = channel === "whatsapp";
  const showOptOut = isWhatsApp && /stop|opt out|unsubscribe/i.test(activeBody);
  const displayName = merchantName || "iRewards";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={labelClass}>{title}</p>
        {showSwitcher && (
          <div className="flex gap-1" role="tablist" aria-label="Preview language">
            {availableLangs.map((code) => {
              const meta = PROGRAM_LANGUAGES.find((l) => l.code === code);
              return (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={previewLang === code}
                  onClick={() => setPreviewLang(code)}
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    previewLang === code
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {meta?.short ?? code}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-5">
        <PhoneFrame widthClassName={widthClassName ?? "w-[240px]"}>
          <div className={isWhatsApp ? "bg-[#e5ddd5]" : "bg-surface-container-low"}>
            <div
              className={`flex items-center gap-2 px-2 py-2 text-white ${
                isWhatsApp ? "bg-[#075e54]" : "bg-on-surface"
              }`}
            >
              <Icon name="arrow_back" className="text-lg opacity-90" />
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isWhatsApp ? "bg-[#25D366]" : "bg-white/20"
                }`}
              >
                <Icon name="store" className="text-base text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight">{displayName}</p>
                <p className="text-[10px] text-white/75">{isWhatsApp ? "online" : "SMS"}</p>
              </div>
              {isWhatsApp && (
                <div className="flex items-center gap-3 pr-1 opacity-90">
                  <Icon name="videocam" className="text-lg" />
                  <Icon name="call" className="text-[17px]" />
                </div>
              )}
            </div>

            <div
              className="min-h-[280px] bg-[length:360px_360px] px-2.5 py-3"
              style={
                isWhatsApp
                  ? {
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1c8bf' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                    }
                  : undefined
              }
            >
              <div className="max-w-[92%] overflow-hidden rounded-lg rounded-tl-none bg-white shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
                {isWhatsApp && headerImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={headerImageUrl} alt="" className="h-28 w-full object-cover" />
                )}
                <div className="px-2.5 py-2">
                  {isWhatsApp && (
                    <p className="text-[10px] font-semibold text-[#075e54]">{displayName}:</p>
                  )}
                  <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-[1.5] text-[#111b21]">
                    {preview || "Your campaign message will appear here."}
                  </p>
                  <p className="mt-1.5 text-right text-[9px] text-[#667781]">12:04</p>
                </div>
              </div>

              {showOptOut && (
                <p className="mt-3 text-center text-[10px] text-[#667781] underline decoration-[#667781]/40">
                  Opt-out of future messages
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-black/5 bg-[#f0f2f5] px-2 py-2">
              <Icon name="add" className="text-[#54656f]" />
              <div className="flex min-h-[34px] flex-1 items-center rounded-full bg-white px-3 text-[12px] text-[#667781] shadow-sm">
                Message
              </div>
              <Icon name="mic" className="text-[#54656f]" />
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/** Meta approval status — full-width strip on the review step. */
export function MetaValidationBanner({
  template,
  channel,
  compliance,
}: {
  template?: CampaignTemplateSummary | null;
  channel: string;
  compliance?: ComplianceReport | null;
}) {
  if (channel !== "whatsapp") return null;

  const approved = isTemplateSendable(template);

  if (approved) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <Icon name="verified" className="text-[22px] text-emerald-700" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-emerald-950">Meta approved — can run</p>
          <p className="mt-1 text-[13px] leading-snug text-emerald-800/90">
            This template is live on Meta. Activate the campaign to send to opted-in members.
          </p>
        </div>
      </div>
    );
  }

  if (template?.status === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Icon name="hourglass_top" className="text-[22px] text-amber-800" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-amber-950">Awaiting Meta review</p>
          <p className="mt-1 text-[13px] leading-snug text-amber-900/90">
            Your template is with Meta now. Review usually takes minutes to 48 hours — status updates
            automatically.
          </p>
        </div>
      </div>
    );
  }

  if (template?.status === "rejected" || template?.status === "failed") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
        <Icon name="gpp_bad" className="mt-1 shrink-0 text-[22px] text-red-700" />
        <div>
          <p className="text-[14px] font-semibold text-red-950">Meta declined this template</p>
          <p className="mt-1 text-[13px] leading-snug text-red-800/90">
            {template.rejectionReason ?? "Edit the message in the workflow builder and submit again."}
          </p>
        </div>
      </div>
    );
  }

  const hasBlockers = (compliance?.blockers.length ?? 0) > 0;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-5 py-4 ${
        hasBlockers
          ? "border-red-200 bg-red-50/80"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          hasBlockers ? "bg-red-100" : "bg-amber-100"
        }`}
      >
        {hasBlockers ? (
          <Icon name="block" className="text-[22px] text-red-700" />
        ) : (
          <MetaMark className="h-5 w-5 text-[#0081fb]" />
        )}
      </div>
      <div>
        <p className={`text-[14px] font-semibold ${hasBlockers ? "text-red-950" : "text-amber-950"}`}>
          {hasBlockers ? "Fix blockers before submitting to Meta" : "Meta will validate your campaign"}
        </p>
        <p className={`mt-1 text-[13px] leading-snug ${hasBlockers ? "text-red-800/90" : "text-amber-900/90"}`}>
          {hasBlockers
            ? "Resolve the items in Meta readiness above, then use Create & submit to Meta."
            : "After you create the campaign, we submit the message to Meta for review. Approval can take up to 48 hours."}
        </p>
      </div>
    </div>
  );
}
