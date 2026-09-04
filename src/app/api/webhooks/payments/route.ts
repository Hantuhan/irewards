import { NextResponse } from "next/server";
import { verifyAndParseWebhook } from "@/lib/payments/webhook";
import { completePaidOrder } from "@/lib/services/payment-completion";
import { getOrderById } from "@/lib/db/repository";

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Verification and parsing are one step: nothing is read out of a body that
  // has not proved which provider signed it.
  const verified = await verifyAndParseWebhook(rawBody, request.headers);
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { provider, payload } = verified;
  if (payload.status !== "paid") {
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

    const result = await completePaidOrder(payload.orderId, payload.externalId, provider);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
