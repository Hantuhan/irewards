import { NextResponse } from "next/server";
import { isDeepseekConfigured } from "@/lib/ai/deepseek";

export async function GET() {
  return NextResponse.json({
    provider: "deepseek",
    configured: isDeepseekConfigured(),
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  });
}
