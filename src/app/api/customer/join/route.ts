import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerByPhone, getMerchantBySlug } from "@/lib/db/repository";
import { createMemberSessionToken, memberSessionCookieHeader } from "@/lib/customer/session";
import { isPlausiblePhone, normalizePhone } from "@/lib/loyalty/phone";
import { getCustomerTierForMerchant } from "@/lib/services/loyalty-points";

const lookupSchema = z.object({
  merchantSlug: z.string().min(1),
  phone: z.string().min(6),
});

/**
 * Soft recognition: returning diners enter their mobile to load points / "Your usual".
 * Does NOT create members or award points — that only happens after paid WhatsApp join.
 */
export async function POST(request: Request) {
  try {
    const body = lookupSchema.parse(await request.json());

    if (!isPlausiblePhone(body.phone)) {
      return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
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
        message: "No member found for that number. Join on WhatsApp after you pay.",
      });
    }

    const tier = await getCustomerTierForMerchant(customer, merchant.id);
    const token = createMemberSessionToken({
      customerId: customer.id,
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
    });

    return NextResponse.json(
      {
        found: true,
        member: {
          id: customer.id,
          points: customer.points_balance,
          tierName: tier.current.name,
          displayName: customer.display_name,
        },
      },
      { headers: { "Set-Cookie": memberSessionCookieHeader(token) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not look up member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
