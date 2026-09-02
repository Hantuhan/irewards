import { NextResponse } from "next/server";
import { z } from "zod";
import { updateMerchant } from "@/lib/db/merchant-repository";
import { getMerchantBySlug } from "@/lib/db/repository";
import { parseMenuBadges, sanitizeMenuBadges, type MenuBadge } from "@/lib/menu/menu-badges";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const badgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().min(1),
});

const putSchema = z.object({
  badges: z.array(badgeSchema).max(12),
});

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(_request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const badges = parseMenuBadges(merchant.menu_badges_json);
    return NextResponse.json({ badges });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load badges";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = putSchema.parse(await request.json());
    const badges = sanitizeMenuBadges(body.badges as MenuBadge[]);
    await updateMerchant(merchant.id, { menu_badges_json: badges });
    return NextResponse.json({ badges });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save badges";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
