import type { PublicHoliday } from "@/lib/reports/holidays";
import type { PaidOrderRow } from "@/lib/reports/compare";

export type CampaignInsight = {
  id: string;
  name: string;
  channel: string;
  status: string;
  reachCount: number;
  conversionRate: number | null;
  estimatedRevenueLiftCents: number;
  estimatedLiftPct: number;
  confidence: "high" | "medium" | "low";
  recommendation: string;
};

export type PromoInsight = {
  id: string;
  name: string;
  code: string | null;
  redemptionCount: number;
  revenueAttributedCents: number;
  discountGivenCents: number;
  netLiftCents: number;
  recommendation: string;
};

export type AutomationInsight = {
  ruleKey: string;
  title: string;
  enabled: boolean;
  estimatedMonthlyLiftCents: number;
  recommendation: string;
};

export type PriceScenario = {
  scope: "menu" | "category" | "item";
  label: string;
  currentAvgPriceCents: number;
  changePercent: number;
  projectedOrderChangePct: number;
  projectedRevenueCents: number;
  projectedRevenueDeltaCents: number;
  recommendation: string;
};

export type HolidayInsight = {
  holiday: PublicHoliday;
  historicalAvgRevenueCents: number | null;
  projectedLiftPct: number;
  projectedRevenueCents: number;
  recommendation: string;
};

export type IntelligenceReport = {
  campaigns: CampaignInsight[];
  promos: PromoInsight[];
  automations: AutomationInsight[];
  priceScenarios: PriceScenario[];
  holidays: HolidayInsight[];
  summary: string;
};

type CampaignInput = {
  id: string;
  name: string;
  channel: string;
  status: string;
  reach_count: number;
  conversion_rate: number | null;
  created_at: string;
};

type PromoInput = {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
};

type PromoRedemption = {
  promo_id: string;
  order_id: string;
  redeemed_at: string;
};

type AutomationInput = {
  rule_key: string;
  title: string;
  enabled: boolean;
};

/** Triggered campaigns are the automations; manual broadcasts and banners are not. */
export function automationInputsFromCampaigns(
  campaigns: { name: string; status: string; trigger_type: string | null }[],
): AutomationInput[] {
  return campaigns
    .filter((c) => c.trigger_type && !["manual", "storefront_opened"].includes(c.trigger_type))
    .map((c) => ({ rule_key: c.trigger_type as string, title: c.name, enabled: c.status === "active" }));
}

type MenuItemInput = {
  id: string;
  name: string;
  price_cents: number;
  category_label?: string;
};

/** Price elasticity: % volume change per 1% price change (negative = demand drops as price rises). */
const DEFAULT_ELASTICITY = -0.35;

function baselineDailyRevenue(orders: PaidOrderRow[], days = 30): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = orders.filter((o) => new Date(o.paid_at).getTime() >= cutoff);
  const total = recent.reduce((s, o) => s + o.total_cents, 0);
  return Math.round(total / days);
}

function projectPriceChange(
  currentRevenueCents: number,
  changePercent: number,
  elasticity = DEFAULT_ELASTICITY,
): { orderChangePct: number; revenueCents: number; deltaCents: number } {
  const volumeChangePct = elasticity * changePercent;
  const newRevenue = currentRevenueCents * (1 + changePercent / 100) * (1 + volumeChangePct / 100);
  return {
    orderChangePct: Math.round(volumeChangePct),
    revenueCents: Math.round(newRevenue),
    deltaCents: Math.round(newRevenue - currentRevenueCents),
  };
}

export function buildIntelligenceReport(input: {
  orders: PaidOrderRow[];
  campaigns: CampaignInput[];
  promos: PromoInput[];
  promoRedemptions: PromoRedemption[];
  orderTotalsById: Map<string, number>;
  automations: AutomationInput[];
  menuItems: MenuItemInput[];
  holidays: PublicHoliday[];
  currency: "MYR" | "SGD";
}): IntelligenceReport {
  const dailyBaseline = baselineDailyRevenue(input.orders);
  const monthlyBaseline = dailyBaseline * 30;

  const campaigns: CampaignInsight[] = input.campaigns.map((c) => {
    const convRate = c.conversion_rate != null ? Number(c.conversion_rate) : 0.03;
    const reach = c.reach_count || 0;
    const avgOrder = input.orders.length > 0
      ? Math.round(
          input.orders.reduce((s, o) => s + o.total_cents, 0) / input.orders.length,
        )
      : 2800;
    const estimatedOrders = Math.round(reach * convRate);
    const liftCents = estimatedOrders * avgOrder;
    const liftPct = monthlyBaseline > 0 ? Math.round((liftCents / monthlyBaseline) * 100) : 0;
    const active = c.status === "active";

    return {
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      reachCount: reach,
      conversionRate: c.conversion_rate != null ? Number(c.conversion_rate) : null,
      estimatedRevenueLiftCents: liftCents,
      estimatedLiftPct: liftPct,
      confidence: reach > 50 ? "medium" : "low",
      recommendation: active
        ? `Active campaign — monitor conversions. Estimated +${liftPct}% monthly revenue if conversion holds.`
        : `Set to Active to reach ${reach || "your member"} audience. Projected +${formatMoney(liftCents, input.currency)} if ${Math.round(convRate * 100)}% convert.`,
    };
  });

  const promos: PromoInsight[] = input.promos.map((p) => {
    const redemptions = input.promoRedemptions.filter((r) => r.promo_id === p.id);
    let revenue = 0;
    for (const r of redemptions) {
      revenue += input.orderTotalsById.get(r.order_id) ?? 0;
    }
    const discountEst = Math.round(revenue * 0.1);
    const netLift = Math.max(0, revenue - discountEst);

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      redemptionCount: redemptions.length,
      revenueAttributedCents: revenue,
      discountGivenCents: discountEst,
      netLiftCents: netLift,
      recommendation:
        redemptions.length > 0
          ? `${redemptions.length} redemptions — net ~${formatMoney(netLift, input.currency)} after discounts.`
          : p.active
            ? "Promo is live but unused — promote code at checkout or via WhatsApp."
            : "Activate and pair with a WhatsApp blast for weekend traffic.",
    };
  });

  // Rough monthly revenue lift per trigger type, as a share of baseline.
  const automationLift: Record<string, number> = {
    order_paid: 0.05,
    no_visit_days: 0.08,
    member_joined: 0.03,
    first_visit: 0.03,
    points_milestone: 0.02,
  };

  const automations: AutomationInsight[] = input.automations.map((a) => {
    const liftRate = automationLift[a.rule_key] ?? 0.03;
    const liftCents = Math.round(monthlyBaseline * liftRate);
    return {
      ruleKey: a.rule_key,
      title: a.title,
      enabled: a.enabled,
      estimatedMonthlyLiftCents: liftCents,
      recommendation: a.enabled
        ? `Running — contributes ~${formatMoney(liftCents, input.currency)}/mo in repeat visits.`
        : `Set live to recover ~${formatMoney(liftCents, input.currency)}/mo from repeat visits.`,
    };
  });

  const avgItemPrice =
    input.menuItems.length > 0
      ? Math.round(
          input.menuItems.reduce((s, i) => s + i.price_cents, 0) / input.menuItems.length,
        )
      : 1200;

  const priceScenarios: PriceScenario[] = [];

  for (const pct of [5, 10]) {
    const proj = projectPriceChange(monthlyBaseline, pct);
    priceScenarios.push({
      scope: "menu",
      label: "Whole menu",
      currentAvgPriceCents: avgItemPrice,
      changePercent: pct,
      projectedOrderChangePct: proj.orderChangePct,
      projectedRevenueCents: proj.revenueCents,
      projectedRevenueDeltaCents: proj.deltaCents,
      recommendation:
        proj.deltaCents >= 0
          ? `+${pct}% prices may grow revenue ~${formatMoney(proj.deltaCents, input.currency)}/mo with ~${Math.abs(proj.orderChangePct)}% fewer orders.`
          : `+${pct}% prices may reduce revenue ~${formatMoney(Math.abs(proj.deltaCents), input.currency)}/mo — test on 2–3 items first.`,
    });
  }

  const categories = [...new Set(input.menuItems.map((i) => i.category_label ?? "Menu"))];
  for (const cat of categories.slice(0, 4)) {
    const items = input.menuItems.filter((i) => (i.category_label ?? "Menu") === cat);
    const catAvg = Math.round(items.reduce((s, i) => s + i.price_cents, 0) / items.length);
    const catShare = items.length / Math.max(1, input.menuItems.length);
    const catRevenue = Math.round(monthlyBaseline * catShare);
    const proj = projectPriceChange(catRevenue, 5);
    priceScenarios.push({
      scope: "category",
      label: cat,
      currentAvgPriceCents: catAvg,
      changePercent: 5,
      projectedOrderChangePct: proj.orderChangePct,
      projectedRevenueCents: proj.revenueCents,
      projectedRevenueDeltaCents: proj.deltaCents,
      recommendation: `+5% on ${cat} → ${proj.deltaCents >= 0 ? "+" : ""}${formatMoney(proj.deltaCents, input.currency)}/mo estimated.`,
    });
  }

  for (const item of [...input.menuItems].sort((a, b) => b.price_cents - a.price_cents).slice(0, 5)) {
    const itemShare = 1 / Math.max(1, input.menuItems.length);
    const itemRevenue = Math.round(monthlyBaseline * itemShare * 3);
    const proj = projectPriceChange(itemRevenue, 5);
    priceScenarios.push({
      scope: "item",
      label: item.name,
      currentAvgPriceCents: item.price_cents,
      changePercent: 5,
      projectedOrderChangePct: proj.orderChangePct,
      projectedRevenueCents: proj.revenueCents,
      projectedRevenueDeltaCents: proj.deltaCents,
      recommendation: `+5% on ${item.name} (${formatMoney(item.price_cents, input.currency)} → ${formatMoney(Math.round(item.price_cents * 1.05), input.currency)}).`,
    });
  }

  const holidays: HolidayInsight[] = input.holidays.map((h) => {
    const sameMonth = input.orders.filter((o) => {
      const d = new Date(o.paid_at);
      const hd = new Date(h.date);
      return d.getMonth() === hd.getMonth() && d.getDate() === hd.getDate();
    });
    const histAvg =
      sameMonth.length > 0
        ? Math.round(sameMonth.reduce((s, o) => s + o.total_cents, 0) / Math.max(1, sameMonth.length / 3))
        : null;
    const liftPct = histAvg && dailyBaseline > 0 ? pct(histAvg, dailyBaseline) : 15;
    const projected = Math.round(dailyBaseline * (1 + liftPct / 100));

    return {
      holiday: h,
      historicalAvgRevenueCents: histAvg,
      projectedLiftPct: liftPct,
      projectedRevenueCents: projected,
      recommendation: `${h.localName} on ${h.date} — plan staffing & ${liftPct > 0 ? "upsell" : "promo"}. Projected daily revenue ~${formatMoney(projected, input.currency)}.`,
    };
  });

  const topCampaign = campaigns.sort((a, b) => b.estimatedRevenueLiftCents - a.estimatedRevenueLiftCents)[0];
  const topAutomation = automations.filter((a) => !a.enabled).sort((a, b) => b.estimatedMonthlyLiftCents - a.estimatedMonthlyLiftCents)[0];
  const nextHoliday = holidays[0];

  const summaryParts = [
    `Based on the last 30 days (~${formatMoney(monthlyBaseline, input.currency)}/mo revenue).`,
    topCampaign
      ? `Top campaign opportunity: **${topCampaign.name}** (+${formatMoney(topCampaign.estimatedRevenueLiftCents, input.currency)} projected).`
      : null,
    topAutomation
      ? `Quick win: set **${topAutomation.title}** live for ~${formatMoney(topAutomation.estimatedMonthlyLiftCents, input.currency)}/mo.`
      : null,
    nextHoliday ? `Upcoming: **${nextHoliday.holiday.localName}** — ${nextHoliday.recommendation}` : null,
  ].filter(Boolean);

  return {
    campaigns,
    promos,
    automations,
    priceScenarios,
    holidays,
    summary: summaryParts.join(" "),
  };
}

function pct(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  return Math.round(((current - baseline) / baseline) * 100);
}

function formatMoney(cents: number, currency: "MYR" | "SGD"): string {
  const symbol = currency === "SGD" ? "S$" : "RM";
  return `${symbol} ${(cents / 100).toFixed(2)}`;
}
