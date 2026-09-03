import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerByPhone, getMerchantBySlug } from "@/lib/db/repository";
import { createRedeemOtp, generateRedeemOtpCode } from "@/lib/db/redeem-otp-repository";
import { isPlausiblePhone, normalizePhone } from "@/lib/loyalty/phone";
import { sendRedeemOtpWhatsApp } from "@/lib/loyalty/redeem-otp-send";
import {
  checkRateLimit,
  rateLimitedResponse,
  requestIdentifier,
} from "@/lib/security/rate-limit";

const lookupSchema = z.object({
  merchantSlug: z.string().min(1),
  phone: z.string().min(6),
});

/** Mobile numbers are guessable, so guessing has to cost something. */
const MAX_LOOKUPS_PER_HOUR = 10;

/**
 * Step one of loading your points: prove the number is yours.
 *
 * This used to hand back the member's name, points, tier and usual order — and
 * set a signed session — for any phone number typed into the box. Anyone could
 * read a stranger's history by guessing a number. Now it only sends a WhatsApp
 * code; nothing personal is returned and no session is issued until
 * `/api/customer/join/verify` confirms the code.
 */
export async function POST(request: Request) {
  try {
    const body = lookupSchema.parse(await request.json());

    if (!isPlausiblePhone(body.phone)) {
      return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
    }

    const limit = await checkRateLimit({
      bucket: "member-lookup",
      identifier: requestIdentifier(request),
      limit: MAX_LOOKUPS_PER_HOUR,
      windowSeconds: 3600,
    });
    if (!limit.allowed) {
      return rateLimitedResponse(
        limit.retryAfterSeconds,
        "Too many attempts. Wait a few minutes and try again.",
      );
    }

    const merchant = await getMerchantBySlug(body.merchantSlug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const phone = normalizePhone(body.phone);
    const customer = await getCustomerByPhone(merchant.id, phone);

    if (!customer?.is_member || customer.marketing_opt_out) {
      return NextResponse.json({
        found: false,
        message:
          "No member found for that number. Order & pay first, then join on WhatsApp — you can redeem next visit.",
      });
    }

    const code = generateRedeemOtpCode();
    await createRedeemOtp({
      merchantId: merchant.id,
      customerId: customer.id,
      phone,
      code,
    });

    const send = await sendRedeemOtpWhatsApp({
      merchantId: merchant.id,
      phone,
      code,
      merchantName: merchant.name,
    });

    return NextResponse.json({
      found: true,
      // Deliberately nothing about the member until the code is verified.
      otpRequired: true,
      expiresInSec: 5 * 60,
      message: "We sent a 4-digit code to that number on WhatsApp. Enter it to load your points.",
      // Local/dev only — never returned when Meta send is live.
      ...(send.channel === "dev" ? { devCode: code } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not look up member";
    // The OTP repository throws this when a number is hammered.
    const status = /too many/i.test(message) ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
