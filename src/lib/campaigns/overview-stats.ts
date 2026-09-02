import type { Campaign } from "@/components/admin/campaigns/CampaignManagerView";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant";

export type CampaignOverviewStats = {
  totalReach: number;
  totalConversions: number;
  estimatedRevenueCents: number;
  activeLoops: number;
  awaitingApproval: number;
  runningPct: number;
  scheduledPct: number;
  pausedPct: number;
  runningCount: number;
  scheduledCount: number;
  pausedCount: number;
};

function parseConversionRate(conversion: string): number | null {
  if (!conversion || conversion === "—") return null;
  const match = conversion.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]) / 100;
}

/** Aggregate campaign list into overview KPIs and status breakdown. */
export function computeCampaignOverviewStats(campaigns: Campaign[]): CampaignOverviewStats {
  const list = campaigns.filter((c) => c.channel !== "auto");
  const totalReach = list.reduce((sum, c) => sum + c.reach, 0);

  let totalConversions = 0;
  for (const c of list) {
    const rate = parseConversionRate(c.conversion);
    if (rate != null) totalConversions += Math.round(c.reach * rate);
  }

  const runningCount = list.filter((c) => c.status === "active").length;
  const scheduledCount = list.filter((c) => c.status === "scheduled").length;
  const pausedCount = list.filter(
    (c) => c.status === "paused" || c.status === "draft",
  ).length;
  const total = list.length || 1;

  const avgOrderCents = 1200;
  const estimatedRevenueCents = totalConversions * avgOrderCents;

  return {
    totalReach,
    totalConversions,
    estimatedRevenueCents,
    activeLoops: runningCount + scheduledCount,
    awaitingApproval: list.filter((c) => c.status === "draft").length,
    runningPct: Math.round((runningCount / total) * 100),
    scheduledPct: Math.round((scheduledCount / total) * 100),
    pausedPct: Math.round((pausedCount / total) * 100),
    runningCount,
    scheduledCount,
    pausedCount,
  };
}

export function campaignShortId(id: string): string {
  return `C-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

export function formatOverviewNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toLocaleString();
}

export function formatRevenue(cents: number): string {
  if (cents <= 0) return "—";
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

export { labelClass };
