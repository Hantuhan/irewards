import { NextResponse } from "next/server";
import { z } from "zod";
import { runCampaignTrigger } from "@/lib/campaigns/workflow-runtime";
import {
  createMemberCustomer,
  getCustomerByPhone,
  getMerchantBySlug,
  updateCustomer,
} from "@/lib/db/repository";
import { createMemberSessionToken, memberSessionCookieHeader } from "@/lib/customer/session";
import { isPlausiblePhone, normalizePhone } from "@/lib/loyalty/phone";
import { getCustomerTierForMerchant } from "@/lib/services/loyalty-points";

const joinSchema = z.object({
  merchantSlug: z.string().min(1),
  phone: z.string().min(6),
  displayName: z.string().max(80).optional(),
  /** Must be true — the guest ticked the marketing consent box (PDPA). */
  marketingConsent: z.literal(true),
});

/**
 * Storefront opt-in: a diner joins the rewards club straight from the menu page
 * without waiting for a receipt. Fires the `member_joined` campaign trigger.
 */
export async function POST(request: Request) {
  try {
    const body = joinSchema.parse(await request.json());

    if (!isPlausiblePhone(body.phone)) {
      return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
    }

    const merchant = await getMerchantBySlug(body.merchantSlug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const phone = normalizePhone(body.phone);
    const existing = await getCustomerByPhone(merchant.id, phone);

    let customer = existing;
    let firstJoin = false;

    if (!customer) {
      customer = await createMemberCustomer({ merchantId: merchant.id, phone });
      firstJoin = true;
    } else if (!customer.is_member || customer.marketing_opt_out) {
      firstJoin = !customer.is_member;
      customer = await updateCustomer(customer.id, {
        is_member: true,
        marketing_opt_out: false,
      });
    }

    if (body.displayName?.trim() && !customer.display_name) {
      customer = await updateCustomer(customer.id, { display_name: body.displayName.trim() });
    }

    const tier = await getCustomerTierForMerchant(customer, merchant.id);

    await runCampaignTrigger("member_joined", {
      merchantId: merchant.id,
      customer,
      source: "storefront",
      firstJoin,
      tierName: tier.current.name,
    });

    const token = createMemberSessionToken({
      customerId: customer.id,
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
    });

    return NextResponse.json(
      {
        ok: true,
        firstJoin,
        member: {
          id: customer.id,
          points: customer.points_balance,
          tierName: tier.current.name,
        },
      },
      { headers: { "Set-Cookie": memberSessionCookieHeader(token) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join right now";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
