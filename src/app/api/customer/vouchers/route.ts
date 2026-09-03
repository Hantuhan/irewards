import { NextResponse } from "next/server";
import { listCustomerActiveVouchers } from "@/lib/db/merchant-repository";
import { getCustomerById, getMerchantBySlug } from "@/lib/db/repository";
import { getMemberSessionFromRequest } from "@/lib/customer/session";

/** Active vouchers for the signed-in member (stamp rewards, campaigns, staff). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const merchantSlug = url.searchParams.get("merchantSlug")?.trim();
    if (!merchantSlug) {
      return NextResponse.json({ error: "merchantSlug required" }, { status: 400 });
    }

    const session = getMemberSessionFromRequest(request);
    if (!session || session.merchantSlug !== merchantSlug) {
      return NextResponse.json({ vouchers: [] });
    }

    const merchant = await getMerchantBySlug(merchantSlug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const customer = await getCustomerById(session.customerId);
    if (!customer || customer.merchant_id !== merchant.id || !customer.is_member) {
      return NextResponse.json({ vouchers: [] });
    }

    const vouchers = await listCustomerActiveVouchers(
      merchant.id,
      customer.id,
      merchant.currency,
    );

    return NextResponse.json({ vouchers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load vouchers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
