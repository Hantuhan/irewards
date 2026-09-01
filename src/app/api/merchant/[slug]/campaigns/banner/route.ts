import { NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/db/repository";
import { getActiveBannerCampaign } from "@/lib/db/merchant-repository";
import { recordCampaignEvent } from "@/lib/db/automation-repository";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const campaign = await getActiveBannerCampaign(merchant.id);
    if (!campaign) {
      return NextResponse.json({ banner: null });
    }

    await recordCampaignEvent(campaign.id, "impression");

    return NextResponse.json({
      banner: {
        id: campaign.id,
        title: campaign.banner_title ?? campaign.name,
        text: campaign.banner_text,
        linkUrl: campaign.link_url,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load banner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
