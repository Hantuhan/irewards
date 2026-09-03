import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerById, getMerchantBySlug } from "@/lib/db/repository";
import {
  createRedeemOtp,
  generateRedeemOtpCode,
} from "@/lib/db/redeem-otp-repository";
import { getMemberSessionFromRequest } from "@/lib/customer/session";
import { sendRedeemOtpWhatsApp } from "@/lib/loyalty/redeem-otp-send";

const schema = z.object({
  merchantSlug: z.string().min(1),
});

/**
 * Request a WhatsApp OTP to authorize points redemption.
 * Requires an existing soft/member session (phone already loaded).
 */
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
    if (customer.marketing_opt_out) {
      return NextResponse.json(
        { error: "This number is opted out. Ask staff for help." },
        { status: 403 },
      );
    }
    if (!customer.phone) {
      return NextResponse.json(
        { error: "No WhatsApp number on this membership." },
        { status: 400 },
      );
    }

    const code = generateRedeemOtpCode();
    await createRedeemOtp({
      merchantId: merchant.id,
      customerId: customer.id,
      phone: customer.phone,
      code,
    });

    const send = await sendRedeemOtpWhatsApp({
      merchantId: merchant.id,
      phone: customer.phone,
      code,
      merchantName: merchant.name,
    });

    const masked =
      customer.phone.length > 4
        ? `${"*".repeat(Math.max(0, customer.phone.length - 4))}${customer.phone.slice(-4)}`
        : "****";

    return NextResponse.json({
      ok: true,
      expiresInSec: 5 * 60,
      phoneMasked: masked,
      // Local/dev only — never returned when Meta send is live.
      ...(send.channel === "dev" ? { devCode: code } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send code";
    const status = /too many/i.test(message) ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
