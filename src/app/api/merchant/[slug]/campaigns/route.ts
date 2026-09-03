import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  createCampaign,
  listCampaigns,
  updateCampaign,
  updateCampaignStatus,
} from "@/lib/db/merchant-repository";
import { getCampaignById } from "@/lib/services/campaign-send";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { campaignChannelLabel } from "@/lib/campaigns/channels";
import { asWorkflow, workflowBannerFields, workflowMessageBody } from "@/lib/campaigns/workflow-spec";
import {
  getLatestTemplateForCampaign,
  listLatestTemplatesByCampaign,
} from "@/lib/db/whatsapp-template-repository";
import type { WhatsAppTemplateRow } from "@/lib/db/types";
import { goLiveBlocker } from "@/lib/services/campaign-status";
import { summarizeTemplate } from "@/lib/whatsapp/templates";
import { getNumberHealth, summarizeNumberHealth } from "@/lib/whatsapp/number-health";

type RouteContext = { params: Promise<{ slug: string }> };

/** The editor owns the workflow shape; asWorkflow() normalises whatever lands. */
const workflowSchema = z.record(z.unknown()).nullable().optional();

function mapCampaign(
  c: Awaited<ReturnType<typeof listCampaigns>>[number],
  template: WhatsAppTemplateRow | null,
) {
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
    bannerImageUrl: c.banner_image_url,
    linkUrl: c.link_url,
    workflow: asWorkflow(c.workflow, c.channel),
    triggerType: c.trigger_type,
    statusReason: c.status_reason ?? null,
    createdAt: c.created_at ?? null,
    whatsappTemplate: c.channel === "whatsapp" ? summarizeTemplate(template, c.message_body) : null,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const [campaigns, templates, health] = await Promise.all([
      listCampaigns(merchant.id),
      listLatestTemplatesByCampaign(merchant.id),
      getNumberHealth().catch(() => null),
    ]);
    return NextResponse.json({
      campaigns: campaigns.map((c) => mapCampaign(c, templates.get(c.id) ?? null)),
      numberHealth: summarizeNumberHealth(health),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const postSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(["banner", "whatsapp"]),
  status: z.enum(["draft", "active", "scheduled", "paused"]).default("draft"),
  messageBody: z.string().nullable().optional(),
  bannerTitle: z.string().nullable().optional(),
  bannerText: z.string().nullable().optional(),
  bannerImageUrl: z.string().nullable().optional(),
  linkUrl: z.union([z.string().url(), z.literal("")]).nullable().optional(),
  workflow: workflowSchema,
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

    const body = postSchema.parse(await request.json());
    const workflow = asWorkflow(body.workflow, body.channel);
    const banner = workflowBannerFields(workflow);
    const campaign = await createCampaign(merchant.id, {
      name: body.name,
      channel: body.channel,
      status: body.status,
      messageBody: body.messageBody ?? workflowMessageBody(workflow),
      bannerTitle: body.bannerTitle ?? banner?.banner_title ?? null,
      bannerText: body.bannerText ?? banner?.banner_text ?? null,
      bannerImageUrl: body.bannerImageUrl ?? banner?.banner_image_url ?? null,
      linkUrl: body.linkUrl ?? banner?.link_url ?? null,
      workflow,
      triggerType: workflow.trigger.type,
    });
    return NextResponse.json({ id: campaign.id, name: campaign.name });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
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
  bannerImageUrl: z.string().nullable().optional(),
  linkUrl: z.union([z.string().url(), z.literal("")]).nullable().optional(),
  workflow: workflowSchema,
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());
    const { campaignId, status, ...content } = body;

    let workflowPatch = {};
    if (content.workflow !== undefined && content.workflow !== null) {
      const existing = await getCampaignById(merchant.id, campaignId);
      if (!existing) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      const workflow = asWorkflow(content.workflow, existing.channel);
      const banner = workflowBannerFields(workflow);
      workflowPatch = {
        workflow,
        trigger_type: workflow.trigger.type,
        // Keep message_body and the banner columns in sync so the sender, the
        // storefront and reporting never fall out of step with the builder.
        ...(content.messageBody === undefined && { message_body: workflowMessageBody(workflow) }),
        ...(banner && content.bannerTitle === undefined && { banner_title: banner.banner_title }),
        ...(banner && content.bannerText === undefined && { banner_text: banner.banner_text }),
        ...(banner && content.bannerImageUrl === undefined && { banner_image_url: banner.banner_image_url }),
        ...(banner && content.linkUrl === undefined && { link_url: banner.link_url }),
      };
    }

    const contentPatch = {
      ...(content.name !== undefined && { name: content.name }),
      ...(content.messageBody !== undefined && { message_body: content.messageBody }),
      ...(content.bannerTitle !== undefined && { banner_title: content.bannerTitle }),
      ...(content.bannerText !== undefined && { banner_text: content.bannerText }),
      ...(content.bannerImageUrl !== undefined && { banner_image_url: content.bannerImageUrl }),
      ...(content.linkUrl !== undefined && { link_url: content.linkUrl }),
      ...workflowPatch,
    };

    if (status === "active") {
      const target = await getCampaignById(merchant.id, campaignId);
      const blocker = target
        ? await goLiveBlocker(target, {
            workflow: content.workflow ?? undefined,
            messageBody: content.messageBody,
          })
        : null;
      if (blocker) return NextResponse.json({ error: blocker }, { status: 409 });
    }

    let campaign =
      status !== undefined
        ? await updateCampaignStatus(merchant.id, campaignId, status)
        : null;
    if (campaign?.status_reason && status !== undefined) {
      // The merchant chose this status themselves; the system's reason no longer applies.
      campaign = await updateCampaign(merchant.id, campaignId, { status_reason: null });
    }

    if (Object.keys(contentPatch).length > 0) {
      campaign = await updateCampaign(merchant.id, campaignId, contentPatch);
    }

    if (!campaign) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    return NextResponse.json(mapCampaign(campaign, await getLatestTemplateForCampaign(campaign.id)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
