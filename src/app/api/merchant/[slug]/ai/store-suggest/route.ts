import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestStoreBundles } from "@/lib/ai/store-intelligence";
import { listGlobalUpsellLinks } from "@/lib/db/global-upsell-repository";
import { getActiveMenuForStorefront } from "@/lib/db/merchant-repository";
import { getMerchantBySlug } from "@/lib/db/repository";
import { currencyDisplayCode, type MerchantCurrency } from "@/lib/merchant/currency";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  cartItemIds: z.array(z.string()).max(50),
  cartTotalCents: z.number().int().min(0).optional(),
  memberTier: z.string().nullable().optional(),
  usualOrder: z.array(z.object({ name: z.string() })).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());
    const menu = await getActiveMenuForStorefront(merchant.id, merchant.timezone ?? "Asia/Kuala_Lumpur");
    const items = menu.flatMap((c) => c.items);
    const globalUpsellLinks = await listGlobalUpsellLinks(merchant.id);
    const currency = currencyDisplayCode((merchant.currency ?? "MYR") as MerchantCurrency);

    const bundle = await suggestStoreBundles({
      merchantName: merchant.name,
      currency,
      cartItemIds: body.cartItemIds,
      cartTotalCents: body.cartTotalCents,
      globalUpsellLinks,
      menuItems: items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        priceCents: i.priceCents,
        tags: i.tags ?? [],
        upsellLinks: i.upsellLinks ?? [],
        upsellItemIds: i.upsellItemIds ?? [],
      })),
      memberTier: body.memberTier,
      usualOrder: body.usualOrder,
      hour: new Date().getHours(),
    });

    return NextResponse.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Store suggest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
