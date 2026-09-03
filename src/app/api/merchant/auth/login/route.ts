import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/auth/login-throttle";
import { getMerchantUserByEmail, touchMerchantUserLogin } from "@/lib/db/merchant-repository";
import { verifyPassword } from "@/lib/merchant/password";
import {
  clearSessionCookieHeader,
  createSessionToken,
  sessionCookieHeader,
} from "@/lib/merchant/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const key = `merchant:${body.email.toLowerCase()}`;
    try {
      assertLoginAllowed(key);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Locked out" },
        { status: 429 },
      );
    }

    const user = await getMerchantUserByEmail(body.email);
    if (!user || !verifyPassword(body.password, user.password_hash)) {
      recordLoginFailure(key);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.merchant.suspended_at) {
      recordLoginFailure(key);
      return NextResponse.json(
        { error: "This cafe portal is suspended. Contact iRewards support." },
        { status: 403 },
      );
    }

    recordLoginSuccess(key);
    const role = user.role === "manager" || user.role === "staff" ? user.role : "owner";
    const token = createSessionToken({
      merchantId: user.merchant.id,
      merchantSlug: user.merchant.slug,
      email: user.email,
      userId: user.id,
      role,
      name: user.name,
    });

    void touchMerchantUserLogin(user.id).catch(() => undefined);

    return NextResponse.json(
      {
        merchant: {
          slug: user.merchant.slug,
          name: user.merchant.name,
          subdomain: user.merchant.subdomain ?? user.merchant.slug,
        },
        user: { id: user.id, email: user.email, name: user.name, role },
      },
      { headers: { "Set-Cookie": sessionCookieHeader(token) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": clearSessionCookieHeader() } },
  );
}
