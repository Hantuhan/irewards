import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  getMerchantPaidOrdersForReports,
  updateMerchant,
} from "@/lib/db/merchant-repository";
import {
  buildCompareReport,
  suggestedRevenueTargetsFromAvgDaily,
} from "@/lib/reports/compare";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  periodDays: z.number().int().min(1).max(90).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const json = await request.json().catch(() => ({}));
    const { periodDays = 7 } = bodySchema.parse(json);

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

    const avgDaily = compare.trend.avgDailyRevenueCents;
    if (avgDaily <= 0) {
      return NextResponse.json(
        { error: "No paid orders in this period — add sales before setting targets." },
        { status: 400 },
      );
    }

    const suggested = suggestedRevenueTargetsFromAvgDaily(avgDaily);

    await updateMerchant(merchant.id, {
      daily_revenue_target_cents: suggested.dailyRevenueTargetCents,
      weekly_revenue_target_cents: suggested.weeklyRevenueTargetCents,
      monthly_revenue_target_cents: suggested.monthlyRevenueTargetCents,
    });

    return NextResponse.json({
      currency: merchant.currency,
      periodDays,
      basedOnAvgDailyCents: avgDaily,
      dailyRevenueTargetCents: suggested.dailyRevenueTargetCents,
      weeklyRevenueTargetCents: suggested.weeklyRevenueTargetCents,
      monthlyRevenueTargetCents: suggested.monthlyRevenueTargetCents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync revenue targets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
