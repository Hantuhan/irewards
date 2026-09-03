import { NextResponse } from "next/server";

/** Liveness probe for Zeabur / load balancers. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "irewards" });
}
