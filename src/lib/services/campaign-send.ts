import { createInsforgeAdmin } from "@/lib/insforge/client";
import type { CampaignRow, CustomerRow } from "@/lib/db/types";
import { enqueueAutomationJob } from "@/lib/db/automation-repository";
import { resolveApprovedTemplate } from "@/lib/whatsapp/templates";

function db() {
  return createInsforgeAdmin().database;
}

export async function getCampaignById(
  merchantId: string,
  campaignId: string,
): Promise<CampaignRow | null> {
  const { data, error } = await db()
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CampaignRow | null;
}

export async function listMarketingMembers(merchantId: string): Promise<CustomerRow[]> {
  const { data, error } = await db()
    .from("customers")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("is_member", true)
    .eq("marketing_opt_out", false)
    .not("phone", "is", null);

  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerRow[];
}

export async function queueCampaignBroadcast(
  merchantId: string,
  campaign: CampaignRow,
): Promise<{ queued: number }> {
  if (campaign.channel !== "whatsapp") {
    throw new Error("Only WhatsApp campaigns can be broadcast");
  }
  if (!campaign.message_body?.trim()) {
    throw new Error("Campaign message is required");
  }
  const approved = await resolveApprovedTemplate(campaign.id, campaign.message_body);
  if (!approved) {
    throw new Error(
      "WhatsApp broadcasts need a Meta-approved template for the current message. Submit it for approval in the workflow builder and wait for Meta's verdict.",
    );
  }

  const members = await listMarketingMembers(merchantId);
  const runAt = new Date();
  let queued = 0;

  for (const member of members) {
    if (!member.phone) continue;
    await enqueueAutomationJob({
      merchantId,
      customerId: member.id,
      jobType: "campaign_whatsapp",
      runAt: new Date(runAt.getTime() + queued * 2000),
      payload: {
        campaignId: campaign.id,
        phone: member.phone,
        message: campaign.message_body,
      },
    });
    queued += 1;
  }

  return { queued };
}
