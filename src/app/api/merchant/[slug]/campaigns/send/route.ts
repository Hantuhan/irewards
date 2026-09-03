import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import { updateCampaignStatus } from "@/lib/db/merchant-repository";
import { getCampaignById, queueCampaignBroadcast } from "@/lib/services/campaign-send";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  campaignId: z.string().uuid(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());
    const campaign = await getCampaignById(merchant.id, body.campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const result = await queueCampaignBroadcast(merchant.id, campaign);
    await updateCampaignStatus(merchant.id, campaign.id, "active");

    return NextResponse.json({
      ok: true,
      queued: result.queued,
      message: `Queued ${result.queued} messages`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
