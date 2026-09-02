import type { Campaign } from "@/components/admin/campaigns/types";
import type { CampaignEventCounts } from "@/lib/db/campaign-analytics-repository";

export type CampaignDetailAnalytics = {
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  openRateDelta: number;
  vouchersClaimed: number;
  claimRate: number;
  estimatedRoiCents: number;
  roiMultiple: number;
  costPerClaimCents: number;
  runningDays: number;
  /** True when numbers come from campaign_events / promo_redemptions. */
  isLiveData: boolean;
  funnel: {
    sent: number;
    opened: number;
    openedPct: number;
    claimed: number;
    claimedPct: number;
    redeemed: number;
    redeemedPct: number;
  };
  demographics: { label: string; pct: number }[];
  dailyRedemptions: { label: string; value: number; tone?: "default" | "peak" | "today" }[];
};

export type CampaignAnalyticsInput = {
  events: CampaignEventCounts;
  redemptions: number;
  dailySends: { label: string; value: number; tone?: "default" | "peak" | "today" }[];
};

/** Build the detail report from real event counts (preferred). */
export function computeCampaignDetailAnalyticsFromEvents(
  campaign: Campaign,
  input: CampaignAnalyticsInput,
  currency: "MYR" | "SGD" = "MYR",
): CampaignDetailAnalytics {
  const sent = Math.max(input.events.send, campaign.reach, 0);
  const impressions = input.events.impression;
  const opened = impressions > 0 ? impressions : sent; // WhatsApp has no open webhook — treat send as delivered
  const claimed = Math.max(input.events.conversion, 0);
  const redeemed = Math.max(input.redemptions, input.events.redeem, 0);

  const avgOrderCents = currency === "SGD" ? 2800 : 3500;
  const costPerClaimCents = currency === "SGD" ? 120 : 150;
  const estimatedRoiCents = redeemed * avgOrderCents;
  const spendCents = Math.max((claimed || redeemed) * costPerClaimCents, 1);
  const roiMultiple = estimatedRoiCents / spendCents;

  const created = campaign.createdAt ? new Date(campaign.createdAt) : new Date();
  const runningDays = Math.max(
    1,
    Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000)),
  );

  return {
    totalSent: sent,
    deliveryRate: sent > 0 ? 100 : 0,
    openRate: sent > 0 ? opened / sent : 0,
    openRateDelta: 0,
    vouchersClaimed: claimed,
    claimRate: sent > 0 ? claimed / sent : 0,
    estimatedRoiCents,
    roiMultiple,
    costPerClaimCents,
    runningDays,
    isLiveData: true,
    funnel: {
      sent,
      opened,
      openedPct: sent > 0 ? opened / sent : 0,
      claimed,
      claimedPct: sent > 0 ? claimed / sent : 0,
      redeemed,
      redeemedPct: claimed > 0 ? redeemed / claimed : sent > 0 ? redeemed / sent : 0,
    },
    demographics: [],
    dailyRedemptions: input.dailySends,
  };
}

/** Fallback when analytics API is unavailable — reach only, no invented funnel. */
export function computeCampaignDetailAnalytics(
  campaign: Campaign,
  currency: "MYR" | "SGD" = "MYR",
): CampaignDetailAnalytics {
  const sent = Math.max(campaign.reach, 0);
  const created = campaign.createdAt ? new Date(campaign.createdAt) : new Date();
  const runningDays = Math.max(
    1,
    Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000)),
  );

  return {
    totalSent: sent,
    deliveryRate: sent > 0 ? 100 : 0,
    openRate: 0,
    openRateDelta: 0,
    vouchersClaimed: 0,
    claimRate: 0,
    estimatedRoiCents: 0,
    roiMultiple: 0,
    costPerClaimCents: currency === "SGD" ? 120 : 150,
    runningDays,
    isLiveData: false,
    funnel: {
      sent,
      opened: 0,
      openedPct: 0,
      claimed: 0,
      claimedPct: 0,
      redeemed: 0,
      redeemedPct: 0,
    },
    demographics: [],
    dailyRedemptions: Array.from({ length: 12 }, (_, i) => ({
      label: i === 11 ? "Today" : `D${i + 1}`,
      value: 0,
      tone: (i === 11 ? "today" : "default") as "default" | "today",
    })),
  };
}

export function formatCampaignMoney(cents: number, currency: "MYR" | "SGD"): string {
  const symbol = currency === "SGD" ? "S$" : "RM";
  const amount = cents / 100;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}k`;
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatPct(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`;
}
