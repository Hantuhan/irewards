import { adminDb } from "@/lib/db/admin";
import type { CampaignRow, CustomerRow } from "@/lib/db/types";
import { enqueueAutomationJob } from "@/lib/db/automation-repository";
import { createPromo, getPromoByCode } from "@/lib/db/merchant-repository";
import { memberRecentlyMessaged } from "@/lib/db/campaign-analytics-repository";
import { snapToSendWindow } from "@/lib/campaigns/send-window";
import {
  asWhatsAppTemplate,
  asWorkflow,
  renderWhatsAppTemplate,
  type CampaignNode,
  type CampaignTriggerType,
  type CampaignWorkflow,
} from "@/lib/campaigns/workflow-spec";

function db() {
  return adminDb();
}

export type TriggerContext = {
  merchantId: string;
  customer?: CustomerRow | null;
  orderId?: string | null;
  /** Order total in cents, when the event carries one. */
  orderTotalCents?: number;
  /** Where a member_joined event came from. */
  source?: "storefront" | "receipt";
  /** True when this is the member's first ever opt-in. */
  firstJoin?: boolean;
  /** Reward level name resolved by the caller, used by member_tier. */
  tierName?: string;
  /** Lifetime visit count, used by visit_count. */
  visitCount?: number;
  /** Lifetime spend in cents, used by spend_amount. */
  lifetimeSpendCents?: number;
  /** Lifetime points before the award that raised this event, used by points_milestone. */
  previousLifetimePoints?: number;
  /** Merchant IANA timezone for day_of_week / send-window evaluation. */
  timezone?: string;
};

/**
 * Entry point for every storefront/loyalty event. Loads active campaigns armed
 * with this trigger, evaluates their conditions against the member, and queues
 * the resulting actions on the existing automation job queue.
 *
 * Never throws — a campaign misconfiguration must not break checkout or join.
 */
export async function runCampaignTrigger(
  trigger: CampaignTriggerType,
  context: TriggerContext,
): Promise<{ fired: number }> {
  try {
    if (trigger !== "manual" && !(await automationsEnabled(context.merchantId))) {
      return { fired: 0 };
    }

    const campaigns = await listArmedCampaigns(context.merchantId, trigger);
    let fired = 0;

    for (const campaign of campaigns) {
      const workflow = asWorkflow(campaign.workflow, campaign.channel);
      const enriched = await enrichTriggerContext(context, workflow);
      const skipReason = await triggerSkipReason(campaign, workflow, enriched);
      if (skipReason) {
        await recordRun(campaign.id, enriched.customer?.id ?? null, trigger, false, skipReason);
        continue;
      }

      const failed = workflow.conditions.find(
        (condition) => !evaluateCondition(condition, enriched),
      );
      const branch = failed ? workflow.elseActions : workflow.actions;

      if (branch.length === 0) {
        await recordRun(
          campaign.id,
          enriched.customer?.id ?? null,
          trigger,
          false,
          failed ? `condition ${failed.type} not met` : "no actions",
        );
        continue;
      }

      const queued = await queueActions(campaign, branch, enriched);
      if (queued.skipReason) {
        await recordRun(
          campaign.id,
          enriched.customer?.id ?? null,
          trigger,
          false,
          queued.skipReason,
        );
        continue;
      }
      await recordRun(campaign.id, enriched.customer?.id ?? null, trigger, true, null);
      fired += 1;
    }

    return { fired };
  } catch (error) {
    console.error(`Campaign trigger "${trigger}" failed:`, error);
    return { fired: 0 };
  }
}

async function listArmedCampaigns(
  merchantId: string,
  trigger: CampaignTriggerType,
): Promise<CampaignRow[]> {
  const { data, error } = await db()
    .from("campaigns")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("trigger_type", trigger)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignRow[];
}

/** The merchant's "pause all automated campaigns" switch. */
async function automationsEnabled(merchantId: string): Promise<boolean> {
  const { data } = await db()
    .from("merchants")
    .select("retention_enabled")
    .eq("id", merchantId)
    .maybeSingle();
  return (data as { retention_enabled?: boolean } | null)?.retention_enabled !== false;
}

/** True when this campaign already fired for the member since `since` (null = ever). */
async function hasMatchedRun(
  campaignId: string,
  customerId: string,
  since: Date | null,
): Promise<boolean> {
  let query = db()
    .from("campaign_workflow_runs")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("customer_id", customerId)
    .eq("matched", true)
    .limit(1);
  if (since) query = query.gte("created_at", since.toISOString());
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/** Trigger-level gates that run before conditions. */
async function triggerSkipReason(
  campaign: CampaignRow,
  workflow: CampaignWorkflow,
  context: TriggerContext,
): Promise<string | null> {
  const config = workflow.trigger.config;

  switch (workflow.trigger.type) {
    case "member_joined": {
      const source = String(config.source ?? "any");
      if (source !== "any" && context.source && source !== context.source) {
        return `source is ${context.source}, campaign wants ${source}`;
      }
      if (config.firstTimeOnly !== false && context.firstJoin === false) {
        return "not a first-time join";
      }
      return null;
    }
    case "storefront_opened":
      if (config.newVisitorsOnly === true && context.customer?.last_visit_at) {
        return "returning visitor";
      }
      return null;
    case "order_paid": {
      const minSpend = Number(config.minSpend ?? 0);
      if (minSpend > 0 && (context.orderTotalCents ?? 0) < minSpend) {
        return "order below minimum spend";
      }
      return null;
    }
    case "points_milestone": {
      const threshold = Number(config.points ?? 0);
      const now = context.customer?.lifetime_points_earned ?? 0;
      if (now < threshold) return "points below milestone";
      if (context.previousLifetimePoints !== undefined && context.previousLifetimePoints >= threshold) {
        return "milestone already passed";
      }
      // A milestone is crossed once per member, ever.
      if (context.customer && (await hasMatchedRun(campaign.id, context.customer.id, null))) {
        return "milestone already celebrated";
      }
      return null;
    }
    case "no_visit_days": {
      const days = Math.max(1, Number(config.days ?? 30));
      const lastVisit = context.customer?.last_visit_at
        ? new Date(context.customer.last_visit_at).getTime()
        : null;
      if (lastVisit === null) return "no visit on record";
      const windowMs = days * 86_400_000;
      if (Date.now() - lastVisit < windowMs) return `visited within ${days} days`;
      // Once per inactivity window, so a lapsed member isn't nagged daily.
      if (
        context.customer &&
        (await hasMatchedRun(campaign.id, context.customer.id, new Date(Date.now() - windowMs)))
      ) {
        return "already messaged this window";
      }
      return null;
    }
    default:
      return null;
  }
}

export function evaluateCondition(condition: CampaignNode, context: TriggerContext): boolean {
  const customer = context.customer;
  const config = condition.config;
  const comparator = String(config.comparator ?? "gte");
  const compare = (actual: number, target: number) =>
    comparator === "lte" ? actual <= target : actual >= target;

  switch (condition.type) {
    case "member_tier": {
      const wanted = String(config.tier ?? "").trim();
      if (!wanted) return true;
      return (context.tierName ?? "").toLowerCase() === wanted.toLowerCase();
    }
    case "spend_amount":
      return compare(context.lifetimeSpendCents ?? 0, Number(config.amount ?? 0));
    case "visit_count":
      return compare(context.visitCount ?? 0, Number(config.count ?? 0));
    case "lifetime_points":
      return compare(customer?.lifetime_points_earned ?? 0, Number(config.points ?? 0));
    case "has_phone":
      return Boolean(customer?.phone);
    case "marketing_opted_in":
      return Boolean(customer) && customer?.marketing_opt_out !== true;
    case "day_of_week": {
      const days = String(config.days ?? "any");
      if (days === "any") return true;
      const day = localWeekday(context.timezone || "Asia/Kuala_Lumpur");
      const isWeekend = day === 0 || day === 6;
      return days === "weekend" ? isWeekend : !isWeekend;
    }
    default:
      return true;
  }
}

/**
 * Walks the action list, accumulating `wait` steps into each job's run_at so a
 * "wait 1 hour then message" workflow lands on the queue as a delayed job.
 */
async function queueActions(
  campaign: CampaignRow,
  actions: CampaignNode[],
  context: TriggerContext,
): Promise<{ skipReason: string | null }> {
  let delayMs = 0;

  const voucher = actions.find((a) => a.type === "issue_voucher");
  const code = voucher ? await ensureCampaignVoucher(campaign, voucher) : undefined;

  const { data: merchantRow } = await db()
    .from("merchants")
    .select(
      "timezone, campaign_send_window_start, campaign_send_window_end, campaign_send_cap_hours",
    )
    .eq("id", context.merchantId)
    .maybeSingle();
  const merchant = merchantRow as {
    timezone?: string | null;
    campaign_send_window_start?: string | null;
    campaign_send_window_end?: string | null;
    campaign_send_cap_hours?: number | null;
  } | null;

  const capHours = Number(merchant?.campaign_send_cap_hours ?? 48);
  if (
    context.customer?.id &&
    capHours > 0 &&
    actions.some((a) => a.type === "send_whatsapp" || a.type === "send_sms")
  ) {
    if (await memberRecentlyMessaged(context.merchantId, context.customer.id, capHours)) {
      return { skipReason: `member messaged within ${capHours}h` };
    }
  }

  let messagingAttempted = 0;
  let messagingQueued = 0;

  for (const action of actions) {
    if (action.type === "wait") {
      delayMs += waitDurationMs(action);
      continue;
    }

    const jobType = JOB_TYPE_BY_ACTION[action.type];
    if (!jobType) continue;

    let runAt = new Date(Date.now() + delayMs);
    if (jobType === "campaign_whatsapp" || jobType === "campaign_sms") {
      runAt = snapToSendWindow(runAt, {
        start: merchant?.campaign_send_window_start ?? null,
        end: merchant?.campaign_send_window_end ?? null,
        timezone: merchant?.timezone || context.timezone || "Asia/Kuala_Lumpur",
      });
    }

    if (jobType === "campaign_whatsapp" || jobType === "campaign_sms") {
      messagingAttempted += 1;
      if (jobType === "campaign_sms") {
        // SMS channel is paused — do not enqueue.
        continue;
      }
      const phone = context.customer?.phone;
      if (!phone || context.customer?.marketing_opt_out) continue;

      await enqueueAutomationJob({
        merchantId: context.merchantId,
        orderId: context.orderId ?? undefined,
        customerId: context.customer?.id,
        jobType,
        runAt,
        payload: {
          campaignId: campaign.id,
          phone,
          message: renderActionMessage(action),
          ...(code && { code }),
        },
      });
      messagingQueued += 1;
      continue;
    }

    await enqueueAutomationJob({
      merchantId: context.merchantId,
      orderId: context.orderId ?? undefined,
      customerId: context.customer?.id,
      jobType,
      runAt,
      payload: { campaignId: campaign.id, ...action.config },
    });
  }

  if (messagingAttempted > 0 && messagingQueued === 0) {
    return { skipReason: "no phone, opted out, or SMS paused" };
  }

  return { skipReason: null };
}

const JOB_TYPE_BY_ACTION: Record<string, string | undefined> = {
  send_whatsapp: "campaign_whatsapp",
  send_sms: "campaign_sms",
  award_points: "campaign_award_points",
  issue_voucher: "campaign_issue_voucher",
  // Banners are read from the campaign row by the storefront, not queued.
  show_banner: undefined,
};

/**
 * Voucher codes are short and readable at the counter: the voucher name's
 * letters plus the discount, e.g. COMEBACK20. Created once per campaign;
 * later runs find it by code.
 */
export function campaignVoucherCode(campaign: CampaignRow, action: CampaignNode): string {
  const name = String(action.config.name ?? "").replace(/[^a-z]/gi, "").toUpperCase().slice(0, 8) || "PERK";
  const discount = Math.round(Number(action.config.discountPercent ?? 20));
  const short = campaign.id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${name}${discount}${short}`;
}

async function ensureCampaignVoucher(campaign: CampaignRow, action: CampaignNode): Promise<string> {
  const code = campaignVoucherCode(campaign, action);
  const existing = await getPromoByCode(campaign.merchant_id, code);
  if (existing) return code;

  const expiryDays = Math.max(1, Number(action.config.expiryDays ?? 14));
  await createPromo(campaign.merchant_id, {
    name: `${String(action.config.name ?? "Campaign perk").trim() || "Campaign perk"} · ${campaign.name}`,
    code,
    type: "percentage",
    value: Math.min(100, Math.max(1, Number(action.config.discountPercent ?? 20))),
    minSpendCents: null,
    expiresAt: new Date(Date.now() + expiryDays * 86_400_000).toISOString(),
    campaignId: campaign.id,
  });
  return code;
}

function waitDurationMs(action: CampaignNode): number {
  const amount = Number(action.config.amount ?? 1);
  const unit = String(action.config.unit ?? "hours");
  const multiplier = unit === "minutes" ? 60_000 : unit === "days" ? 86_400_000 : 3_600_000;
  return Math.max(0, amount) * multiplier;
}

function renderActionMessage(action: CampaignNode): string {
  if (action.type === "send_whatsapp") {
    return renderWhatsAppTemplate(asWhatsAppTemplate(action.config.template));
  }
  const body = String(action.config.body ?? "").trim();
  return action.config.includeOptOut === false ? body : `${body}\n\nReply STOP to opt out.`;
}

/** 0 = Sunday … 6 = Saturday in the merchant's local calendar. */
function localWeekday(timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date());
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? new Date().getDay();
}

async function enrichTriggerContext(
  context: TriggerContext,
  workflow: CampaignWorkflow,
): Promise<TriggerContext> {
  const next: TriggerContext = { ...context };
  const conditions = workflow.conditions;

  if (!next.timezone) {
    const { data } = await db()
      .from("merchants")
      .select("timezone")
      .eq("id", context.merchantId)
      .maybeSingle();
    next.timezone =
      (data as { timezone?: string | null } | null)?.timezone || "Asia/Kuala_Lumpur";
  }

  const needsStats = conditions.some(
    (c) => c.type === "spend_amount" || c.type === "visit_count",
  );
  if (
    context.customer?.id &&
    needsStats &&
    (next.visitCount === undefined || next.lifetimeSpendCents === undefined)
  ) {
    const stats = await customerPaidOrderStats(context.customer.id);
    next.visitCount = next.visitCount ?? stats.visitCount;
    next.lifetimeSpendCents = next.lifetimeSpendCents ?? stats.lifetimeSpendCents;
  }

  const needsTier = conditions.some(
    (c) => c.type === "member_tier" && String(c.config.tier ?? "").trim(),
  );
  if (context.customer && !next.tierName && needsTier) {
    const { getCustomerTierForMerchant } = await import("@/lib/services/loyalty-points");
    const tier = await getCustomerTierForMerchant(context.customer, context.merchantId);
    next.tierName = tier.current.name;
  }

  return next;
}

async function customerPaidOrderStats(
  customerId: string,
): Promise<{ visitCount: number; lifetimeSpendCents: number }> {
  const { data, error } = await db()
    .from("orders")
    .select("total_cents")
    .eq("customer_id", customerId)
    .eq("status", "paid");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { total_cents: number }[];
  return {
    visitCount: rows.length,
    lifetimeSpendCents: rows.reduce((sum, row) => sum + Number(row.total_cents ?? 0), 0),
  };
}

/**
 * Whether an active banner campaign's workflow conditions pass right now.
 * Used by the storefront banner API (banners are not queued as jobs).
 */
export function bannerWorkflowAllowsDisplay(
  campaign: CampaignRow,
  context: TriggerContext,
): boolean {
  const workflow = asWorkflow(campaign.workflow, "banner");
  const failed = workflow.conditions.find((condition) => !evaluateCondition(condition, context));
  if (!failed) return workflow.actions.some((a) => a.type === "show_banner");
  return workflow.elseActions.some((a) => a.type === "show_banner");
}

async function recordRun(
  campaignId: string,
  customerId: string | null,
  triggerType: string,
  matched: boolean,
  skipReason: string | null,
) {
  const { error } = await db()
    .from("campaign_workflow_runs")
    .insert([
      {
        campaign_id: campaignId,
        customer_id: customerId,
        trigger_type: triggerType,
        matched,
        skip_reason: skipReason,
      },
    ]);

  if (error) console.error("Failed to record campaign run:", error.message);
}
