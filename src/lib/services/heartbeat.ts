/**
 * Background-task heartbeats.
 *
 * Nothing in the app schedules the automation cron — it is an external caller
 * (Zeabur, cron-job.org, Cloudflare). If nobody wires it, campaigns still show
 * "Active" and silently send nothing, which is the worst way for a merchant to
 * find out. Each successful run stamps a heartbeat, and the dashboard alarms
 * when it goes quiet.
 */

import { adminDb } from "@/lib/db/admin";

function db() {
  return adminDb();
}

export const AUTOMATION_TASK = "automation_cron";

/** Automation is considered down after this long without a run. */
export const AUTOMATION_STALE_MINUTES = 30;

export type HeartbeatRow = {
  task: string;
  last_run_at: string;
  last_result: Record<string, unknown> | null;
};

export async function recordHeartbeat(
  task: string,
  result?: Record<string, unknown>,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db()
    .from("system_heartbeats")
    .upsert([{ task, last_run_at: now, last_result: result ?? null, updated_at: now }], {
      onConflict: "task",
    });
  // A heartbeat is diagnostics — never fail the run that produced it.
  if (error) console.error("Failed to record heartbeat:", error.message);
}

export async function getHeartbeat(task: string): Promise<HeartbeatRow | null> {
  const { data, error } = await db()
    .from("system_heartbeats")
    .select("*")
    .eq("task", task)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as HeartbeatRow | null) ?? null;
}

export type AutomationHealth = {
  /** False when the cron has never run, or has not run recently. */
  healthy: boolean;
  /** True when no run has ever been recorded — the cron was never wired up. */
  neverRun: boolean;
  lastRunAt: string | null;
  minutesSinceLastRun: number | null;
  /** Plain-words explanation for the dashboard. Null when healthy. */
  message: string | null;
};

/**
 * Whether automated sending is actually running. Read by the campaigns
 * dashboard so "Active" never means "quietly doing nothing".
 */
export async function getAutomationHealth(): Promise<AutomationHealth> {
  const beat = await getHeartbeat(AUTOMATION_TASK).catch(() => null);

  if (!beat?.last_run_at) {
    return {
      healthy: false,
      neverRun: true,
      lastRunAt: null,
      minutesSinceLastRun: null,
      message:
        "Automated sending has never run. Campaigns marked Active will not send anything until the automation schedule is switched on — ask your installer to set up the automation cron.",
    };
  }

  const minutes = Math.floor((Date.now() - new Date(beat.last_run_at).getTime()) / 60_000);
  if (minutes > AUTOMATION_STALE_MINUTES) {
    return {
      healthy: false,
      neverRun: false,
      lastRunAt: beat.last_run_at,
      minutesSinceLastRun: minutes,
      message: `Automated sending last ran ${formatAgo(minutes)} ago. Scheduled messages are queuing up but not going out — ask your installer to check the automation cron.`,
    };
  }

  return {
    healthy: true,
    neverRun: false,
    lastRunAt: beat.last_run_at,
    minutesSinceLastRun: minutes,
    message: null,
  };
}

function formatAgo(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
