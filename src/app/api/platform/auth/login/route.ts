import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/auth/login-throttle";
import {
  clearPlatformSessionCookieHeader,
  createPlatformSessionToken,
  platformSessionCookieHeader,
  verifyPlatformAdminPassword,
} from "@/lib/platform/session";

const schema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const key = "platform-admin";
    try {
      assertLoginAllowed(key);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Locked out" },
        { status: 429 },
      );
    }

    if (!verifyPlatformAdminPassword(body.password)) {
      recordLoginFailure(key);
      return NextResponse.json({ error: "Invalid platform password" }, { status: 401 });
    }

    recordLoginSuccess(key);
    const token = createPlatformSessionToken();
    return NextResponse.json(
      { ok: true },
      { headers: { "Set-Cookie": platformSessionCookieHeader(token) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": clearPlatformSessionCookieHeader() } },
  );
}
