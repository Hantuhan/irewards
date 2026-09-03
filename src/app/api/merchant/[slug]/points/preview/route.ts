import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerById } from "@/lib/db/repository";
import { getMerchantBySlug } from "@/lib/db/repository";
import { getMemberSessionFromRequest } from "@/lib/customer/session";
import { previewOrderPoints } from "@/lib/services/loyalty-points";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  totalCents: z.number().int().min(0),
  menuItemIds: z.array(z.string().uuid()).max(100).optional(),
});

/**
 * Points this order would earn, for display in the cart before payment.
 * Runs the same pipeline as the post-payment award, so the figure matches.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());

    // Only the caller's own signed session identifies the member.
    const session = getMemberSessionFromRequest(request);
    const customer =
      session?.merchantSlug === slug ? await getCustomerById(session.customerId) : null;
    const ownCustomer = customer?.merchant_id === merchant.id ? customer : null;

    const preview = await previewOrderPoints({
      merchantId: merchant.id,
      totalCents: body.totalCents,
      customer: ownCustomer,
      orderMenuItemIds: body.menuItemIds,
    });

    return NextResponse.json(preview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to preview points";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
