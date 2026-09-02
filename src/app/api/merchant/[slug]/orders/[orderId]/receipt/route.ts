import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug, getOrderById } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { sendOrderReceipt } from "@/lib/services/send-order-receipt";

type RouteContext = { params: Promise<{ slug: string; orderId: string }> };

const bodySchema = z.object({
  method: z.enum(["email", "whatsapp"]),
  destination: z.string().min(3),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug, orderId } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const order = await getOrderById(orderId);
    if (!order || order.merchant_id !== merchant.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());
    const result = await sendOrderReceipt({
      orderId,
      method: body.method,
      destination: body.destination,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send receipt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
