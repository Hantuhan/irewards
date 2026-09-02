import { NextResponse } from "next/server";
import { getStorefrontMenuItemBySlug } from "@/lib/db/merchant-repository";
import { getMerchantBySlug } from "@/lib/db/repository";
import { currencyDisplayCode, type MerchantCurrency } from "@/lib/merchant/currency";

type RouteContext = { params: Promise<{ slug: string; itemSlug: string }> };

function merchantTimezone(merchant: { timezone?: string | null }) {
  return merchant.timezone ?? "Asia/Kuala_Lumpur";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug, itemSlug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const lang =
      url.searchParams.get("lang") === "zh" || url.searchParams.get("lang") === "ms"
        ? url.searchParams.get("lang")
        : "en";

    const item = await getStorefrontMenuItemBySlug(
      merchant.id,
      itemSlug,
      merchantTimezone(merchant),
      lang as "en" | "zh" | "ms",
    );

    if (!item) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      currency: currencyDisplayCode((merchant.currency ?? "MYR") as MerchantCurrency),
      item,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
