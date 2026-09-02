import { NextResponse } from "next/server";
import { processDueAutomationJobs } from "@/lib/services/automation";
import { runInactivitySweep } from "@/lib/services/churn-scheduler";
import { refreshNumberHealth } from "@/lib/whatsapp/number-health";
import { refreshPendingTemplates } from "@/lib/whatsapp/templates";

export async function POST(request: Request) {
  const isProd = process.env.NODE_ENV === "production";
  const secret =
    process.env.CRON_SECRET ?? (isProd ? "" : "irewards-dev-cron");
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }
  if (isProd && secret === "irewards-dev-cron") {
    return NextResponse.json(
      { error: "Refusing default CRON_SECRET in production" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await refreshPendingTemplates();
  const number = await refreshNumberHealth().catch((err) => ({
    checked: false,
    quality: null,
    error: err instanceof Error ? err.message : "failed",
  }));
  const sweep = await runInactivitySweep();
  const jobs = await processDueAutomationJobs(100);

  return NextResponse.json({ templates, number, sweep, jobs });
}
