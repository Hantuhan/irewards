import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerByPhone, getMerchantBySlug } from "@/lib/db/repository";
import { verifyAndConsumeRedeemOtp } from "@/lib/db/redeem-otp-repository";
import { createMemberSessionToken, memberSessionCookieHeader } from "@/lib/customer/session";
import { createRedeemAuthToken, redeemAuthCookieHeader } from "@/lib/customer/redeem-session";
import { isPlausiblePhone, normalizePhone } from "@/lib/loyalty/phone";
import { getCustomerTierForMerchant } from "@/lib/services/loyalty-points";
import {
  checkRateLimit,
  rateLimitedResponse,
  requestIdentifier,
} from "@/lib/security/rate-limit";

const verifySchema = z.object({
  merchantSlug: z.string().min(1),
  phone: z.string().min(6),
  code: z.string().regex(/^\d{4}$/, "Enter the 4-digit code from WhatsApp."),
});

/** Codes are 4 digits; brute force has to cost something on top of the per-code attempt cap. */
const MAX_VERIFIES_PER_HOUR = 20;

/**
 * Step two: the code proves the number belongs to whoever is holding the phone.
 *
 * Only here is the member session issued. The same proof also authorises
 * spending points for the next half hour — it is exactly the check the redeem
 * flow makes — so a member who verifies to load points is not asked to verify
 * a second time to spend them.
 */
export async function POST(request: Request) {
  try {
    const body = verifySchema.parse(await request.json());

    if (!isPlausiblePhone(body.phone)) {
      return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
    }

    const limit = await checkRateLimit({
      bucket: "member-verify",
      identifier: requestIdentifier(request),
      limit: MAX_VERIFIES_PER_HOUR,
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
      // Same wording as a wrong code: do not confirm which half was wrong.
      return NextResponse.json(
        { error: "That code did not match. Request a new one." },
        { status: 400 },
      );
    }

    const result = await verifyAndConsumeRedeemOtp({ customerId: customer.id, code: body.code });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const tier = await getCustomerTierForMerchant(customer, merchant.id);
    const sessionToken = createMemberSessionToken({
      customerId: customer.id,
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
    });
    const redeemToken = createRedeemAuthToken({
      customerId: customer.id,
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
    });

    return NextResponse.json(
      {
        verified: true,
        member: {
          id: customer.id,
          points: customer.points_balance,
          tierName: tier.current.name,
          displayName: customer.display_name,
        },
      },
      {
        headers: [
          ["Set-Cookie", memberSessionCookieHeader(sessionToken)],
          ["Set-Cookie", redeemAuthCookieHeader(redeemToken)],
        ],
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Enter the 4-digit code from WhatsApp." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
