import { NextResponse } from "next/server";
import { getCustomerById, getMerchantBySlug } from "@/lib/db/repository";
import { getActiveBannerCampaign } from "@/lib/db/merchant-repository";
import { recordCampaignEvent } from "@/lib/db/automation-repository";
import {
  bannerWorkflowAllowsDisplay,
  runCampaignTrigger,
} from "@/lib/campaigns/workflow-runtime";
import { getMemberSessionFromRequest } from "@/lib/customer/session";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // The storefront hits this on every menu open, which is exactly the
    // "storefront opened" event campaigns can be armed against.
    const session = getMemberSessionFromRequest(request);
    const customer =
      session?.merchantId === merchant.id ? await getCustomerById(session.customerId) : null;

    await runCampaignTrigger("storefront_opened", {
      merchantId: merchant.id,
      customer,
      timezone: merchant.timezone || "Asia/Kuala_Lumpur",
    });

    const campaign = await getActiveBannerCampaign(merchant.id);
    if (!campaign) {
      return NextResponse.json({ banner: null });
    }

    // Day-of-week / tier / etc. live on the workflow — honor them here because
    // banners are read from the campaign row, not queued as jobs.
    if (
      !bannerWorkflowAllowsDisplay(campaign, {
        merchantId: merchant.id,
        customer,
        timezone: merchant.timezone || "Asia/Kuala_Lumpur",
      })
    ) {
      return NextResponse.json({ banner: null });
    }

    await recordCampaignEvent(campaign.id, "impression");

    return NextResponse.json({
      banner: {
        id: campaign.id,
        title: campaign.banner_title ?? campaign.name,
        text: campaign.banner_text,
        imageUrl: campaign.banner_image_url,
        linkUrl: campaign.link_url,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load banner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
