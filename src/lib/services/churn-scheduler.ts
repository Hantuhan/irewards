import { runCampaignTrigger } from "@/lib/campaigns/workflow-runtime";
import { adminDb } from "@/lib/db/admin";
import { listMarketingMembers } from "@/lib/services/campaign-send";
import { isAutomationEnabled } from "@/lib/services/automation";

function db() {
  return adminDb();
}

const SWEEP_INTERVAL_MS = 23 * 60 * 60 * 1000;

/**
 * Daily sweep behind the "No visit for N days" trigger.
 *
 * The cron endpoint calls this every minute; each merchant is swept at most
 * once a day (`merchants.automation_sweep_at`). Per-campaign day thresholds
 * and the once-per-window cooldown are enforced by the runtime's trigger gate,
 * so this only has to hand each lapsed member to `runCampaignTrigger`.
 */
export async function runInactivitySweep(): Promise<{ merchants: number; fired: number }> {
  const { data: merchants, error } = await db()
    .from("merchants")
    .select("id, retention_enabled, automation_sweep_at");
  if (error) throw new Error(error.message);

  const cutoff = Date.now() - SWEEP_INTERVAL_MS;
  let swept = 0;
  let fired = 0;

  for (const row of merchants ?? []) {
    const merchant = row as {
      id: string;
      retention_enabled?: boolean;
      automation_sweep_at?: string | null;
    };
    if (!isAutomationEnabled(merchant)) continue;
    if (merchant.automation_sweep_at && new Date(merchant.automation_sweep_at).getTime() > cutoff) {
      continue;
    }

    const { data: armed } = await db()
      .from("campaigns")
      .select("id")
      .eq("merchant_id", merchant.id)
      .eq("trigger_type", "no_visit_days")
      .eq("status", "active")
      .limit(1);

    // Stamp the sweep even when nothing is armed so the query stays cheap.
    await db()
      .from("merchants")
      .update({ automation_sweep_at: new Date().toISOString() })
      .eq("id", merchant.id);
    swept += 1;
    if (!armed || armed.length === 0) continue;

    const members = await listMarketingMembers(merchant.id);
    for (const member of members) {
      if (!member.last_visit_at) continue;
      const result = await runCampaignTrigger("no_visit_days", {
        merchantId: merchant.id,
        customer: member,
      });
      fired += result.fired;
    }
  }

  return { merchants: swept, fired };
}
