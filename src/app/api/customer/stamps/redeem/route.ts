import { NextResponse } from "next/server";
import { getCustomerById, getMerchantBySlug } from "@/lib/db/repository";
import { getMemberSessionFromRequest } from "@/lib/customer/session";
import {
  getStampProgressForCustomer,
  redeemStampCard,
} from "@/lib/services/loyalty-stamps";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { merchantSlug?: string };
    const merchantSlug = body.merchantSlug?.trim();
    if (!merchantSlug) {
      return NextResponse.json({ error: "merchantSlug required" }, { status: 400 });
    }

    const session = getMemberSessionFromRequest(request);
    if (!session || session.merchantSlug !== merchantSlug) {
      return NextResponse.json({ error: "Sign in as a member first" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(merchantSlug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const customer = await getCustomerById(session.customerId);
    if (!customer || customer.merchant_id !== merchant.id || !customer.is_member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { voucher } = await redeemStampCard({ customer, merchantId: merchant.id });
    const progress = await getStampProgressForCustomer(merchant.id, customer.id);

    return NextResponse.json({
      ok: true,
      progress,
      voucher: voucher
        ? {
            id: voucher.id,
            name: voucher.name,
            code: voucher.code,
            type: voucher.type,
            value: voucher.value,
            expiresAt: voucher.expires_at,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to redeem";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
