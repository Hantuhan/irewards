import { createInsforgeAdmin } from "@/lib/insforge/client";

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

export async function getAutomationJobStats(
  merchantId: string,
  jobTypes: string[],
): Promise<{ sent: number; failed: number; pending: number; cancelled: number }> {
  const empty = { sent: 0, failed: 0, pending: 0, cancelled: 0 };
  if (jobTypes.length === 0) return empty;

  const { data, error } = await db()
    .from("automation_jobs")
    .select("status")
    .eq("merchant_id", merchantId)
    .in("job_type", jobTypes);

  if (error) throw new Error(error.message);

  const counts = { ...empty };
  for (const row of data ?? []) {
    const status = (row as { status: string }).status;
    if (status === "sent") counts.sent += 1;
    else if (status === "failed") counts.failed += 1;
    else if (status === "pending") counts.pending += 1;
    else if (status === "cancelled") counts.cancelled += 1;
  }
  return counts;
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
  eventType: "impression" | "click" | "send" | "conversion" | "redeem",
) {
  const { error } = await db().from("campaign_events").insert([
    { campaign_id: campaignId, event_type: eventType },
  ]);
  if (error) throw new Error(error.message);
}
