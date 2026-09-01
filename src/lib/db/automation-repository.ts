import { createInsforgeAdmin } from "@/lib/insforge/client";
import type { AutomationRuleRow } from "@/lib/db/types";

function db() {
  return createInsforgeAdmin().database;
}

export type AutomationJobRow = {
  id: string;
  merchant_id: string;
  order_id: string | null;
  customer_id: string | null;
  job_type: string;
  run_at: string;
  status: string;
  payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  merchant_slug?: string;
};

export async function getAutomationRule(
  merchantId: string,
  ruleKey: string,
): Promise<(AutomationRuleRow & { config: Record<string, unknown> }) | null> {
  const { data, error } = await db()
    .from("automation_rules")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("rule_key", ruleKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as (AutomationRuleRow & { config: Record<string, unknown> }) | null;
}

export async function updateAutomationRuleConfig(
  merchantId: string,
  ruleKey: string,
  config: Record<string, unknown>,
  enabled?: boolean,
) {
  const patch: Record<string, unknown> = { config };
  if (enabled !== undefined) patch.enabled = enabled;

  const { data, error } = await db()
    .from("automation_rules")
    .update(patch)
    .eq("merchant_id", merchantId)
    .eq("rule_key", ruleKey)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function enqueueAutomationJob(input: {
  merchantId: string;
  orderId?: string | null;
  customerId?: string | null;
  jobType: string;
  runAt: Date;
  payload?: Record<string, unknown>;
}) {
  const { error } = await db().from("automation_jobs").insert([
    {
      merchant_id: input.merchantId,
      order_id: input.orderId ?? null,
      customer_id: input.customerId ?? null,
      job_type: input.jobType,
      run_at: input.runAt.toISOString(),
      payload: input.payload ?? null,
    },
  ]);
  if (error) throw new Error(error.message);
}

export async function listDueAutomationJobs(limit = 50): Promise<AutomationJobRow[]> {
  const { data, error } = await db()
    .from("automation_jobs")
    .select("*, merchants(slug)")
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .order("run_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as AutomationJobRow & { merchants: { slug: string } };
    return { ...r, merchant_slug: r.merchants?.slug };
  });
}

export async function markAutomationJob(
  jobId: string,
  status: "sent" | "failed" | "cancelled",
  errorMessage?: string,
) {
  const { error } = await db()
    .from("automation_jobs")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      error_message: errorMessage ?? null,
    })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
}

export async function incrementCampaignReach(campaignId: string) {
  const { data: current } = await db()
    .from("campaigns")
    .select("reach_count")
    .eq("id", campaignId)
    .single();

  const reach = Number((current as { reach_count: number } | null)?.reach_count ?? 0) + 1;
  await db().from("campaigns").update({ reach_count: reach }).eq("id", campaignId);
}

export async function recordCampaignEvent(
  campaignId: string,
  eventType: "impression" | "click" | "send" | "conversion",
) {
  const { error } = await db().from("campaign_events").insert([
    { campaign_id: campaignId, event_type: eventType },
  ]);
  if (error) throw new Error(error.message);
}
