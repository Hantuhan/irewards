import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOrderReceipt } from "@/lib/services/send-order-receipt";

type RouteContext = { params: Promise<{ orderId: string }> };

const bodySchema = z.object({
  method: z.enum(["email", "whatsapp"]),
  destination: z.string().min(3),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
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
