import { NextResponse } from "next/server";
import { z } from "zod";
import { draftCampaignCopy } from "@/lib/ai/campaign-intelligence";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

/** Single-message drafts for the template editor; whole campaigns come from the planner (ai/campaign-composer). */
const bodySchema = z.object({
  type: z.literal("campaign"),
  channel: z.enum(["whatsapp", "banner"]),
  goal: z.string().min(1).max(500),
  audience: z.string().max(200).optional(),
  tone: z.string().max(100).optional(),
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

    const result = await draftCampaignCopy({
      merchantName: merchant.name,
      channel: body.channel,
      goal: body.goal,
      audience: body.audience,
      tone: body.tone,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI draft failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
