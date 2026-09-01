import { createInsforgeAdmin } from "@/lib/insforge/client";
import type { CampaignRow, CustomerRow } from "@/lib/db/types";
import { enqueueAutomationJob } from "@/lib/db/automation-repository";

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
  if (campaign.channel !== "whatsapp" && campaign.channel !== "sms") {
    throw new Error("Only WhatsApp and SMS campaigns can be broadcast");
  }
  if (!campaign.message_body?.trim()) {
    throw new Error("Campaign message is required");
  }

  const members = await listMarketingMembers(merchantId);
  const jobType = campaign.channel === "sms" ? "campaign_sms" : "campaign_whatsapp";
  const runAt = new Date();
  let queued = 0;

  for (const member of members) {
    if (!member.phone) continue;
    await enqueueAutomationJob({
      merchantId,
      customerId: member.id,
      jobType,
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

export async function hasRecentChurnJob(
  merchantId: string,
  customerId: string,
  withinDays = 14,
): Promise<boolean> {
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db()
    .from("automation_jobs")
    .select("id")
    .eq("merchant_id", merchantId)
    .eq("customer_id", customerId)
    .eq("job_type", "churn_winback")
    .gte("created_at", since)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
