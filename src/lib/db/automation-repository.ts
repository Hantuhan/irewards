import { adminDb } from "@/lib/db/admin";

function db() {
  return adminDb();
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
  attempts: number;
  claimed_at: string | null;
  merchant_slug?: string;
};

/** A job is retried this many times before it is given up on. */
export const MAX_JOB_ATTEMPTS = 3;

/** A claim older than this means the worker died mid-job. */
const STALL_MINUTES = 15;

/** Backoff before each retry, indexed by attempts already made. */
const RETRY_BACKOFF_MINUTES = [5, 20];

export function retryDelayMinutes(attempts: number): number {
  return RETRY_BACKOFF_MINUTES[attempts - 1] ?? RETRY_BACKOFF_MINUTES[RETRY_BACKOFF_MINUTES.length - 1];
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

/**
 * Bulk enqueue. A broadcast to a few thousand members must not be a few
 * thousand round trips — that blows the per-request subrequest budget on
 * Workers long before the list is queued.
 */
export async function enqueueAutomationJobs(
  rows: {
    merchantId: string;
    orderId?: string | null;
    customerId?: string | null;
    jobType: string;
    runAt: Date;
    payload?: Record<string, unknown>;
  }[],
  chunkSize = 200,
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((input) => ({
      merchant_id: input.merchantId,
      order_id: input.orderId ?? null,
      customer_id: input.customerId ?? null,
      job_type: input.jobType,
      run_at: input.runAt.toISOString(),
      payload: input.payload ?? null,
    }));
    const { error } = await db().from("automation_jobs").insert(chunk);
    if (error) throw new Error(error.message);
    inserted += chunk.length;
  }
  return inserted;
}

/** Record that a voucher was issued to a member (staff, stamp card, etc.). */
export async function recordManualVoucherIssue(input: {
  merchantId: string;
  customerId: string;
  promoId: string;
  code: string | null;
  promoName: string;
  issuedBy?: "merchant" | "stamp_card";
}) {
  const now = new Date().toISOString();
  const issuedBy = input.issuedBy ?? "merchant";
  const { error } = await db().from("automation_jobs").insert([
    {
      merchant_id: input.merchantId,
      customer_id: input.customerId,
      job_type: "campaign_issue_voucher",
      run_at: now,
      status: "sent",
      sent_at: now,
      payload: {
        promoId: input.promoId,
        code: input.code,
        promoName: input.promoName,
        issuedBy,
        message: `Issued voucher: ${input.promoName}${input.code ? ` (${input.code})` : ""}`,
      },
    },
  ]);
  if (error) throw new Error(error.message);
}

/**
 * Claims due jobs for this worker.
 *
 * The claim is a conditional update: only rows still `pending` flip to
 * `processing`, and only those come back. A second cron run overlapping this
 * one gets an empty list rather than a second copy of the same sends.
 */
export async function claimDueAutomationJobs(limit = 50): Promise<AutomationJobRow[]> {
  const { data: due, error: dueError } = await db()
    .from("automation_jobs")
    .select("id")
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .order("run_at", { ascending: true })
    .limit(limit);

  if (dueError) throw new Error(dueError.message);
  const ids = (due ?? []).map((row) => (row as { id: string }).id);
  if (ids.length === 0) return [];

  // Deliberately no embedded join here: the claim is the one write that must
  // never fail, and a plain update is the least surprising thing to ask of
  // PostgREST. Slugs are looked up separately, once for the whole batch.
  const { data, error } = await db()
    .from("automation_jobs")
    .update({ status: "processing", claimed_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "pending")
    .select("*");

  if (error) throw new Error(error.message);

  const claimed = (data ?? []) as AutomationJobRow[];
  if (claimed.length === 0) return [];

  const merchantIds = [...new Set(claimed.map((job) => job.merchant_id))];
  const { data: merchants, error: merchantError } = await db()
    .from("merchants")
    .select("id, slug")
    .in("id", merchantIds);
  if (merchantError) throw new Error(merchantError.message);

  const slugById = new Map(
    (merchants ?? []).map((row) => {
      const m = row as { id: string; slug: string };
      return [m.id, m.slug];
    }),
  );

  return claimed.map((job) => ({
    ...job,
    // The incremented count rides along on whatever outcome write follows, so
    // claiming stays one conditional update per batch rather than one per job.
    attempts: Number(job.attempts ?? 0) + 1,
    merchant_slug: slugById.get(job.merchant_id),
  }));
}

/**
 * Jobs whose worker died mid-run. They are failed rather than retried: we
 * cannot tell whether Meta already delivered the message, and sending a
 * marketing message twice costs more than not sending it at all.
 */
export async function failStalledAutomationJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - STALL_MINUTES * 60_000).toISOString();
  const { data, error } = await db()
    .from("automation_jobs")
    .update({
      status: "failed",
      error_message:
        "The sender stopped part-way through this job. Not retried automatically because the message may already have gone out.",
    })
    .eq("status", "processing")
    .lt("claimed_at", cutoff)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/** Puts a failed-but-retryable job back on the queue with a backoff. */
export async function retryAutomationJob(
  jobId: string,
  runAt: Date,
  errorMessage: string,
  attempts: number,
): Promise<void> {
  const { error } = await db()
    .from("automation_jobs")
    .update({
      status: "pending",
      claimed_at: null,
      run_at: runAt.toISOString(),
      error_message: errorMessage,
      attempts,
    })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
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
    else if (status === "pending" || status === "processing") counts.pending += 1;
    else if (status === "cancelled") counts.cancelled += 1;
  }
  return counts;
}

export async function markAutomationJob(
  jobId: string,
  status: "sent" | "failed" | "cancelled",
  errorMessage?: string,
  attempts?: number,
) {
  const { error } = await db()
    .from("automation_jobs")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      error_message: errorMessage ?? null,
      ...(attempts !== undefined && { attempts }),
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
