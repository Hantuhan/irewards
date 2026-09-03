import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/merchant/session";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    merchantSlug: session.merchantSlug,
    email: session.email,
    userId: session.userId,
    role: session.role,
    name: session.name,
  });
}
