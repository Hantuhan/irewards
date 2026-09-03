import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantUserByEmail } from "@/lib/db/merchant-repository";
import { assertPasswordStrength } from "@/lib/merchant/password";
import { createSessionToken, sessionCookieHeader } from "@/lib/merchant/session";
import { merchantPublicOrigin } from "@/lib/tenancy/host";
import { provisionMerchant } from "@/lib/tenancy/provision";
import { slugifyMerchantName } from "@/lib/tenancy/slug";

const signupSchema = z.object({
  cafeName: z.string().trim().min(2).max(80),
  currency: z.enum(["MYR", "SGD"]),
  ownerName: z.string().trim().min(1).max(80),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(12),
  subdomain: z.string().trim().min(2).max(48).optional(),
});

export async function POST(request: Request) {
  try {
    const body = signupSchema.parse(await request.json());
    assertPasswordStrength(body.ownerPassword);

    const preferred = body.subdomain?.toLowerCase() || slugifyMerchantName(body.cafeName);
    const result = await provisionMerchant({
      cafeName: body.cafeName,
      currency: body.currency,
      ownerName: body.ownerName,
      ownerEmail: body.ownerEmail,
      ownerPassword: body.ownerPassword,
      subdomain: preferred,
    });

    const owner = await getMerchantUserByEmail(result.ownerEmail);
    if (!owner) {
      return NextResponse.json({ error: "Merchant created but login session failed" }, { status: 500 });
    }

    const sessionToken = createSessionToken({
      merchantId: result.merchant.id,
      merchantSlug: result.merchant.slug,
      email: owner.email,
      userId: owner.id,
      role: "owner",
      name: owner.name,
    });

    return NextResponse.json(
      {
        merchant: {
          slug: result.merchant.slug,
          name: result.merchant.name,
          subdomain: result.subdomain,
          portalUrl: merchantPublicOrigin(result.subdomain),
          dashboardPath: `/dashboard/${result.merchant.slug}`,
        },
        user: { email: result.ownerEmail, role: "owner" },
      },
      { headers: { "Set-Cookie": sessionCookieHeader(sessionToken) } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Signup failed";
    const status =
      message.toLowerCase().includes("already") ||
      message.toLowerCase().includes("reserved") ||
      message.toLowerCase().includes("weak") ||
      message.toLowerCase().includes("subdomain")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
