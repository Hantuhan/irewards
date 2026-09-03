import { NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { getCampaignById } from "@/lib/services/campaign-send";
import {
  countCampaignEvents,
  countCampaignRedemptions,
  dailyCampaignSends,
} from "@/lib/db/campaign-analytics-repository";
import {
  computeCampaignDetailAnalyticsFromEvents,
  type CampaignDetailAnalytics,
} from "@/lib/campaigns/campaign-analytics";
import { campaignChannelLabel } from "@/lib/campaigns/channels";

type RouteContext = { params: Promise<{ slug: string; campaignId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug, campaignId } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const campaign = await getCampaignById(merchant.id, campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [events, redemptions, dailySends] = await Promise.all([
      countCampaignEvents(campaignId),
      countCampaignRedemptions(campaignId),
      dailyCampaignSends(campaignId, 12),
    ]);

    const analytics: CampaignDetailAnalytics = computeCampaignDetailAnalyticsFromEvents(
      {
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        channelLabel: campaignChannelLabel(campaign.channel),
        status: campaign.status,
        reach: campaign.reach_count,
        conversion:
          campaign.conversion_rate !== null
            ? `${Math.round(Number(campaign.conversion_rate) * 100)}%`
            : "—",
        messageBody: campaign.message_body,
        bannerTitle: campaign.banner_title,
        bannerText: campaign.banner_text,
        bannerImageUrl: campaign.banner_image_url,
        linkUrl: campaign.link_url,
        createdAt: campaign.created_at ?? null,
      },
      { events, redemptions, dailySends },
      merchant.currency === "SGD" ? "SGD" : "MYR",
    );

    return NextResponse.json({ analytics, events, redemptions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
