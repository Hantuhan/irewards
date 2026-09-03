import { NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/db/repository";
import { listVoucherInventory } from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const currency = merchant.currency === "SGD" ? "SGD" : "MYR";
    const vouchers = await listVoucherInventory(merchant.id, currency);
    return NextResponse.json({ vouchers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load voucher inventory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
