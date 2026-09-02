import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import { getMerchantPaidOrdersForReports } from "@/lib/db/merchant-repository";
import { buildCompareReport } from "@/lib/reports/compare";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const querySchema = z.object({
  periodDays: z.coerce.number().int().min(1).max(90).default(7),
});

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

    const { searchParams } = new URL(request.url);
    const { periodDays } = querySchema.parse({
      periodDays: searchParams.get("periodDays") ?? "7",
    });

    const orders = await getMerchantPaidOrdersForReports(merchant.id);
    const compare = buildCompareReport(
      orders,
      merchant.currency,
      {
        dailyRevenueTargetCents: merchant.daily_revenue_target_cents,
        weeklyRevenueTargetCents: merchant.weekly_revenue_target_cents,
        monthlyRevenueTargetCents: merchant.monthly_revenue_target_cents,
      },
      periodDays,
    );

    return NextResponse.json({
      currency: merchant.currency,
      periodDays,
      ...compare,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load comparison report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
