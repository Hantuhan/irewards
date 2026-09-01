import { NextResponse } from "next/server";
import { processDueAutomationJobs } from "@/lib/services/automation";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "irewards-dev-cron";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueAutomationJobs();
  return NextResponse.json(result);
}
