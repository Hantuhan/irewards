import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug, getCustomerById, getOrderById } from "@/lib/db/repository";
import {
  createMemberSessionToken,
  getMemberSessionFromRequest,
  memberSessionCookieHeader,
} from "@/lib/customer/session";

/**
 * Bind a browser session only from a paid order that already has a customer_id
 * (set by WhatsApp join or a prior verified session at checkout). Never accept
 * a raw customerId from the client — that was an impersonation hole.
 */
const bindSchema = z.object({
  orderId: z.string().uuid(),
  merchantSlug: z.string().min(1),
});

export async function GET(request: Request) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ member: null });
  }

  const customer = await getCustomerById(session.customerId);
  if (!customer?.is_member || customer.merchant_id !== session.merchantId) {
    return NextResponse.json({ member: null });
  }

  return NextResponse.json({
    member: {
      id: customer.id,
      points: customer.points_balance,
      tierPoints: customer.lifetime_points_earned,
      usualOrder: customer.usual_order,
      favoriteItem: customer.favorite_item_name,
      displayName: customer.display_name,
      marketingOptOut: customer.marketing_opt_out,
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

    const order = await getOrderById(body.orderId);
    if (!order || order.merchant_id !== merchant.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "paid") {
      return NextResponse.json({ error: "Order is not paid yet" }, { status: 400 });
    }
    if (!order.customer_id) {
      return NextResponse.json({ error: "Order has no member yet" }, { status: 400 });
    }

    const customer = await getCustomerById(order.customer_id);
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
