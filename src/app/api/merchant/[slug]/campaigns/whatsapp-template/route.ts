import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import { getLatestTemplateForCampaign } from "@/lib/db/whatsapp-template-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { getCampaignById } from "@/lib/services/campaign-send";
import {
  refreshTemplateStatus,
  submitCampaignTemplate,
  summarizeTemplate,
} from "@/lib/whatsapp/templates";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET  ?campaignId=…&refresh=1  → latest submission for the campaign
 *                                  (refresh=1 re-checks Meta before answering)
 * POST { campaignId }           → submit the campaign's current copy to Meta
 */

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaignId") ?? "";
    const refresh = url.searchParams.get("refresh") === "1";
    if (!z.string().uuid().safeParse(campaignId).success) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    const campaign = await getCampaignById(merchant.id, campaignId);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    let row = await getLatestTemplateForCampaign(campaign.id);
    if (row && refresh && row.status === "pending") {
      row = await refreshTemplateStatus(row);
    }

    return NextResponse.json({ template: summarizeTemplate(row, campaign.message_body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load template status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const postSchema = z.object({ campaignId: z.string().uuid() });

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

    const body = postSchema.parse(await request.json());
    const campaign = await getCampaignById(merchant.id, body.campaignId);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const row = await submitCampaignTemplate(merchant, campaign);
    const template = summarizeTemplate(row, campaign.message_body);
    const status = row.status === "failed" ? 422 : 200;
    return NextResponse.json({ template }, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
