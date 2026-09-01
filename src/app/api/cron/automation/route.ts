import { NextResponse } from "next/server";
import { processDueAutomationJobs } from "@/lib/services/automation";
import { scheduleChurnWinbackForAllMerchants } from "@/lib/services/churn-scheduler";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "irewards-dev-cron";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const churn = await scheduleChurnWinbackForAllMerchants();
  const jobs = await processDueAutomationJobs(100);

  return NextResponse.json({ churn, jobs });
}
