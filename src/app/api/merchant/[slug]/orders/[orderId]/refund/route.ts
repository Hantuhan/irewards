import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  roleDeniedMessage,
  verifyMerchantAccess,
  verifyMerchantRole,
} from "@/lib/merchant/access";
import { getSessionFromRequest } from "@/lib/merchant/session";
import { RefundError, refundPaidOrder, voidPendingOrder } from "@/lib/services/order-refund";

type RouteContext = { params: Promise<{ slug: string; orderId: string }> };

const bodySchema = z.object({
  /** "void" kills an unpaid order; "refund" gives money back on a paid one. */
  action: z.enum(["void", "refund"]).default("refund"),
  /** Omit for a full refund. */
  amountCents: z.number().int().positive().optional(),
  reason: z.string().min(3).max(200),
});

/**
 * Refunds are the obvious way to steal from a till, so this is manager-and-up
 * and always records who did it and why.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug, orderId } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await verifyMerchantRole(request, slug, "manager"))) {
      return NextResponse.json({ error: roleDeniedMessage("manager") }, { status: 403 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());
    const userId = getSessionFromRequest(request)?.userId || null;

    if (body.action === "void") {
      const order = await voidPendingOrder({
        merchantId: merchant.id,
        orderId,
        reason: body.reason,
        userId,
      });
      return NextResponse.json({ ok: true, action: "void", status: order.status });
    }

    const outcome = await refundPaidOrder({
      merchantId: merchant.id,
      orderId,
      amountCents: body.amountCents,
      reason: body.reason,
      userId,
      currency: merchant.currency,
    });

    return NextResponse.json({ ok: true, action: "refund", ...outcome });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Say briefly why this is being refunded (at least a few words)." },
        { status: 400 },
      );
    }
    if (error instanceof RefundError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // A provider failure is worth showing: the merchant needs to know the money
    // did not move, and that nothing was unwound.
    const message =
      error instanceof Error && /payment provider/i.test(error.message)
        ? error.message
        : "Could not complete that refund. Nothing was changed — try again.";
    console.error("Refund failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
