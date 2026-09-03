/**
 * Automation job worker.
 *
 * Every automated message, point award or voucher is a job queued by the
 * campaign workflow runtime (`@/lib/campaigns/workflow-runtime`). This module
 * drains that queue from the cron endpoint.
 */

import { getCustomerById, getMerchantBySlug, touchCustomerVisit } from "@/lib/db/repository";
import {
  claimDueAutomationJobs,
  failStalledAutomationJobs,
  incrementCampaignReach,
  markAutomationJob,
  recordCampaignEvent,
  retryAutomationJob,
  retryDelayMinutes,
  MAX_JOB_ATTEMPTS,
  type AutomationJobRow,
} from "@/lib/db/automation-repository";
import { getOrderItemsForOrder } from "@/lib/db/merchant-repository";
import type { MerchantRow } from "@/lib/db/types";
import { snapToSendWindow } from "@/lib/campaigns/send-window";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp/outbound";
import { templateValuesFor } from "@/lib/whatsapp/template-spec";
import { resolveApprovedTemplate } from "@/lib/whatsapp/templates";

/** Master switch: pauses every triggered campaign for the merchant (manual broadcasts still send). */
export function isAutomationEnabled(merchant: Pick<MerchantRow, "retention_enabled">): boolean {
  return merchant.retention_enabled !== false;
}

/**
 * A failure that will fail identically next time — a missing template, a
 * cancelled channel. Retrying it just burns queue slots and hides the real
 * problem, so these go straight to `failed` with the reason on the row.
 */
export class PermanentJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}

/** Job types that must never send — either retired bots or paused channels. */
const CANCELLED_JOB_TYPES = new Set([
  "review_nudge",
  "bounce_back",
  "churn_winback",
  "campaign_sms",
]);

export async function processDueAutomationJobs(limit = 50) {
  // Sweep claims left behind by a worker that died mid-run before taking new
  // work, so those rows stop occupying the queue.
  const stalled = await failStalledAutomationJobs().catch((err) => {
    console.error("Stalled job sweep failed:", err);
    return 0;
  });

  const jobs = await claimDueAutomationJobs(limit);
  let processed = 0;
  let cancelled = 0;
  let retried = 0;
  let failed = 0;

  for (const job of jobs) {
    if (CANCELLED_JOB_TYPES.has(job.job_type)) {
      const reason =
        job.job_type === "campaign_sms"
          ? "SMS is paused — use WhatsApp campaigns instead"
          : "Retired bot job — journeys now run as campaigns";
      await markAutomationJob(job.id, "cancelled", reason, job.attempts);
      cancelled += 1;
      continue;
    }
    try {
      const outcome = await executeJob(job);
      if (outcome.status === "cancelled") {
        await markAutomationJob(job.id, "cancelled", outcome.reason, job.attempts);
        cancelled += 1;
      } else {
        await markAutomationJob(job.id, "sent", undefined, job.attempts);
        processed += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Job failed";
      const permanent = err instanceof PermanentJobError;

      if (!permanent && job.attempts < MAX_JOB_ATTEMPTS) {
        await scheduleRetry(job, message);
        retried += 1;
      } else {
        await markAutomationJob(
          job.id,
          "failed",
          permanent ? message : `${message} (gave up after ${job.attempts} attempts)`,
          job.attempts,
        );
        failed += 1;
      }
    }
  }

  return { processed, cancelled, retried, failed, stalled, total: jobs.length };
}

/**
 * Puts a job back on the queue after a transient failure. Messaging jobs are
 * re-snapped to the merchant's send window so a retry can't land at 3am.
 */
async function scheduleRetry(job: AutomationJobRow, message: string) {
  const delayMs = retryDelayMinutes(job.attempts) * 60_000;
  let runAt = new Date(Date.now() + delayMs);

  if (job.job_type === "campaign_whatsapp" || job.job_type === "campaign_sms") {
    const merchant = job.merchant_slug ? await getMerchantBySlug(job.merchant_slug) : null;
    if (merchant) {
      runAt = snapToSendWindow(runAt, {
        start: merchant.campaign_send_window_start ?? null,
        end: merchant.campaign_send_window_end ?? null,
        timezone: merchant.timezone || "Asia/Kuala_Lumpur",
      });
    }
  }

  await retryAutomationJob(
    job.id,
    runAt,
    `${message} — retrying (attempt ${job.attempts} of ${MAX_JOB_ATTEMPTS})`,
    job.attempts,
  );
}

type JobOutcome = { status: "sent" } | { status: "cancelled"; reason: string };

async function executeJob(job: AutomationJobRow): Promise<JobOutcome> {
  const merchant = job.merchant_slug ? await getMerchantBySlug(job.merchant_slug) : null;
  if (!merchant) throw new Error("Merchant not found");

  switch (job.job_type) {
    case "campaign_whatsapp":
      return runCampaignSend(job, merchant);
    case "campaign_award_points":
      await runCampaignAwardPoints(job);
      return { status: "sent" };
    case "campaign_issue_voucher":
      // The voucher code is delivered inside the campaign's message; the job
      // only exists so reporting can count the issue.
      if (typeof job.payload?.campaignId === "string") {
        await recordCampaignEvent(job.payload.campaignId, "conversion");
      }
      return { status: "sent" };
    default:
      throw new PermanentJobError(`Unknown job type ${job.job_type}`);
  }
}

async function runCampaignAwardPoints(job: AutomationJobRow) {
  const payload = job.payload as { campaignId?: string; points?: number; reason?: string };
  const points = Number(payload.points ?? 0);
  if (!job.customer_id || points <= 0) return;

  const customer = await getCustomerById(job.customer_id);
  if (!customer?.is_member) return;

  const { awardPointsToCustomer } = await import("@/lib/db/repository");
  await awardPointsToCustomer({
    customer,
    orderId: job.order_id ?? null,
    points,
    reason: payload.reason?.trim() || "campaign_bonus",
  });

  if (payload.campaignId) await recordCampaignEvent(payload.campaignId, "conversion");
}

/**
 * Campaign sends. WhatsApp always goes out as the campaign's Meta-approved
 * template; a job whose copy has no approved template fails with a clear
 * reason and is never sent as free text.
 */
async function runCampaignSend(job: AutomationJobRow, merchant: MerchantRow): Promise<JobOutcome> {
  const payload = job.payload as {
    campaignId?: string;
    phone?: string;
    message?: string;
    code?: string;
  };
  if (!payload.phone || !payload.message) {
    return { status: "cancelled", reason: "Missing phone or message" };
  }

  const customer = job.customer_id ? await getCustomerById(job.customer_id) : null;
  if (customer?.marketing_opt_out) {
    return { status: "cancelled", reason: "Member opted out after queue" };
  }

  // Win-back / delayed journeys: if they visited again since we queued, don't nag.
  if (payload.campaignId && customer?.last_visit_at) {
    const { getCampaignById } = await import("@/lib/services/campaign-send");
    const campaign = await getCampaignById(merchant.id, payload.campaignId);
    if (campaign?.trigger_type === "no_visit_days") {
      const lastVisit = new Date(customer.last_visit_at).getTime();
      const queuedAt = new Date(job.created_at).getTime();
      if (lastVisit >= queuedAt) {
        return { status: "cancelled", reason: "Member visited again before send" };
      }
    }
  }

  // Re-check frequency cap at send time so long waits can't bypass it.
  const capHours = Number(merchant.campaign_send_cap_hours ?? 48);
  if (customer?.id && capHours > 0) {
    const { memberRecentlyMessaged } = await import("@/lib/db/campaign-analytics-repository");
    if (
      await memberRecentlyMessaged(merchant.id, customer.id, capHours, {
        excludeJobId: job.id,
      })
    ) {
      return { status: "cancelled", reason: `Member messaged within ${capHours}h` };
    }
  }

  const values = {
    merchant: merchant.name,
    name: customer?.display_name ?? "",
    code: payload.code ?? "",
  };

  const template = payload.campaignId
    ? await resolveApprovedTemplate(payload.campaignId, payload.message)
    : null;
  if (!template) {
    // Business-initiated messages must use an approved template. Sending
    // free text here would just be rejected by Meta and count against us.
    throw new PermanentJobError(
      "Not sent: the campaign's WhatsApp copy has no approved Meta template (or it changed after approval).",
    );
  }
  await sendWhatsAppTemplateMessage(merchant.id, payload.phone, {
    name: template.name,
    language: template.language,
    bodyParams: templateValuesFor(template.variables, values),
    headerImageUrl: template.headerImageUrl,
  });

  if (payload.campaignId) {
    await incrementCampaignReach(payload.campaignId);
    await recordCampaignEvent(payload.campaignId, "send");
  }

  return { status: "sent" };
}

export async function updateCustomerVisitAndUsual(orderId: string, customerId: string) {
  const items = await getOrderItemsForOrder(orderId);
  const topItem = items[0];
  const usualOrder = items.map((i) => ({ name: i.name, quantity: i.quantity }));

  await touchCustomerVisit(customerId, {
    lastVisitAt: new Date().toISOString(),
    favoriteItemName: topItem?.name ?? null,
    usualOrder,
  });
}
