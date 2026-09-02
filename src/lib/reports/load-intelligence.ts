import {
  getMerchantPaidOrdersForReports,
  getPromoRedemptionsForMerchant,
  listCampaigns,
  listMenuCategories,
  listMenuItems,
  listPromos,
} from "@/lib/db/merchant-repository";
import { countryCodeForCurrency, upcomingHolidays } from "@/lib/reports/holidays";
import { automationInputsFromCampaigns, buildIntelligenceReport, type IntelligenceReport } from "@/lib/reports/intelligence";
import { buildCompareReport } from "@/lib/reports/compare";

export type MerchantIntelligenceBundle = {
  currency: "MYR" | "SGD";
  countryCode: "MY" | "SG";
  intelligence: IntelligenceReport;
  metrics: {
    paidOrderCount: number;
    totalRevenueCents: number;
    avgOrderCents: number;
    avgDailyRevenueCents: number;
    revenueChangePct: number;
  };
  /** Sanitized snapshot for AI — no customer PII, this merchant only */
  aiContext: Record<string, unknown>;
};

function sanitizeForAi(
  intelligence: IntelligenceReport,
  metrics: MerchantIntelligenceBundle["metrics"],
  merchantName: string,
  currency: string,
) {
  return {
    merchantName,
    currency,
    metrics,
    summary: intelligence.summary,
    campaigns: intelligence.campaigns.map((c) => ({
      name: c.name,
      channel: c.channel,
      status: c.status,
      reachCount: c.reachCount,
      conversionRate: c.conversionRate,
      estimatedRevenueLiftCents: c.estimatedRevenueLiftCents,
      estimatedLiftPct: c.estimatedLiftPct,
      confidence: c.confidence,
    })),
    promos: intelligence.promos.map((p) => ({
      name: p.name,
      code: p.code,
      redemptionCount: p.redemptionCount,
      revenueAttributedCents: p.revenueAttributedCents,
      netLiftCents: p.netLiftCents,
    })),
    automations: intelligence.automations.map((a) => ({
      title: a.title,
      ruleKey: a.ruleKey,
      enabled: a.enabled,
      estimatedMonthlyLiftCents: a.estimatedMonthlyLiftCents,
    })),
    priceScenarios: intelligence.priceScenarios.slice(0, 12).map((s) => ({
      scope: s.scope,
      label: s.label,
      changePercent: s.changePercent,
      projectedRevenueDeltaCents: s.projectedRevenueDeltaCents,
      projectedOrderChangePct: s.projectedOrderChangePct,
    })),
    holidays: intelligence.holidays.map((h) => ({
      name: h.holiday.localName,
      date: h.holiday.date,
      projectedLiftPct: h.projectedLiftPct,
      projectedRevenueCents: h.projectedRevenueCents,
    })),
  };
}

export async function loadMerchantIntelligenceBundle(
  merchantId: string,
  merchantName: string,
  currency: "MYR" | "SGD",
  targets: {
    dailyRevenueTargetCents?: number | null;
    weeklyRevenueTargetCents?: number | null;
    monthlyRevenueTargetCents?: number | null;
  },
): Promise<MerchantIntelligenceBundle> {
  const [orders, campaigns, promos, promoRedemptions, menuItems, categories] =
    await Promise.all([
      getMerchantPaidOrdersForReports(merchantId),
      listCampaigns(merchantId),
      listPromos(merchantId),
      getPromoRedemptionsForMerchant(merchantId),
      listMenuItems(merchantId),
      listMenuCategories(merchantId),
    ]);

  const categoryById = new Map(categories.map((c) => [c.id, c.label]));
  const orderTotalsById = new Map(orders.map((o) => [o.id, o.total_cents]));
  const country = countryCodeForCurrency(currency);
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
    currency,
  });

  const compare = buildCompareReport(orders, currency, targets, 7);
  const totalRevenueCents = orders.reduce((s, o) => s + o.total_cents, 0);
  const paidOrderCount = orders.length;

  const metrics = {
    paidOrderCount,
    totalRevenueCents,
    avgOrderCents: paidOrderCount > 0 ? Math.round(totalRevenueCents / paidOrderCount) : 0,
    avgDailyRevenueCents: compare.trend.avgDailyRevenueCents,
    revenueChangePct: compare.revenueChangePct,
  };

  const aiContext = sanitizeForAi(intelligence, metrics, merchantName, currency);

  return {
    currency,
    countryCode: country,
    intelligence,
    metrics,
    aiContext,
  };
}
