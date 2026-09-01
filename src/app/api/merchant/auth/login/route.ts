import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantUserByEmail } from "@/lib/db/merchant-repository";
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
    const user = await getMerchantUserByEmail(body.email);
    if (!user || !verifyPassword(body.password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = createSessionToken({
      merchantId: user.merchant.id,
      merchantSlug: user.merchant.slug,
      email: user.email,
    });

    return NextResponse.json(
      {
        merchant: {
          slug: user.merchant.slug,
          name: user.merchant.name,
        },
        user: { email: user.email, name: user.name },
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
