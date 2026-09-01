import { NextResponse } from "next/server";
import { parsePaymentWebhook, verifyPaymentWebhook } from "@/lib/payments/webhook";
import { completePaidOrder } from "@/lib/services/payment-completion";
import { getOrderById } from "@/lib/db/repository";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-payment-signature") ??
    request.headers.get("hitpay-signature") ??
    request.headers.get("Hitpay-Signature");

  if (!verifyPaymentWebhook(rawBody, signature, request.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = parsePaymentWebhook(rawBody);
  if (!payload || payload.status !== "paid") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const existing = await getOrderById(payload.orderId);
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (existing.status === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    const result = await completePaidOrder(payload.orderId, payload.externalId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
