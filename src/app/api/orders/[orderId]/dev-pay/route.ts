import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/db/repository";
import { isDevPaymentMode } from "@/lib/payments/mode";
import { completePaidOrder } from "@/lib/services/payment-completion";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!isDevPaymentMode()) {
    return NextResponse.json({ error: "Dev pay disabled" }, { status: 403 });
  }

  try {
    const { orderId } = await context.params;
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true, orderId });
    }

    const result = await completePaidOrder(orderId, `dev-${orderId}`, "dev");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dev pay failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
