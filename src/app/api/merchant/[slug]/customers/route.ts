import { NextResponse } from "next/server";
import { getMerchantBySlug, getRewardLevels } from "@/lib/db/repository";
import { listCustomersForMerchant } from "@/lib/db/merchant-repository";
import { resolveCustomerLevel } from "@/lib/loyalty/tiers";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("q") ?? undefined;

    const [customers, levels] = await Promise.all([
      listCustomersForMerchant(merchant.id, search),
      getRewardLevels(merchant.id),
    ]);

    return NextResponse.json({
      members: customers.map((c) => {
        const tier = resolveCustomerLevel(c.lifetime_points_earned, levels);
        return {
          id: c.id,
          name: c.display_name ?? (c.phone ? `Member ${c.phone.slice(-4)}` : "Guest"),
          phone: c.phone,
          tier: tier.name,
          points: c.points_balance,
          lifetimePoints: c.lifetime_points_earned,
          isMember: c.is_member,
          lastVisit: c.last_visit_at,
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load members";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
