import { adminDb } from "@/lib/db/admin";
import type { CampaignRow, CustomerRow } from "@/lib/db/types";
import { enqueueAutomationJobs } from "@/lib/db/automation-repository";
import { snapToSendWindow } from "@/lib/campaigns/send-window";
import { resolveApprovedTemplate } from "@/lib/whatsapp/templates";

function db() {
  return adminDb();
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

/** Seconds between consecutive broadcast sends, so a blast is paced for Meta. */
const BROADCAST_SPACING_MS = 2000;

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

  const { data: merchantRow } = await db()
    .from("merchants")
    .select("timezone, campaign_send_window_start, campaign_send_window_end")
    .eq("id", merchantId)
    .maybeSingle();
  const merchant = merchantRow as {
    timezone?: string | null;
    campaign_send_window_start?: string | null;
    campaign_send_window_end?: string | null;
  } | null;
  const window = {
    start: merchant?.campaign_send_window_start ?? null,
    end: merchant?.campaign_send_window_end ?? null,
    timezone: merchant?.timezone || "Asia/Kuala_Lumpur",
  };

  const members = await listMarketingMembers(merchantId);
  const startedAt = Date.now();
  let index = 0;

  // Built in memory and inserted in chunks: a list of a few thousand members
  // is a few thousand round trips otherwise, which exceeds the per-request
  // budget on Workers long before the broadcast is queued.
  const rows = [];
  for (const member of members) {
    if (!member.phone) continue;
    // A broadcast obeys quiet hours the same as an automated send does.
    const runAt = snapToSendWindow(
      new Date(startedAt + index * BROADCAST_SPACING_MS),
      window,
    );
    rows.push({
      merchantId,
      customerId: member.id,
      jobType: "campaign_whatsapp",
      runAt,
      payload: {
        campaignId: campaign.id,
        phone: member.phone,
        message: campaign.message_body as string,
      },
    });
    index += 1;
  }

  const queued = await enqueueAutomationJobs(rows);
  return { queued };
}
