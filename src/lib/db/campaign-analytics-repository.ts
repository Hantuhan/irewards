import { createInsforgeAdmin } from "@/lib/insforge/client";

function db() {
  return createInsforgeAdmin().database;
}

export type CampaignEventCounts = {
  impression: number;
  click: number;
  send: number;
  conversion: number;
  redeem: number;
};

export async function countCampaignEvents(campaignId: string): Promise<CampaignEventCounts> {
  const { data, error } = await db()
    .from("campaign_events")
    .select("event_type")
    .eq("campaign_id", campaignId);

  if (error) throw new Error(error.message);

  const counts: CampaignEventCounts = {
    impression: 0,
    click: 0,
    send: 0,
    conversion: 0,
    redeem: 0,
  };
  for (const row of data ?? []) {
    const t = (row as { event_type: string }).event_type;
    if (t in counts) counts[t as keyof CampaignEventCounts] += 1;
  }
  return counts;
}

export async function countCampaignRedemptions(campaignId: string): Promise<number> {
  const { data: promos, error: promoError } = await db()
    .from("promos")
    .select("id")
    .eq("campaign_id", campaignId);
  if (promoError) throw new Error(promoError.message);
  const ids = (promos ?? []).map((p) => (p as { id: string }).id);
  if (ids.length === 0) return 0;

  const { count, error } = await db()
    .from("promo_redemptions")
    .select("id", { count: "exact", head: true })
    .in("promo_id", ids);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Daily send counts for the last N days (from campaign_events). */
export async function dailyCampaignSends(
  campaignId: string,
  days = 12,
): Promise<{ label: string; value: number; tone: "default" | "peak" | "today" }[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await db()
    .from("campaign_events")
    .select("created_at")
    .eq("campaign_id", campaignId)
    .eq("event_type", "send")
    .gte("created_at", since);
  if (error) throw new Error(error.message);

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of data ?? []) {
    const key = String((row as { created_at: string }).created_at).slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const entries = [...buckets.entries()];
  const max = Math.max(...entries.map(([, v]) => v), 0);
  return entries.map(([key, value], i) => ({
    label: i === entries.length - 1 ? "Today" : key.slice(5),
    value,
    tone: (value === max && max > 0 ? "peak" : i === entries.length - 1 ? "today" : "default") as
      | "default"
      | "peak"
      | "today",
  }));
}

/**
 * True when this member already received (or has a pending) auto WhatsApp/SMS
 * send within the last `capHours` (any campaign for this merchant).
 */
export async function memberRecentlyMessaged(
  merchantId: string,
  customerId: string,
  capHours: number,
  options?: { excludeJobId?: string },
): Promise<boolean> {
  if (capHours <= 0) return false;
  const since = new Date(Date.now() - capHours * 3_600_000).toISOString();
  let query = db()
    .from("automation_jobs")
    .select("id")
    .eq("merchant_id", merchantId)
    .eq("customer_id", customerId)
    .in("job_type", ["campaign_whatsapp", "campaign_sms"])
    .in("status", ["pending", "sent"])
    .gte("created_at", since)
    .limit(1);
  if (options?.excludeJobId) {
    query = query.neq("id", options.excludeJobId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
