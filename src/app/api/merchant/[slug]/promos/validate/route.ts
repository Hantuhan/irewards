import { NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/db/repository";
import { getPromoByCode } from "@/lib/db/merchant-repository";
import { calculatePromoDiscountCents } from "@/lib/services/promo";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const code = new URL(request.url).searchParams.get("code");
    const subtotal = Number(new URL(request.url).searchParams.get("subtotalCents") ?? 0);

    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const promo = await getPromoByCode(merchant.id, code);
    if (!promo) {
      return NextResponse.json({ valid: false, error: "Invalid promo code" });
    }

    const discountCents = calculatePromoDiscountCents(promo, subtotal);
    if (discountCents <= 0) {
      return NextResponse.json({
        valid: false,
        error: "Promo does not apply to this order",
      });
    }

    return NextResponse.json({
      valid: true,
      promoId: promo.id,
      name: promo.name,
      discountCents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
