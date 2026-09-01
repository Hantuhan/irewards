import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  createCampaign,
  listCampaigns,
  updateCampaign,
  updateCampaignStatus,
} from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { campaignChannelLabel } from "@/lib/campaigns/channels";

type RouteContext = { params: Promise<{ slug: string }> };

function mapCampaign(c: Awaited<ReturnType<typeof listCampaigns>>[number]) {
  return {
    id: c.id,
    name: c.name,
    channel: c.channel,
    channelLabel: campaignChannelLabel(c.channel),
    status: c.status,
    reach: c.reach_count,
    conversion:
      c.conversion_rate !== null
        ? `${Math.round(Number(c.conversion_rate) * 100)}%`
        : "—",
    messageBody: c.message_body,
    bannerTitle: c.banner_title,
    bannerText: c.banner_text,
    linkUrl: c.link_url,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const campaigns = await listCampaigns(merchant.id);
    return NextResponse.json({ campaigns: campaigns.map(mapCampaign) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const postSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(["banner", "whatsapp", "sms"]),
  status: z.enum(["draft", "active", "scheduled", "paused"]).default("draft"),
  messageBody: z.string().nullable().optional(),
  bannerTitle: z.string().nullable().optional(),
  bannerText: z.string().nullable().optional(),
  linkUrl: z.union([z.string().url(), z.literal("")]).nullable().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = postSchema.parse(await request.json());
    const campaign = await createCampaign(merchant.id, {
      name: body.name,
      channel: body.channel,
      status: body.status,
      messageBody: body.messageBody ?? null,
      bannerTitle: body.bannerTitle ?? null,
      bannerText: body.bannerText ?? null,
      linkUrl: body.linkUrl ?? null,
    });
    return NextResponse.json({ id: campaign.id, name: campaign.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(["draft", "active", "scheduled", "paused"]).optional(),
  name: z.string().min(1).optional(),
  messageBody: z.string().nullable().optional(),
  bannerTitle: z.string().nullable().optional(),
  bannerText: z.string().nullable().optional(),
  linkUrl: z.union([z.string().url(), z.literal("")]).nullable().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());
    const { campaignId, status, ...content } = body;

    if (status) {
      await updateCampaignStatus(merchant.id, campaignId, status);
    }

    const campaign = await updateCampaign(merchant.id, campaignId, {
      ...(content.name !== undefined && { name: content.name }),
      ...(content.messageBody !== undefined && { message_body: content.messageBody }),
      ...(content.bannerTitle !== undefined && { banner_title: content.bannerTitle }),
      ...(content.bannerText !== undefined && { banner_text: content.bannerText }),
      ...(content.linkUrl !== undefined && { link_url: content.linkUrl }),
      ...(status !== undefined && { status }),
    });

    return NextResponse.json(mapCampaign(campaign));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
