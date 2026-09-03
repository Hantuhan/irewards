import { NextResponse } from "next/server";
import { sqlHealthcheck } from "@/lib/db/sql";

/**
 * DB health for ops. Uses Hyperdrive on Workers when bound, else DATABASE_URL.
 * App queries use InsForge via adminDb().
 */
export async function GET() {
  try {
    const result = await sqlHealthcheck();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "DB unreachable";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
