import {
  getCustomerById,
  getMerchantBySlug,
  getOrderById,
  touchCustomerVisit,
} from "@/lib/db/repository";
import {
  enqueueAutomationJob,
  getAutomationRule,
  incrementCampaignReach,
  listDueAutomationJobs,
  markAutomationJob,
  recordCampaignEvent,
} from "@/lib/db/automation-repository";
import { getOrderItemsForOrder } from "@/lib/db/merchant-repository";
import { sendSmsMessage, sendWhatsAppMessage } from "@/lib/twilio/outbound";
import type { MerchantRow, OrderRow } from "@/lib/db/types";

export async function schedulePostPaymentJobs(order: OrderRow, merchant: MerchantRow) {
  const reviewRule = await getAutomationRule(merchant.id, "review_nudge");
  if (reviewRule?.enabled) {
    const delayMinutes =
      Number(merchant.google_review_delay_minutes) ||
      Number((reviewRule.config as { delayMinutes?: number })?.delayMinutes) ||
      30;
    await enqueueAutomationJob({
      merchantId: merchant.id,
      orderId: order.id,
      customerId: order.customer_id,
      jobType: "review_nudge",
      runAt: new Date(Date.now() + delayMinutes * 60 * 1000),
      payload: { orderId: order.id },
    });
  }

  const bounceRule = await getAutomationRule(merchant.id, "post_payment_join");
  if (bounceRule?.enabled && order.customer_id) {
    await enqueueAutomationJob({
      merchantId: merchant.id,
      orderId: order.id,
      customerId: order.customer_id,
      jobType: "bounce_back",
      runAt: new Date(Date.now() + 2 * 60 * 1000),
      payload: {
        orderId: order.id,
        discountPercent: Number(merchant.bounce_back_discount_percent) || 20,
        expiryDays: Number(merchant.bounce_back_expiry_days) || 14,
      },
    });
  }
}

export async function processDueAutomationJobs(limit = 50) {
  const jobs = await listDueAutomationJobs(limit);
  let processed = 0;

  for (const job of jobs) {
    try {
      await executeJob(job);
      await markAutomationJob(job.id, "sent");
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Job failed";
      await markAutomationJob(job.id, "failed", message);
    }
  }

  return { processed, total: jobs.length };
}

async function executeJob(job: Awaited<ReturnType<typeof listDueAutomationJobs>>[number]) {
  const merchant = job.merchant_slug
    ? await getMerchantBySlug(job.merchant_slug)
    : null;
  if (!merchant) throw new Error("Merchant not found");

  if (job.job_type === "review_nudge") {
    await runReviewNudge(job, merchant);
    return;
  }
  if (job.job_type === "bounce_back") {
    await runBounceBack(job, merchant);
    return;
  }
  if (job.job_type === "churn_winback") {
    await runChurnWinback(job, merchant);
    return;
  }
  if (job.job_type === "campaign_whatsapp" || job.job_type === "campaign_sms") {
    await runCampaignSend(job);
    return;
  }
}

async function runReviewNudge(
  job: Awaited<ReturnType<typeof listDueAutomationJobs>>[number],
  merchant: MerchantRow,
) {
  const customer = job.customer_id ? await getCustomerById(job.customer_id) : null;
  if (!customer?.phone || customer.marketing_opt_out) return;

  const body = `Hi from ${merchant.name}! How was your visit? Reply 5 if you loved it — we'll send our Google review link. Reply 1-4 and we'll pass feedback to the team privately.`;
  await sendWhatsAppMessage(customer.phone, body);

  if (merchant.google_url) {
    await sendWhatsAppMessage(
      customer.phone,
      `Thanks! Leave us a review: ${merchant.google_url}`,
    );
  }
}

async function runBounceBack(
  job: Awaited<ReturnType<typeof listDueAutomationJobs>>[number],
  merchant: MerchantRow,
) {
  const customer = job.customer_id ? await getCustomerById(job.customer_id) : null;
  if (!customer?.phone || customer.marketing_opt_out || !customer.is_member) return;

  const payload = (job.payload ?? {}) as { discountPercent?: number; expiryDays?: number };
  const discount = payload.discountPercent ?? 20;
  const days = payload.expiryDays ?? 14;
  const code = `BACK${discount}`;

  await sendWhatsAppMessage(
    customer.phone,
    `${merchant.name}: ${discount}% off your next visit! Use code ${code} within ${days} days when you scan our table QR. Reply STOP to opt out.`,
  );
}

async function runChurnWinback(
  job: Awaited<ReturnType<typeof listDueAutomationJobs>>[number],
  merchant: MerchantRow,
) {
  const customer = job.customer_id ? await getCustomerById(job.customer_id) : null;
  if (!customer?.phone || customer.marketing_opt_out) return;

  const favorite = customer.favorite_item_name ?? "your usual";
  await sendWhatsAppMessage(
    customer.phone,
    `We miss you at ${merchant.name}! Your ${favorite} is waiting. Scan any table QR to order. Reply STOP to opt out.`,
  );
}

async function runCampaignSend(
  job: Awaited<ReturnType<typeof listDueAutomationJobs>>[number],
) {
  const payload = job.payload as {
    campaignId?: string;
    phone?: string;
    message?: string;
  };
  if (!payload.phone || !payload.message) return;

  if (job.job_type === "campaign_sms") {
    await sendSmsMessage(payload.phone, payload.message);
  } else {
    await sendWhatsAppMessage(payload.phone, payload.message);
  }

  if (payload.campaignId) {
    await incrementCampaignReach(payload.campaignId);
    await recordCampaignEvent(payload.campaignId, "send");
  }
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
