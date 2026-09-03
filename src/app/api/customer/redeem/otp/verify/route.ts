import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerById, getMerchantBySlug } from "@/lib/db/repository";
import { verifyAndConsumeRedeemOtp } from "@/lib/db/redeem-otp-repository";
import { getMemberSessionFromRequest } from "@/lib/customer/session";
import {
  createRedeemAuthToken,
  redeemAuthCookieHeader,
} from "@/lib/customer/redeem-session";

const schema = z.object({
  merchantSlug: z.string().min(1),
  code: z.string().trim().regex(/^\d{4}$/, "Enter the 4-digit code"),
});

/** Verify WhatsApp OTP and set a short-lived redeem-authorized cookie. */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const session = getMemberSessionFromRequest(request);
    if (!session || session.merchantSlug !== body.merchantSlug) {
      return NextResponse.json(
        { error: "Load your points with your mobile number first." },
        { status: 401 },
      );
    }

    const merchant = await getMerchantBySlug(body.merchantSlug);
    if (!merchant || merchant.id !== session.merchantId) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const customer = await getCustomerById(session.customerId);
    if (!customer?.is_member || customer.merchant_id !== merchant.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const result = await verifyAndConsumeRedeemOtp({
      customerId: customer.id,
      code: body.code,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const token = createRedeemAuthToken({
      customerId: customer.id,
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
    });

    return NextResponse.json(
      {
        ok: true,
        redeemAuthorized: true,
        points: customer.points_balance,
      },
      { headers: { "Set-Cookie": redeemAuthCookieHeader(token) } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid code" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
