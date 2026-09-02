import { deepseekChat, isDeepseekConfigured, type DeepseekMessage } from "@/lib/ai/deepseek";
import { MERCHANT_APP_KNOWLEDGE } from "@/lib/ai/merchant-app-knowledge";
import {
  ACTION_PROPOSAL_RULES,
  detectFallbackAction,
  messageRequestsAction,
  parseAgentModelResponse,
  type PendingAgentAction,
} from "@/lib/ai/merchant-agent-actions";
import {
  assessMerchantAgentMessage,
  GUARDRAIL_SYSTEM_RULES,
} from "@/lib/ai/merchant-agent-guardrails";
import { POINTS_PROGRAM_KNOWLEDGE } from "@/lib/loyalty/points-program-knowledge";
import {
  effectiveEarnBackPercent,
  simulatePointsEarn,
  simulatePointsRedeem,
} from "@/lib/loyalty/points-calculator";
import { summarizePointsRule, type PointsRule } from "@/lib/loyalty/points-rules";
import { listPointsRules } from "@/lib/db/points-rules-repository";
import { getMerchantBySlug, getRewardLevels } from "@/lib/db/repository";
import { mapRewardLevel } from "@/lib/loyalty/reward-level-map";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AgentChatResult = {
  reply: string;
  source: "deepseek" | "fallback" | "guardrail";
  pendingAction: PendingAgentAction | null;
};

export async function buildMerchantProgramContext(merchantSlug: string): Promise<string> {
  const merchant = await getMerchantBySlug(merchantSlug);
  if (!merchant) return "Merchant not found.";

  const [levels, rules] = await Promise.all([
    getRewardLevels(merchant.id),
    listPointsRules(merchant.id),
  ]);
  const mapped = levels.map((l) => mapRewardLevel(l));
  const ptsPerRm = Number(merchant.points_per_ringgit ?? 0.1);
  const centsPerPt = Number(merchant.points_redeem_cents_per_point ?? 10);
  const currency = merchant.currency;
  const backPct = effectiveEarnBackPercent(ptsPerRm, centsPerPt);

  const tierLines = mapped
    .map(
      (l) =>
        `- ${l.name}: ${l.minLifetimePoints}+ lifetime pts, ${l.pointsMultiplier}× earn, ${l.discountPercent}% checkout discount, birthday ${l.birthdayPoints} pts, expiry ${l.pointExpiryDays ?? "program default"} days`,
    )
    .join("\n");

  const ruleLines =
    rules.length === 0
      ? "- (no points rules)"
      : rules
          .map((r) => `- ${r.name} [${r.status}]: ${summarizePointsRule(r, mapped)}`)
          .join("\n");

  const mondayExample = simulatePointsEarn({
    totalCents: 5000,
    pointsPerRinggit: ptsPerRm,
    tierMultiplier: mapped[2]?.pointsMultiplier ?? 1.25,
    rules: rules as PointsRule[],
    tierName: mapped[2]?.name ?? "Silver",
    at: new Date("2026-09-07T12:00:00+08:00"),
  });

  const redeemExample = simulatePointsRedeem({
    pointsToRedeem: 100,
    centsPerPoint: centsPerPt,
    subtotalCents: 4500,
    pointsBalance: 200,
  });

  return `
Merchant: ${merchant.name} (${merchantSlug})
Currency: ${currency}
Points per ${currency === "SGD" ? "SGD" : "RM"}: ${ptsPerRm}
Redemption: ${centsPerPt} sen/cents per point (${currency} ${(centsPerPt / 100).toFixed(2)} off per point)
Approximate earn-back: ${backPct.toFixed(1)}% of spend

Tiers:
${tierLines}

Points rules:
${ruleLines}

Worked example (RM 50, ${mapped[2]?.name ?? "Silver"}, Monday if Monday rule active):
- Base ${mondayExample.basePoints} pts → ${mondayExample.finalPoints} pts after ${mondayExample.combinedMultiplier}× multiplier

Worked redeem example (100 pts requested, RM 45 subtotal, 200 balance):
- Applied ${redeemExample.pointsApplied} pts → ${currency} ${(redeemExample.discountCents / 100).toFixed(2)} off${redeemExample.cappedReason ? ` (${redeemExample.cappedReason})` : ""}
`.trim();
}

function fallbackReply(message: string, context: string): string {
  const q = message.toLowerCase();
  if (q.includes("monday") || q.includes("double")) {
    return `Monday double points is configured under **iRewards program → Points rule** (not the Points tab). Set multiplier to 2 and add condition **Day of week is Monday**. Save changes at the top.\n\nYour current rules:\n${context.split("Points rules:")[1]?.split("Worked example")[0] ?? ""}`;
  }
  if (q.includes("redeem") || q.includes("burn")) {
    return `Members redeem at checkout. Each point = merchant's cents-per-point setting (see Points tab). Discount cannot exceed subtotal or balance.\n\n${POINTS_PROGRAM_KNOWLEDGE.split("### Redeem")[1]?.split("### Industry")[0] ?? ""}`;
  }
  if (q.includes("earn") || q.includes("calculat")) {
    return `Earn flow: base = floor(RM × pts/RM), then × max(tier multiplier, matching rule multiplier). Members only earn after paid orders.\n\nSee your live numbers in context below.\n\n${context.slice(0, 800)}...`;
  }
  if (!isDeepseekConfigured()) {
    return `I'm the iRewards setup assistant. I can help with **orders, menu, membership, campaigns, and automation**.\n\nAsk me to explain settings, or say e.g. *"set earn rate to 0.15 pts/RM"* — I'll propose the change for you to confirm.\n\n*(Add DEEPSEEK_API_KEY in .env.local and restart \`npm run dev\` for full AI replies.)*`;
  }
  return `I'm the iRewards setup assistant. I can help with **orders, menu, membership, campaigns, and automation**.\n\nAsk me to explain settings, or say e.g. *"set earn rate to 0.15 pts/RM"* — I'll propose the change for you to confirm.`;
}

export async function chatWithMerchantAgent(input: {
  merchantSlug: string;
  message: string;
  history?: ChatTurn[];
}): Promise<AgentChatResult> {
  const guard = assessMerchantAgentMessage(input.message);
  if (!guard.allowed) {
    return { reply: guard.reply, source: "guardrail", pendingAction: null };
  }

  const merchant = await getMerchantBySlug(input.merchantSlug);
  const context = await buildMerchantProgramContext(input.merchantSlug);
  const wantsAction = messageRequestsAction(input.message);

  if (!isDeepseekConfigured()) {
    const reply = fallbackReply(input.message, context);
    const pendingAction =
      merchant && wantsAction
        ? detectFallbackAction(input.message, {
            pointsPerRinggit: Number(merchant.points_per_ringgit ?? 0.1),
            pointsRedeemCentsPerPoint: Number(merchant.points_redeem_cents_per_point ?? 10),
          })
        : null;
    const actionNote = pendingAction
      ? "\n\nTap **Confirm change** below to apply this to your live settings."
      : "";
    return {
      reply: reply + actionNote,
      source: "fallback",
      pendingAction,
    };
  }

  const messages: DeepseekMessage[] = [
    {
      role: "system",
      content: `You are the iRewards merchant setup agent for cafes in Malaysia and Singapore.
Answer clearly with step-by-step math when asked about points.
Only describe behaviour that matches iRewards production rules below.
Use markdown sparingly (bold for tab names). Keep answers under 300 words unless calculating.

${GUARDRAIL_SYSTEM_RULES}

${MERCHANT_APP_KNOWLEDGE}

${POINTS_PROGRAM_KNOWLEDGE}

${ACTION_PROPOSAL_RULES}

--- LIVE MERCHANT DATA ---
${context}`,
    },
    ...(input.history ?? []).slice(-8).map((t) => ({
      role: t.role as "user" | "assistant",
      content: t.content,
    })),
    { role: "user", content: input.message },
  ];

  const raw = await deepseekChat(messages, {
    temperature: 0.35,
    json: wantsAction,
  });

  if (!raw) {
    return {
      reply:
        "DeepSeek returned an empty response. Check your API key balance and try again.",
      source: "fallback",
      pendingAction: null,
    };
  }

  if (wantsAction) {
    const { reply, pendingAction } = parseAgentModelResponse(raw);
    const actionNote = pendingAction
      ? "\n\nTap **Confirm change** below to apply this to your live settings."
      : "";
    return {
      reply: reply + actionNote,
      source: "deepseek",
      pendingAction,
    };
  }

  return { reply: raw, source: "deepseek", pendingAction: null };
}
