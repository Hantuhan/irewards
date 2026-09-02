import { deepseekChat, isDeepseekConfigured, type DeepseekMessage } from "@/lib/ai/deepseek";
import {
  assessReportsQuestion,
  REPORTS_GUARDRAIL_RULES,
  REPORTS_SCOPE_REPLY,
} from "@/lib/ai/reports-intelligence-guardrails";
import { getMerchantBySlug } from "@/lib/db/repository";
import { loadMerchantIntelligenceBundle } from "@/lib/reports/load-intelligence";

export type ReportsChatTurn = { role: "user" | "assistant"; content: string };

export type ReportsIntelligenceChatResult = {
  reply: string;
  source: "deepseek" | "rules" | "guardrail";
};

export const REPORTS_CHAT_STARTERS = [
  "Which campaign should I activate first?",
  "What happens if I raise prices 5%?",
  "How should I prepare for the next public holiday?",
  "Which automation gives the best return?",
  "Investigate why weekend sales lag weekdays",
  "Recommend one promo to boost revenue this month",
];

function formatMoney(currency: string, cents: number): string {
  const symbol = currency === "SGD" ? "S$" : "RM";
  return `${symbol} ${(cents / 100).toFixed(2)}`;
}

function fallbackReportsReply(
  message: string,
  bundle: Awaited<ReturnType<typeof loadMerchantIntelligenceBundle>>,
): string {
  const lower = message.toLowerCase();
  const { intelligence, metrics, currency } = bundle;
  const money = (cents: number) => formatMoney(currency, cents);

  if (/^(hi|hello|hey|help)\b/i.test(message.trim())) {
    return `I can analyse **${bundle.aiContext.merchantName ?? "your store"}** sales from Reports — campaigns, promos, automations, pricing, and holidays.\n\nAsk about revenue trends, what to activate next, or price-change impact. Add **DEEPSEEK_API_KEY** for richer investigations.`;
  }

  if (lower.includes("campaign")) {
    const top = [...intelligence.campaigns].sort(
      (a, b) => b.estimatedRevenueLiftCents - a.estimatedRevenueLiftCents,
    )[0];
    if (!top) {
      return "No campaigns found in your store data. Create a WhatsApp or banner campaign, then check back after it has reach.";
    }
    return `**${top.name}** (${top.channel}, ${top.status}) has the highest modelled lift at **+${money(top.estimatedRevenueLiftCents)}** (~${top.estimatedLiftPct}%).\n\n${top.recommendation}\n\n*(Rule-based — add DEEPSEEK_API_KEY for deeper investigation.)*`;
  }

  if (lower.includes("automation")) {
    const top = [...intelligence.automations].sort(
      (a, b) => b.estimatedMonthlyLiftCents - a.estimatedMonthlyLiftCents,
    )[0];
    if (!top) {
      return "No automated campaigns yet. Use the Win-back or Review Nudge template under Campaigns and set it live.";
    }
    return `**${top.title}** is projected at **~${money(top.estimatedMonthlyLiftCents)}/month** (${top.enabled ? "enabled" : "currently off"}).\n\n${top.recommendation}`;
  }

  if (lower.includes("holiday")) {
    const next = intelligence.holidays[0];
    if (!next) {
      return "No upcoming public holidays in the next 90 days for your region. Check Compare for day-of-week patterns instead.";
    }
    return `Next holiday: **${next.holiday.localName}** on ${next.holiday.date}. Projected lift **+${next.projectedLiftPct}%** (~${money(next.projectedRevenueCents)}/day).\n\n${next.recommendation}`;
  }

  if (lower.includes("price") || lower.includes("raise") || lower.includes("pricing")) {
    const match = lower.match(/(\d+)\s*%/);
    const pct = match ? Number(match[1]) : 5;
    const scenario =
      intelligence.priceScenarios.find((s) => s.changePercent === pct) ??
      intelligence.priceScenarios.find((s) => s.scope === "menu") ??
      intelligence.priceScenarios[0];
    if (!scenario) {
      return `Your store has ${metrics.paidOrderCount} paid orders totalling ${money(metrics.totalRevenueCents)}. Add menu items to model price scenarios.`;
    }
    const delta = scenario.projectedRevenueDeltaCents;
    return `A **+${scenario.changePercent}%** change on **${scenario.label}** projects **${delta >= 0 ? "+" : ""}${money(delta)}/month** with orders ${scenario.projectedOrderChangePct}%.\n\n${scenario.recommendation}`;
  }

  if (lower.includes("promo") || lower.includes("discount")) {
    const top = [...intelligence.promos].sort((a, b) => b.netLiftCents - a.netLiftCents)[0];
    if (!top) {
      return "No promo redemptions yet. Launch a code under Promos and track lift here.";
    }
    return `**${top.name}**${top.code ? ` (${top.code})` : ""} — ${top.redemptionCount} redemptions, net lift **${money(top.netLiftCents)}**.\n\n${top.recommendation}`;
  }

  if (lower.includes("investigate") || lower.includes("weekend") || lower.includes("trend")) {
    return `**Snapshot:** ${metrics.paidOrderCount} orders · ${money(metrics.totalRevenueCents)} total · avg ${money(metrics.avgOrderCents)}/order · ~${money(metrics.avgDailyRevenueCents)}/day (${metrics.revenueChangePct >= 0 ? "+" : ""}${metrics.revenueChangePct}% vs prior window).\n\n${intelligence.summary.replace(/\*\*/g, "")}`;
  }

  return `${intelligence.summary.replace(/\*\*/g, "")}\n\nAsk about campaigns, promos, automations, pricing (+5%), or holidays. Add DEEPSEEK_API_KEY for custom investigations.`;
}

export async function chatWithReportsIntelligence(input: {
  merchantSlug: string;
  message: string;
  history?: ReportsChatTurn[];
}): Promise<ReportsIntelligenceChatResult> {
  const guard = assessReportsQuestion(input.message);
  if (!guard.allowed) {
    return { reply: guard.reply, source: "guardrail" };
  }

  const merchant = await getMerchantBySlug(input.merchantSlug);
  if (!merchant) {
    return { reply: "Merchant not found.", source: "guardrail" };
  }

  const bundle = await loadMerchantIntelligenceBundle(
    merchant.id,
    merchant.name,
    merchant.currency,
    {
      dailyRevenueTargetCents: merchant.daily_revenue_target_cents,
      weeklyRevenueTargetCents: merchant.weekly_revenue_target_cents,
      monthlyRevenueTargetCents: merchant.monthly_revenue_target_cents,
    },
  );

  if (!isDeepseekConfigured()) {
    return {
      reply: fallbackReportsReply(input.message, bundle),
      source: "rules",
    };
  }

  const dataJson = JSON.stringify(bundle.aiContext, null, 2);
  const systemPrompt = `You are the iRewards Reports intelligence assistant for a single F&B merchant.
${REPORTS_GUARDRAIL_RULES}

MERCHANT_REPORT_DATA:
${dataJson}`;

  const history = (input.history ?? []).slice(-8);
  const messages: DeepseekMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: input.message },
  ];

  const raw = await deepseekChat(messages, { temperature: 0.4 });
  if (!raw?.trim()) {
    return {
      reply: fallbackReportsReply(input.message, bundle),
      source: "rules",
    };
  }

  const lowerReply = raw.toLowerCase();
  if (
    lowerReply.includes("i cannot") &&
    (lowerReply.includes("other store") || lowerReply.includes("competitor"))
  ) {
    return { reply: REPORTS_SCOPE_REPLY, source: "guardrail" };
  }

  return { reply: raw, source: "deepseek" };
}
