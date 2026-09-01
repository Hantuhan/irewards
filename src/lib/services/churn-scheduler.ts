import { createInsforgeAdmin } from "@/lib/insforge/client";
import { getAutomationRule, enqueueAutomationJob } from "@/lib/db/automation-repository";
import { hasRecentChurnJob, listMarketingMembers } from "@/lib/services/campaign-send";

function db() {
  return createInsforgeAdmin().database;
}

/** Run from cron — enqueue churn win-back for lapsed members. */
export async function scheduleChurnWinbackForAllMerchants(): Promise<{ queued: number }> {
  const { data: merchants, error } = await db().from("merchants").select("id, slug");
  if (error) throw new Error(error.message);

  let queued = 0;

  for (const merchant of merchants ?? []) {
    const rule = await getAutomationRule(merchant.id as string, "churn_winback");
    if (!rule?.enabled) continue;

    const config = (rule.config ?? {}) as { inactiveDays?: number };
    const inactiveDays = config.inactiveDays ?? 30;
    const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

    const members = await listMarketingMembers(merchant.id as string);
    for (const member of members) {
      if (!member.last_visit_at) continue;
      if (new Date(member.last_visit_at) > cutoff) continue;
      if (await hasRecentChurnJob(merchant.id as string, member.id)) continue;

      await enqueueAutomationJob({
        merchantId: merchant.id as string,
        customerId: member.id,
        jobType: "churn_winback",
        runAt: new Date(),
        payload: { memberId: member.id },
      });
      queued += 1;
    }
  }

  return { queued };
}
