"use client";

import { useEffect, useMemo, useState } from "react";
import type { Campaign } from "@/components/admin/campaigns/types";
import { Icon } from "@/components/ui/Icon";
import { campaignStatusLabel } from "@/lib/campaigns/status-styles";
import { isTemplateSendable, TEMPLATE_STATUS_LABEL } from "@/lib/whatsapp/template-spec";
import {
  computeCampaignDetailAnalytics,
  type CampaignDetailAnalytics,
  formatCampaignMoney,
  formatPct,
} from "@/lib/campaigns/campaign-analytics";
import { merchantApi } from "@/lib/merchant/fetch";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant";

type CampaignDetailReportProps = {
  campaign: Campaign;
  merchantSlug: string;
  currency?: "MYR" | "SGD";
  onBack: () => void;
  onEdit: () => void;
  onToggleLive: () => void;
  toggling?: boolean;
  /** Present for manual WhatsApp broadcasts only. */
  onSendBroadcast?: () => void;
  sending?: boolean;
};

const FUNNEL_STEPS = [
  { key: "sent" as const, label: "Sent", icon: "send" },
  { key: "opened" as const, label: "Delivered", icon: "done_all" },
  { key: "claimed" as const, label: "Claimed", icon: "confirmation_number" },
  { key: "redeemed" as const, label: "Redeemed", icon: "storefront" },
];

export function CampaignDetailReport({
  campaign,
  merchantSlug,
  currency = "MYR",
  onBack,
  onEdit,
  onToggleLive,
  toggling = false,
  onSendBroadcast,
  sending = false,
}: CampaignDetailReportProps) {
  const fallback = useMemo(
    () => computeCampaignDetailAnalytics(campaign, currency),
    [campaign, currency],
  );
  const [analytics, setAnalytics] = useState<CampaignDetailAnalytics>(fallback);

  useEffect(() => {
    setAnalytics(fallback);
    let cancelled = false;
    merchantApi<{ analytics: CampaignDetailAnalytics }>(
      `/api/merchant/${merchantSlug}/campaigns/${campaign.id}/analytics`,
    )
      .then((data) => {
        if (!cancelled) setAnalytics(data.analytics);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [campaign.id, merchantSlug, fallback]);

  const isLive = campaign.status === "active";
  const needsApproval = campaign.channel === "whatsapp";
  const approval = campaign.whatsappTemplate ?? null;
  const approvalReady = !needsApproval || isTemplateSendable(approval);
  const approvalLabel = !approval
    ? "Not submitted to Meta"
    : approval.status === "approved" && !approval.matchesCurrentMessage
      ? "Approved copy is out of date"
      : TEMPLATE_STATUS_LABEL[approval.status];
  const maxDaily = Math.max(...analytics.dailyRedemptions.map((d) => d.value), 1);

  const funnelValues = {
    sent: analytics.funnel.sent,
    opened: analytics.funnel.opened,
    claimed: analytics.funnel.claimed,
    redeemed: analytics.funnel.redeemed,
  };

  const funnelPcts = {
    sent: 1,
    opened: analytics.funnel.openedPct,
    claimed: analytics.funnel.claimedPct,
    redeemed: analytics.funnel.redeemedPct,
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-body-md text-on-surface-variant hover:text-primary hover:underline"
      >
        ← Campaign overview
      </button>

      {campaign.statusReason && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800"
        >
          <Icon name="report" className="mt-0.5 text-lg" />
          <div>
            <p className="font-medium">This campaign was paused automatically.</p>
            <p className="mt-0.5 text-[12px] opacity-90">{campaign.statusReason}</p>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 border-b border-surface-container-highest pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={labelClass}>Campaign performance</p>
          <h2 className="mt-1 font-display text-headline-md text-primary">{campaign.name}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant">
            <span
              className={`inline-flex items-center gap-1.5 ${isLive ? "text-emerald-700" : ""}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-600" : "bg-outline-variant"}`}
              />
              {campaignStatusLabel(campaign.status).toUpperCase()}
            </span>
            {isLive && (
              <>
                <span>·</span>
                <span>Running for {analytics.runningDays} days</span>
              </>
            )}
            <span>·</span>
            <span>{campaign.channelLabel}</span>
            {needsApproval && (
              <>
                <span>·</span>
                <span
                  className={`inline-flex items-center gap-1.5 ${
                    approvalReady
                      ? "text-emerald-700"
                      : approval?.status === "pending"
                        ? "text-amber-700"
                        : "text-red-700"
                  }`}
                  title={approval?.rejectionReason ?? undefined}
                >
                  <Icon
                    name={approvalReady ? "verified" : approval?.status === "pending" ? "hourglass_top" : "gpp_bad"}
                    className="text-base"
                  />
                  {approvalLabel}
                </span>
              </>
            )}
          </p>
          {needsApproval && !approvalReady && !isLive && (
            <p className="mt-2 text-[12px] text-on-surface-variant">
              Meta must approve the WhatsApp template before this campaign can go live. Open{" "}
              <button type="button" onClick={onEdit} className="font-medium text-primary hover:underline">
                Edit campaign
              </button>{" "}
              to submit it.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="h-10 border border-on-surface bg-surface-container-lowest px-5 text-body-md font-medium uppercase tracking-wide hover:bg-surface-container-low"
          >
            Edit campaign
          </button>
          <button
            type="button"
            onClick={onToggleLive}
            disabled={toggling || (!isLive && !approvalReady)}
            title={!isLive && !approvalReady ? "Waiting for Meta template approval" : undefined}
            className={`h-10 px-5 text-body-md font-medium uppercase tracking-wide disabled:opacity-50 ${
              isLive
                ? "border border-on-surface bg-surface-container-lowest hover:bg-surface-container-low"
                : "bg-primary text-on-primary hover:opacity-90"
            }`}
          >
            {toggling ? "…" : isLive ? "Pause" : "Go live"}
          </button>
          {onSendBroadcast && (
            <button
              type="button"
              onClick={onSendBroadcast}
              disabled={sending || toggling || !approvalReady}
              title={
                !approvalReady
                  ? "Waiting for Meta template approval"
                  : "Queue this message to every opted-in member now"
              }
              className="inline-flex h-10 items-center gap-2 bg-[#1a3d2e] px-5 text-body-md font-medium uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="send" className="text-base" />
              {sending ? "Queuing…" : "Send broadcast"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total sent",
            value: analytics.totalSent.toLocaleString(),
            sub: analytics.isLiveData ? "From campaign send events" : "From reach count",
          },
          {
            label: "Claim rate",
            value: formatPct(analytics.claimRate),
            sub: analytics.isLiveData ? "Conversions ÷ sends" : "Awaiting live events",
            accent: true as boolean | undefined,
          },
          {
            label: "Vouchers claimed",
            value: analytics.vouchersClaimed.toLocaleString(),
            sub: "Conversion events",
          },
          {
            label: "Est. revenue",
            value: formatCampaignMoney(analytics.estimatedRoiCents, currency),
            sub:
              analytics.funnel.redeemed > 0
                ? `${analytics.funnel.redeemed} redemptions × avg order`
                : "From redemptions when vouchers are used",
          },
        ].map((card) => (
          <article
            key={card.label}
            className="border border-surface-container-highest bg-surface-container-lowest p-5"
          >
            <p className={labelClass}>{card.label}</p>
            <p
              className={`mt-3 font-display text-[32px] leading-none tracking-tight ${
                card.accent ? "text-emerald-700" : "text-primary"
              }`}
            >
              {card.value}
            </p>
            <p className="mt-2 text-[12px] text-on-surface-variant">{card.sub}</p>
          </article>
        ))}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <section className="border border-surface-container-highest bg-surface-container-lowest p-5 lg:col-span-2">
          <h3 className="font-display text-headline-sm text-primary">Conversion funnel</h3>
          <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-4">
            {FUNNEL_STEPS.map((step, i) => {
              const value = funnelValues[step.key];
              const pct = i === 0 ? null : funnelPcts[step.key];
              const isLast = step.key === "redeemed";
              return (
                <div key={step.key} className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center border ${
                      isLast
                        ? "border-primary bg-primary text-on-primary"
                        : "border-surface-container-highest bg-surface-container-low"
                    }`}
                  >
                    <Icon name={step.icon} className="text-xl" />
                  </div>
                  <p className="mt-3 flex h-4 w-full items-center justify-center font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {step.label}
                  </p>
                  <p className="mt-2 flex h-9 w-full items-center justify-center font-display text-[28px] leading-none tabular-nums text-primary">
                    {value.toLocaleString()}
                  </p>
                  <p
                    className={`mt-1 flex h-[18px] w-full items-start justify-center text-[12px] tabular-nums ${
                      pct != null ? "text-on-surface-variant" : "invisible"
                    }`}
                    aria-hidden={pct == null}
                  >
                    {pct != null ? formatPct(pct) : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border border-surface-container-highest bg-surface-container-lowest p-5">
          <h3 className="font-display text-headline-sm text-primary">Demographics</h3>
          <p className="mt-1 text-[11px] text-on-surface-variant">Member mix (store average)</p>
          <ul className="mt-5 space-y-4">
            {analytics.demographics.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="text-on-surface-variant">{row.label}</span>
                  <span className="font-medium text-primary">{row.pct}%</span>
                </div>
                <div className="h-1.5 bg-surface-container-high">
                  <div className="h-full bg-primary" style={{ width: `${row.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="border border-surface-container-highest bg-surface-container-lowest p-5">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="font-display text-headline-sm text-primary">Daily sends</h3>
          <span className="border border-surface-container-highest px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
            Last 12 days
          </span>
        </div>
        <div className="flex h-40 items-end justify-between gap-1 sm:gap-2">
          {analytics.dailyRedemptions.map((day) => (
            <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className={`w-full max-w-[36px] transition-all ${
                  day.tone === "peak"
                    ? "bg-on-surface"
                    : day.tone === "today"
                      ? "bg-[#1a3d2e]"
                      : "bg-surface-container-high"
                }`}
                style={{ height: `${Math.max(8, (day.value / maxDaily) * 100)}%` }}
                title={`${day.value} sends`}
              />
              <span className="truncate font-mono text-[9px] uppercase text-on-surface-variant">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
