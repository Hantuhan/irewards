import { NextResponse } from "next/server";
import { listCustomerActiveVouchers } from "@/lib/db/merchant-repository";
import { getMerchantBySlug } from "@/lib/db/repository";
import { getStampProgressForCustomer } from "@/lib/services/loyalty-stamps";

type RouteContext = { params: Promise<{ slug: string }> };

/** Public storefront progress (optional customerId query). */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const customerId = url.searchParams.get("customerId");

    const progress = await getStampProgressForCustomer(
      merchant.id,
      customerId,
    );

    const vouchers = customerId
      ? await listCustomerActiveVouchers(merchant.id, customerId, merchant.currency)
      : [];

    return NextResponse.json({
      pointsProgramEnabled: merchant.points_program_enabled !== false,
      stampsProgramEnabled: Boolean(merchant.stamps_program_enabled),
      progress,
      vouchers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load stamp progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
