import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug, getCustomerById } from "@/lib/db/repository";
import {
  createMemberSessionToken,
  getMemberSessionFromRequest,
  memberSessionCookieHeader,
} from "@/lib/customer/session";

const bindSchema = z.object({
  customerId: z.string().uuid(),
  merchantSlug: z.string().min(1),
});

export async function GET(request: Request) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ member: null });
  }

  const customer = await getCustomerById(session.customerId);
  if (!customer?.is_member) {
    return NextResponse.json({ member: null });
  }

  return NextResponse.json({
    member: {
      id: customer.id,
      points: customer.points_balance,
      tierPoints: customer.lifetime_points_earned,
      usualOrder: customer.usual_order,
      favoriteItem: customer.favorite_item_name,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = bindSchema.parse(await request.json());
    const merchant = await getMerchantBySlug(body.merchantSlug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const customer = await getCustomerById(body.customerId);
    if (!customer || customer.merchant_id !== merchant.id || !customer.is_member) {
      return NextResponse.json({ error: "Invalid member" }, { status: 400 });
    }

    const token = createMemberSessionToken({
      customerId: customer.id,
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
    });

    return NextResponse.json(
      { ok: true, customerId: customer.id },
      { headers: { "Set-Cookie": memberSessionCookieHeader(token) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to bind session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
