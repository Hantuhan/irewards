"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CAMPAIGN_ACTIVE, campaignStatusBadgeClass, campaignStatusLabel } from "@/lib/campaigns/status-styles";
import { nodeSummary } from "@/lib/campaigns/workflow-spec";
import { isTemplateSendable } from "@/lib/whatsapp/template-spec";
import type { NumberHealthSummary } from "@/lib/whatsapp/number-health";
import type { Campaign } from "@/components/admin/campaigns/types";

type CampaignOverviewViewProps = {
  campaigns: Campaign[];
  currency?: "MYR" | "SGD";
  onCreateNew: () => void;
  onViewDetails: (campaign: Campaign) => void;
  /** Master switch for every triggered campaign; manual broadcasts are unaffected. */
  automationsEnabled: boolean;
  savingSwitch?: boolean;
  onToggleAutomations: (enabled: boolean) => void;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  sendCapHours?: number;
  onSaveSendHygiene?: (patch: {
    campaignSendWindowStart?: string | null;
    campaignSendWindowEnd?: string | null;
    campaignSendCapHours?: number;
  }) => Promise<void>;
  numberHealth?: NumberHealthSummary | null;
};

/** Meta review state for WhatsApp campaigns, in merchant words. */
function metaApproval(campaign: Campaign): { label: string; tone: "ok" | "wait" | "todo" } | null {
  if (campaign.channel !== "whatsapp") return null;
  const t = campaign.whatsappTemplate ?? null;
  if (isTemplateSendable(t)) return { label: "Approved by Meta", tone: "ok" };
  if (!t) return { label: "Needs Meta approval", tone: "todo" };
  if (t.status === "pending") return { label: "Pending Meta review", tone: "wait" };
  if (t.status === "approved") return { label: "Copy changed · resubmit", tone: "todo" };
  if (t.status === "rejected") return { label: "Rejected by Meta", tone: "todo" };
  return { label: "Needs Meta approval", tone: "todo" };
}

/** Plain-English "runs when" for the table. */
function runsWhen(campaign: Campaign): { label: string; automated: boolean } {
  const trigger = campaign.triggerType ?? "manual";
  if (trigger === "manual") return { label: "When you press Send", automated: false };
  if (trigger === "storefront_opened") return { label: "When someone opens the table menu", automated: false };
  return {
    label: campaign.workflow ? nodeSummary(campaign.workflow.trigger) : trigger.replace(/_/g, " "),
    automated: true,
  };
}

/** Status shown in the table and KPIs — respects the automations master switch. */
function effectiveDeploymentStatus(campaign: Campaign, automationsEnabled: boolean): string {
  if (campaign.status === "active" && !automationsEnabled && runsWhen(campaign).automated) {
    return "paused";
  }
  return campaign.status;
}

function isSuspendedByAutomations(campaign: Campaign, automationsEnabled: boolean): boolean {
  return campaign.status === "active" && !automationsEnabled && runsWhen(campaign).automated;
}

function liveCampaignSubtitle(stats: {
  configuredLive: number;
  sendingNow: number;
  suspendedBySwitch: number;
  pendingApproval: number;
  needsApproval: number;
}): string {
  if (stats.configuredLive === 0) return "None live";
  if (stats.suspendedBySwitch > 0) {
    if (stats.sendingNow > 0) {
      return `${stats.sendingNow} of ${stats.configuredLive} sending · resume automations`;
    }
    return `${stats.configuredLive} live · automations paused`;
  }
  if (stats.pendingApproval > 0) {
    return `${stats.pendingApproval} waiting for Meta review`;
  }
  if (stats.needsApproval > 0) {
    return `${stats.needsApproval} need Meta approval`;
  }
  return stats.sendingNow === stats.configuredLive ? "All live campaigns sending" : "Running now";
}

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant";

function parseConversionRate(conversion: string): number {
  if (conversion === "—") return 0;
  const n = parseFloat(conversion.replace("%", ""));
  return Number.isFinite(n) ? n / 100 : 0;
}

function formatMoney(cents: number, currency: "MYR" | "SGD"): string {
  const symbol = currency === "SGD" ? "S$" : "RM";
  if (cents >= 100_000) return `${symbol}${(cents / 100_000).toFixed(1)}k`;
  return `${symbol}${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function shortCampaignId(id: string): string {
  return `C-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

function DeploymentStatusBadge({ status }: { status: string }) {
  const label = campaignStatusLabel(status).toUpperCase();
  const isActive = status === "active";
  const isScheduled = status === "scheduled";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${campaignStatusBadgeClass(status)}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? CAMPAIGN_ACTIVE.dot : isScheduled ? "bg-amber-600" : "bg-on-surface-variant"
        }`}
      />
      {label}
    </span>
  );
}

export function CampaignOverviewView({
  campaigns,
  currency = "MYR",
  onCreateNew,
  onViewDetails,
  automationsEnabled,
  savingSwitch = false,
  onToggleAutomations,
  sendWindowStart = "",
  sendWindowEnd = "",
  sendCapHours = 48,
  onSaveSendHygiene,
  numberHealth = null,
}: CampaignOverviewViewProps) {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "live" | "attention" | "drafts">("all");
  const [windowStartDraft, setWindowStartDraft] = useState(sendWindowStart);
  const [windowEndDraft, setWindowEndDraft] = useState(sendWindowEnd);
  const [capDraft, setCapDraft] = useState(String(sendCapHours));

  // Keep local drafts in sync when settings reload from the server.
  useEffect(() => {
    setWindowStartDraft(sendWindowStart);
    setWindowEndDraft(sendWindowEnd);
    setCapDraft(String(sendCapHours));
  }, [sendWindowStart, sendWindowEnd, sendCapHours]);

  const manual = useMemo(() => campaigns.filter((c) => c.channel !== "auto"), [campaigns]);

  const filtered = useMemo(() => {
    let list = manual;
    if (filterTab === "live") {
      list = list.filter((c) => c.status === "active");
    } else if (filterTab === "drafts") {
      list = list.filter((c) => c.status === "draft" || c.status === "scheduled");
    } else if (filterTab === "attention") {
      list = list.filter((c) => {
        const meta = metaApproval(c);
        return (
          Boolean(c.statusReason) ||
          meta?.tone === "todo" ||
          meta?.tone === "wait" ||
          (c.status === "active" && !automationsEnabled && runsWhen(c).automated)
        );
      });
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.channelLabel.toLowerCase().includes(q) ||
        shortCampaignId(c.id).toLowerCase().includes(q),
    );
  }, [manual, search, filterTab, automationsEnabled]);

  const tabCounts = useMemo(() => {
    const live = manual.filter((c) => c.status === "active").length;
    const drafts = manual.filter((c) => c.status === "draft" || c.status === "scheduled").length;
    const attention = manual.filter((c) => {
      const meta = metaApproval(c);
      return (
        Boolean(c.statusReason) ||
        meta?.tone === "todo" ||
        meta?.tone === "wait" ||
        (c.status === "active" && !automationsEnabled && runsWhen(c).automated)
      );
    }).length;
    return { all: manual.length, live, attention, drafts };
  }, [manual, automationsEnabled]);

  const stats = useMemo(() => {
    const totalReach = manual.reduce((s, c) => s + c.reach, 0);
    const totalConversions = manual.reduce(
      (s, c) => s + Math.round(c.reach * parseConversionRate(c.conversion)),
      0,
    );
    const avgOrderCents = currency === "SGD" ? 2800 : 3500;
    const revenueCents = totalConversions * avgOrderCents;
    const effective = (c: Campaign) => effectiveDeploymentStatus(c, automationsEnabled);
    const configuredLive = manual.filter((c) => c.status === "active").length;
    const sendingNow = manual.filter((c) => effective(c) === "active").length;
    const automatedLive = manual.filter((c) => c.status === "active" && runsWhen(c).automated).length;
    const suspendedBySwitch = manual.filter((c) => isSuspendedByAutomations(c, automationsEnabled)).length;
    const needsApproval = manual.filter((c) => metaApproval(c)?.tone === "todo").length;
    const pendingApproval = manual.filter((c) => metaApproval(c)?.tone === "wait").length;
    const scheduled = manual.filter((c) => c.status === "scheduled").length;
    const paused = manual.filter((c) => c.status === "paused").length;
    const draft = manual.filter((c) => c.status === "draft").length;
    const total = manual.length || 1;
    return {
      totalReach,
      totalConversions,
      revenueCents,
      configuredLive,
      sendingNow,
      automatedLive,
      suspendedBySwitch,
      needsApproval,
      pendingApproval,
      scheduled,
      paused,
      draft,
      load: {
        live: { count: configuredLive, pct: Math.round((configuredLive / total) * 100) },
        scheduled: { count: scheduled + draft, pct: Math.round(((scheduled + draft) / total) * 100) },
        paused: { count: paused, pct: Math.round((paused / total) * 100) },
      },
    };
  }, [manual, currency, automationsEnabled]);

  const deployments = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const order = { active: 0, scheduled: 1, draft: 2, paused: 3 };
        return (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9);
      }),
    [filtered],
  );

  return (
    <div>
      <div className="mb-8 border-b border-surface-container-highest pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className={labelClass}>Campaigns</p>
            <h2 className="mt-1 font-display text-headline-md text-primary">Campaign overview</h2>
            <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">
              Aggregate performance and status across all marketing channels.
            </p>
            {manual.length > 0 && (
              <p className="mt-3 text-[12px] text-on-surface-variant">
                {manual.length} deployment{manual.length === 1 ? "" : "s"}
                {stats.configuredLive > 0 && (
                  <>
                    {" "}
                    · <span className="text-emerald-700">{stats.configuredLive} live</span>
                    {stats.sendingNow < stats.configuredLive && (
                      <>
                        {" "}
                        · <span className="text-amber-700">{stats.sendingNow} sending</span>
                      </>
                    )}
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:shrink-0">
            <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns…"
                aria-label="Search campaigns"
                className="h-10 w-full rounded-xl border border-surface-container-highest bg-surface-container-lowest pl-10 pr-3 text-body-md outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-body-md font-medium text-on-primary hover:opacity-90"
            >
              <Icon name="add" className="text-lg" />
              New campaign
            </button>
          </div>
        </div>
      </div>

      {numberHealth && numberHealth.qualityRating !== "GREEN" && numberHealth.qualityRating !== "UNKNOWN" && (
        <div
          role="alert"
          className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-body-md ${
            numberHealth.qualityRating === "RED"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          <Icon name={numberHealth.qualityRating === "RED" ? "gpp_bad" : "warning"} className="mt-0.5 text-lg" />
          <div>
            <p className="font-medium">
              WhatsApp number quality is {numberHealth.qualityRating === "RED" ? "low" : "at risk"}
              {numberHealth.displayPhoneNumber ? ` (${numberHealth.displayPhoneNumber})` : ""}.
            </p>
            <p className="mt-0.5 text-[12px] opacity-90">
              Too many members are blocking or reporting messages. Meta may pause templates or cut the daily
              sending limit{numberHealth.messagingLimit ? ` (currently ${numberHealth.messagingLimit.replace("TIER_", "")})` : ""}.
              Send less often, keep offers relevant, and make sure every message has a clear opt-out.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total reach",
            value: stats.totalReach.toLocaleString(),
            sub: `${manual.length} deployment${manual.length === 1 ? "" : "s"}`,
          },
          {
            label: "Total conversions",
            value: stats.totalConversions.toLocaleString(),
            sub: "From campaign reach × rate",
          },
          {
            label: "Revenue generated",
            value: formatMoney(stats.revenueCents, currency),
            sub: "Estimated from conversions",
          },
          {
            label: "Live campaigns",
            value: String(stats.configuredLive),
            sub: liveCampaignSubtitle(stats),
          },
        ].map((card) => (
          <article
            key={card.label}
            className="border border-surface-container-highest bg-surface-container-lowest p-5"
          >
            <p className={labelClass}>{card.label}</p>
            <p className="mt-3 font-display text-[32px] leading-none tracking-tight text-primary">
              {card.value}
            </p>
            <p className="mt-2 text-[12px] text-on-surface-variant">{card.sub}</p>
          </article>
        ))}
      </div>

      <section className="mb-8 border border-surface-container-highest bg-surface-container-lowest p-5">
        <h3 className="font-display text-headline-sm text-primary">System load &amp; status</h3>
        <div className="mt-4 flex h-3 w-full overflow-hidden bg-surface-container-high">
          {stats.load.live.pct > 0 && (
            <div className="h-full bg-primary" style={{ width: `${stats.load.live.pct}%` }} />
          )}
          {stats.load.scheduled.pct > 0 && (
            <div
              className="h-full bg-secondary"
              style={{ width: `${stats.load.scheduled.pct}%` }}
            />
          )}
          {stats.load.paused.pct > 0 && (
            <div
              className="h-full bg-outline-variant"
              style={{ width: `${stats.load.paused.pct}%` }}
            />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-6 text-[12px] text-on-surface-variant">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 bg-primary" />
            Live ({stats.load.live.count}) · {stats.load.live.pct}%
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 bg-secondary" />
            Scheduled ({stats.load.scheduled.count}) · {stats.load.scheduled.pct}%
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 bg-outline-variant" />
            Paused ({stats.load.paused.count}) · {stats.load.paused.pct}%
          </span>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-headline-sm text-primary">All campaigns</h3>
            <div className="mt-3 flex flex-wrap gap-1">
              {(
                [
                  { id: "all" as const, label: "All" },
                  { id: "live" as const, label: "Live" },
                  { id: "attention" as const, label: "Needs attention" },
                  { id: "drafts" as const, label: "Drafts" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider ${
                    filterTab === tab.id
                      ? "bg-primary text-on-primary"
                      : "border border-surface-container-highest bg-white text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {tab.label} ({tabCounts[tab.id]})
                </button>
              ))}
            </div>
            {search.trim() ? (
              <p className="mt-2 text-[12px] text-on-surface-variant">
                {deployments.length} result{deployments.length === 1 ? "" : "s"} for &ldquo;{search.trim()}&rdquo;
              </p>
            ) : (
              <p className="mt-2 text-[12px] text-on-surface-variant">
                Messages you send yourself and campaigns that run automatically, in one list.
              </p>
            )}
          </div>
          <div
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
              automationsEnabled
                ? "border-surface-container-highest bg-surface-container-lowest"
                : "border-amber-300 bg-amber-50"
            }`}
          >
            <span className="flex items-center gap-2 text-[12px] text-on-surface">
              <span
                className={`h-2 w-2 rounded-full ${automationsEnabled ? "bg-emerald-600" : "bg-amber-500"}`}
              />
              {automationsEnabled
                ? `Auto campaigns on · ${stats.automatedLive} live`
                : stats.suspendedBySwitch > 0
                  ? `Auto campaigns paused · ${stats.suspendedBySwitch} waiting`
                  : "Auto campaigns paused"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={automationsEnabled}
              disabled={savingSwitch}
              onClick={() => onToggleAutomations(!automationsEnabled)}
              title={
                automationsEnabled
                  ? "Pause campaigns that run on their own. Messages you send yourself still go out."
                  : "Turn auto campaigns back on"
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-surface-container-highest bg-white px-2.5 text-[12px] font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            >
              <Icon name={automationsEnabled ? "pause_circle" : "play_circle"} className="text-base" />
              {savingSwitch ? "Saving…" : automationsEnabled ? "Pause all" : "Resume"}
            </button>
          </div>
        </div>

        {onSaveSendHygiene && (
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-surface-container-highest bg-surface-container-lowest px-3 py-3">
            <div>
              <p className={labelClass}>Quiet hours · send window</p>
              <p className="mt-1 max-w-sm text-[11px] text-on-surface-variant">
                Automated WhatsApp waits until this window (merchant timezone). Leave blank for anytime. Manual Send still goes immediately.
              </p>
            </div>
            <label className="flex flex-col gap-1 text-[11px] text-on-surface-variant">
              From
              <input
                type="time"
                value={windowStartDraft}
                onChange={(e) => setWindowStartDraft(e.target.value)}
                className="h-8 rounded-lg border border-surface-container-highest bg-white px-2 text-[12px] text-on-surface"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-on-surface-variant">
              To
              <input
                type="time"
                value={windowEndDraft}
                onChange={(e) => setWindowEndDraft(e.target.value)}
                className="h-8 rounded-lg border border-surface-container-highest bg-white px-2 text-[12px] text-on-surface"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-on-surface-variant">
              Member cap (hours)
              <input
                type="number"
                min={0}
                max={168}
                value={capDraft}
                onChange={(e) => setCapDraft(e.target.value)}
                title="Skip a member if they already got a campaign message within this many hours"
                className="h-8 w-20 rounded-lg border border-surface-container-highest bg-white px-2 text-[12px] text-on-surface"
              />
            </label>
            <button
              type="button"
              disabled={savingSwitch}
              onClick={() => {
                const hours = Number(capDraft);
                void onSaveSendHygiene({
                  campaignSendWindowStart: windowStartDraft || null,
                  campaignSendWindowEnd: windowEndDraft || null,
                  campaignSendCapHours: Number.isFinite(hours) ? Math.max(0, Math.min(168, Math.round(hours))) : 48,
                });
              }}
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-[12px] font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {savingSwitch ? "Saving…" : "Save"}
            </button>
          </div>
        )}

        <div className="overflow-x-auto border border-surface-container-highest bg-surface-container-lowest">
          <table className="w-full min-w-[720px] text-left text-body-md">
            <thead>
              <tr className="border-b border-surface-container-highest bg-surface-container-low">
                {["Campaign", "Channel", "Runs when", "Status", "Meta", "Reach", ""].map((col) => (
                  <th key={col || "actions"} className={`px-4 py-3 ${labelClass}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deployments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-on-surface-variant">
                    {search.trim()
                      ? `No campaigns match "${search.trim()}".`
                      : filterTab === "live"
                        ? "No live campaigns."
                        : filterTab === "attention"
                          ? "Nothing needs attention."
                          : filterTab === "drafts"
                            ? "No drafts."
                            : "No campaigns yet."}{" "}
                    <button type="button" onClick={onCreateNew} className="font-medium text-primary underline">
                      {search.trim() || filterTab !== "all" ? "Create a new campaign" : "Create your first campaign"}
                    </button>
                    .
                  </td>
                </tr>
              ) : (
                deployments.map((c) => (
                  <tr
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onViewDetails(c)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onViewDetails(c);
                      }
                    }}
                    className="group cursor-pointer border-b border-surface-container-highest transition-colors last:border-0 hover:bg-surface-container-low/60 focus-visible:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-primary">{c.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-on-surface-variant">
                        ID: {shortCampaignId(c.id)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant">{c.channelLabel}</td>
                    <td className="px-4 py-4 text-on-surface-variant">
                      {(() => {
                        const when = runsWhen(c);
                        return (
                          <span className="inline-flex items-center gap-1.5">
                            <Icon
                              name={when.automated ? "auto_awesome" : c.channel === "banner" ? "view_carousel" : "send"}
                              className="text-base"
                            />
                            {when.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      <DeploymentStatusBadge status={c.status} />
                      {isSuspendedByAutomations(c, automationsEnabled) && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700">
                          <Icon name="pause_circle" className="text-[14px]" />
                          Not sending · automations paused
                        </p>
                      )}
                      {c.statusReason && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-700" title={c.statusReason}>
                          <Icon name="report" className="text-[14px]" />
                          Paused by Meta
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const approval = metaApproval(c);
                        if (!approval) {
                          return <span className="text-[11px] text-on-surface-variant">—</span>;
                        }
                        return (
                          <p
                            className={`inline-flex items-center gap-1 text-[11px] ${
                              approval.tone === "ok"
                                ? "text-emerald-700"
                                : approval.tone === "wait"
                                  ? "text-amber-700"
                                  : "text-on-surface-variant"
                            }`}
                          >
                            <Icon
                              name={
                                approval.tone === "ok"
                                  ? "verified"
                                  : approval.tone === "wait"
                                    ? "hourglass_top"
                                    : "pending_actions"
                              }
                              className="text-[14px]"
                            />
                            {approval.label}
                          </p>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4 tabular-nums">{c.reach.toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-primary underline-offset-2 group-hover:underline">
                        View details
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
