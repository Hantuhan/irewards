import { NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  getMerchantPaidOrdersForReports,
  getPromoRedemptionsForMerchant,
  listCampaigns,
  listMenuCategories,
  listMenuItems,
  listPromos,
} from "@/lib/db/merchant-repository";
import { countryCodeForCurrency, upcomingHolidays } from "@/lib/reports/holidays";
import { automationInputsFromCampaigns, buildIntelligenceReport } from "@/lib/reports/intelligence";
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

    const [orders, campaigns, promos, promoRedemptions, menuItems, categories] =
      await Promise.all([
        getMerchantPaidOrdersForReports(merchant.id),
        listCampaigns(merchant.id),
        listPromos(merchant.id),
        getPromoRedemptionsForMerchant(merchant.id),
        listMenuItems(merchant.id),
        listMenuCategories(merchant.id),
      ]);

    const categoryById = new Map(categories.map((c) => [c.id, c.label]));
    const orderTotalsById = new Map(orders.map((o) => [o.id, o.total_cents]));

    const country = countryCodeForCurrency(merchant.currency);
    const holidays = await upcomingHolidays(country, 90);

    const intelligence = buildIntelligenceReport({
      orders,
      campaigns,
      promos,
      promoRedemptions,
      orderTotalsById,
      automations: automationInputsFromCampaigns(campaigns),
      menuItems: menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        price_cents: item.price_cents,
        category_label: categoryById.get(item.category_id) ?? "Menu",
      })),
      holidays,
      currency: merchant.currency,
    });

    return NextResponse.json({
      currency: merchant.currency,
      countryCode: country,
      ...intelligence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load intelligence report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
