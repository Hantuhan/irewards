/**
 * AI campaign planner: a merchant describes a campaign in plain words; this
 * turns it into the same When / Only if / Then workflow the builder edits.
 *
 * Nothing here writes to the database. The result is a *plan* the UI opens in
 * the wizard as an unsaved draft — the merchant's "Confirm" creates the row.
 *
 * Harness, in order:
 *   1. the model only speaks the node catalog from workflow-spec (no invented steps)
 *   2. asWorkflow() drops unknown nodes, coerceConfig() clamps every field
 *   3. sanitizeWorkflow() enforces opt-in, {code} delivery, opt-out toggle
 *   4. the Meta linter runs; a blocking result gets one repair pass
 *   5. validateWorkflow() reports what is still left for the builder
 * The same linter runs again on the server before anything reaches Meta.
 */

import { z } from "zod";
import {
  deepseekChat,
  isDeepseekConfigured,
  parseJsonFromModel,
  type DeepseekMessage,
} from "@/lib/ai/deepseek";
import { isClearlyOffTopic } from "@/lib/ai/merchant-agent-guardrails";
import {
  ACTION_DEFINITIONS,
  asWhatsAppTemplate,
  asWorkflow,
  CONDITION_DEFINITIONS,
  createNode,
  defaultWhatsAppTemplate,
  findNodeDefinition,
  TRIGGER_DEFINITIONS,
  validateWorkflow,
  whatsAppCompliance,
  workflowMessageBody,
  type CampaignNode,
  type CampaignWorkflow,
  type FieldSpec,
  type NodeDefinition,
} from "@/lib/campaigns/workflow-spec";
import { CAMPAIGN_WORKFLOW_TEMPLATES } from "@/lib/campaigns/workflow-templates";
import {
  autoFixWhatsAppTemplate,
  META_TEMPLATE_RULES_FOR_MODEL,
  type ComplianceReport,
} from "@/lib/whatsapp/meta-compliance";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type PlanChannel = "whatsapp" | "banner";
export type PlanGoal = "retention" | "acquisition" | "loyalty";

export type ComposerQuestion = {
  id: string;
  prompt: string;
  /** 2–4 tappable answers; the merchant can always type something else. */
  options: string[];
  allowFreeText: boolean;
};

export type ComposerPlan = {
  name: string;
  channel: PlanChannel;
  goal: PlanGoal;
  /** One sentence the planner uses to explain the plan. */
  summary: string;
  workflow: CampaignWorkflow;
  /** Rendered message the member would receive (null for banners / no message step). */
  messagePreview: string | null;
  /** Meta linter result for the WhatsApp step; null when there is none. */
  compliance: ComplianceReport | null;
  /** Blocking problems the builder still has to resolve before go-live. */
  workflowIssues: string[];
  /** Mechanical fixes applied to the model's draft, for transparency. */
  autoFixes: string[];
};

export type ComposerTurn = {
  role: "user" | "assistant";
  content: string;
  plan?: ComposerPlan | null;
  questions?: ComposerQuestion[];
};

export type ComposerResult = {
  status: "questions" | "ready" | "refused";
  reply: string;
  questions: ComposerQuestion[];
  plan: ComposerPlan | null;
  source: "deepseek" | "fallback" | "guardrail";
};

export type ComposerContext = {
  merchantName: string;
  currency: "MYR" | "SGD";
  /** Reward level names, so a "Gold members only" brief maps to the real tier. */
  tierNames: string[];
};

/** A brief gets at most this many rounds of clarification before the planner commits. */
export const MAX_QUESTION_ROUNDS = 2;
export const MAX_QUESTIONS_PER_ROUND = 3;

/* -------------------------------------------------------------------------- */
/* Prompt                                                                      */
/* -------------------------------------------------------------------------- */

function describeField(field: FieldSpec): string {
  switch (field.type) {
    case "select":
      return `${field.key}: ${field.options.map((o) => `"${o.value}"`).join(" | ")}${
        field.optionsSource === "tiers" ? " or an exact reward level name" : ""
      } (default "${field.default}")`;
    case "number":
      return `${field.key}: integer${field.min !== undefined ? ` ≥ ${field.min}` : ""}${
        field.max !== undefined ? ` ≤ ${field.max}` : ""
      }${field.suffix ? ` (${field.suffix})` : ""} (default ${field.default})`;
    case "money":
      return `${field.key}: amount in cents, 2000 = 20.00 (default ${field.default})`;
    case "toggle":
      return `${field.key}: true | false (default ${field.default})`;
    case "whatsapp_template":
      return `template: {"headerType":"none"|"text","headerText":"","body":"…","footer":"","buttons":[]}`;
    case "image":
      return `${field.key}: null`;
    default:
      return `${field.key}: text${field.placeholder ? ` e.g. "${field.placeholder}"` : ""}`;
  }
}

function renderCatalog(definitions: NodeDefinition[]): string {
  return definitions
    .filter((d) => !d.comingSoon && d.type !== "send_sms")
    .map((d) => {
      const fields = d.fields.length ? ` Config → ${d.fields.map(describeField).join("; ")}` : "";
      return `- "${d.type}" (${d.label}): ${d.description}${fields}`;
    })
    .join("\n");
}

function compactNode(node: CampaignNode): { type: string; config: Record<string, unknown> } {
  return { type: node.type, config: node.config };
}

function compactWorkflow(workflow: CampaignWorkflow) {
  return {
    trigger: compactNode(workflow.trigger),
    conditions: workflow.conditions.map(compactNode),
    actions: workflow.actions.map(compactNode),
    elseActions: workflow.elseActions.map(compactNode),
  };
}

function renderExamples(): string {
  return CAMPAIGN_WORKFLOW_TEMPLATES.map(
    (t) => `### ${t.title} (${t.channel}) — ${t.description}\n${JSON.stringify(compactWorkflow(t.workflow()))}`,
  ).join("\n");
}

function systemPrompt(context: ComposerContext, roundsAsked: number): string {
  const mustCommit = roundsAsked >= MAX_QUESTION_ROUNDS;
  return `You are the campaign planner inside iRewards, a table-ordering and loyalty app for cafes in Malaysia and Singapore.

## 1. Workflow catalog — read this first
Every campaign is a When → Only if → Then workflow. These are the ONLY step types that exist in iRewards — never invent others.
Before you plan anything, decide which steps from this catalog fit the merchant's brief.

Triggers (exactly one — When):
${renderCatalog(TRIGGER_DEFINITIONS)}

Conditions (all must pass — Only if):
${renderCatalog(CONDITION_DEFINITIONS)}

Actions (run in order — Then):
${renderCatalog(ACTION_DEFINITIONS)}

If a merchant asks for something outside this catalog, name the closest supported steps and suggest they tweak the rest in the builder — do not pretend unsupported steps exist.

## 2. What you can and cannot do
CAN: suggest a draft workflow (trigger + conditions + actions) mapped to the catalog above; ask clarifying questions; revise the draft when they reply with changes.
CANNOT: create, save, activate, or send campaigns — the merchant opens your draft in the workflow builder, edits copy and timing, saves, and submits to Meta themselves.
Your "reply" is shown to the merchant: plain, friendly, ≤ 60 words, no headings. Say you "suggest" or "draft" a workflow — never claim the campaign is created, saved, live, or sent.

## 3. Conversation rules
- Ask only when the answer changes the workflow: who it targets / when it fires, and what the offer is (discount %, points, or none). Never ask about tone or wording — the merchant edits copy in the builder.
- Channel: default to WhatsApp without asking. Use "banner" only when the merchant talks about the menu / table QR / in-store display. Never use SMS — it is paused.
- At most ${MAX_QUESTIONS_PER_ROUND} short questions per turn, each with 2–4 tappable options. At most ${MAX_QUESTION_ROUNDS} rounds in total.
- Rounds of questions already asked in this conversation: ${roundsAsked}.${
    mustCommit ? " You have asked enough — you MUST answer with status \"ready\" now, using sensible defaults for anything unknown." : ""
  }
- Sensible defaults beat questions: win-back after 7 days, 20% voucher valid 14 days, wait 1 hour after a first visit, wait 24 hours before a review nudge, WhatsApp as the channel.
- When the merchant replies to an existing plan with changes, return the revised plan with status "ready".
- Scope: iRewards campaigns only. For anything else answer status "refused" with one polite line.

## Merchant
- Name: ${context.merchantName}
- Currency: ${context.currency}
- Reward levels: ${context.tierNames.length ? context.tierNames.join(", ") : "(none configured)"}

## Plan requirements
- WhatsApp plans MUST include the "marketing_opted_in" condition.
- A discount means an "issue_voucher" action AND "{code}" inside the message. Points mean "award_points" — it runs the moment the trigger fires, so word the message as already done ("we've added 50 points"), never as a promise for later.
- Put a "wait" step (≥ 1 hour) before a message that follows "order_paid" or "first_visit" unless the merchant asked for immediate.
- Banner plans: trigger "storefront_opened", optional "day_of_week" condition with days "weekend" when they say weekend/Sat–Sun, action "show_banner" with title ≤ 40 chars and text ≤ 120 chars. Mention uploading a promo photo in the builder — imageUrl is set there, not in JSON.
- name: ≤ 40 chars, e.g. "Win-back · 7 days". goal: "retention" (bring people back), "acquisition" (new / first visits) or "loyalty" (reward regulars).

${META_TEMPLATE_RULES_FOR_MODEL}

## Examples of good plans
${renderExamples()}

## Output — JSON only, no markdown fences
{"status":"questions"|"ready"|"refused","reply":"…","questions":[{"id":"offer","prompt":"What should members get?","options":["20% off voucher","50 bonus points","Just a message"],"allowFreeText":true}],"plan":{"name":"…","channel":"whatsapp"|"banner","goal":"retention"|"acquisition"|"loyalty","summary":"one sentence","workflow":{"trigger":{"type":"…","config":{}},"conditions":[{"type":"…","config":{}}],"actions":[{"type":"…","config":{}}],"elseActions":[]}}}
"questions" only with status "questions"; "plan" only with status "ready".`;
}

/* -------------------------------------------------------------------------- */
/* Model response schema                                                       */
/* -------------------------------------------------------------------------- */

const questionSchema = z.object({
  id: z.string().min(1).max(40),
  prompt: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(60)).min(2).max(4),
  allowFreeText: z.boolean().optional().default(true),
});

const rawNodeSchema = z.object({
  type: z.string().min(1),
  config: z.record(z.unknown()).optional().default({}),
});

const rawPlanSchema = z.object({
  name: z.string().min(1).max(60),
  channel: z.enum(["whatsapp", "banner"]),
  goal: z.enum(["retention", "acquisition", "loyalty"]).optional().default("retention"),
  summary: z.string().max(300).optional().default(""),
  workflow: z.object({
    trigger: rawNodeSchema,
    conditions: z.array(rawNodeSchema).optional().default([]),
    actions: z.array(rawNodeSchema).optional().default([]),
    elseActions: z.array(rawNodeSchema).optional().default([]),
  }),
});

type RawPlan = z.infer<typeof rawPlanSchema>;

const modelResponseSchema = z.object({
  status: z.enum(["questions", "ready", "refused"]),
  reply: z.string().min(1).max(1500),
  questions: z.array(questionSchema).max(MAX_QUESTIONS_PER_ROUND).optional().default([]),
  plan: rawPlanSchema.nullable().optional(),
});

/* -------------------------------------------------------------------------- */
/* Sanitising                                                                  */
/* -------------------------------------------------------------------------- */

function clampNumber(value: unknown, fallback: number, min?: number, max?: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  let out = Math.round(n);
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
}

/** Every config value ends up the type and range its FieldSpec declares. */
function coerceConfig(node: CampaignNode, context: ComposerContext): { node: CampaignNode; fixes: string[] } {
  const definition = findNodeDefinition(node.type);
  if (!definition) return { node, fixes: [] };
  const fixes: string[] = [];
  const config: Record<string, unknown> = { ...node.config };

  for (const field of definition.fields) {
    const value = config[field.key];
    switch (field.type) {
      case "number":
        config[field.key] = clampNumber(value, field.default, field.min, field.max);
        break;
      case "money":
        config[field.key] = clampNumber(value, field.default, 0);
        break;
      case "toggle":
        config[field.key] = typeof value === "boolean" ? value : value === "true" ? true : value === "false" ? false : field.default;
        break;
      case "select": {
        const str = typeof value === "string" ? value.trim() : "";
        if (field.optionsSource === "tiers") {
          const match = context.tierNames.find((t) => t.toLowerCase() === str.toLowerCase());
          config[field.key] = match ?? "";
        } else {
          config[field.key] = field.options.some((o) => o.value === str) ? str : field.default;
        }
        break;
      }
      case "text":
      case "textarea":
        config[field.key] = typeof value === "string" ? value : field.default;
        break;
      case "image":
        config[field.key] = typeof value === "string" && value.trim() ? value : null;
        break;
      case "whatsapp_template": {
        const template = asWhatsAppTemplate(value);
        const { fixed, applied } = autoFixWhatsAppTemplate(template);
        fixes.push(...applied);
        config[field.key] = fixed;
        break;
      }
    }
  }
  return { node: { ...node, config }, fixes };
}

function appendToMessage(workflow: CampaignWorkflow, sentence: string): boolean {
  for (const action of workflow.actions) {
    if (action.type === "send_whatsapp") {
      const template = asWhatsAppTemplate(action.config.template);
      action.config.template = { ...template, body: `${template.body.trim()}\n\n${sentence}`.trim() };
      return true;
    }
    if (action.type === "send_sms") {
      action.config.body = `${String(action.config.body ?? "").trim()} ${sentence}`.trim();
      return true;
    }
  }
  return false;
}

/** Structural rules the model sometimes forgets; each fix is reported to the merchant. */
function sanitizeWorkflow(
  input: CampaignWorkflow,
  channel: PlanChannel,
  name: string,
  context: ComposerContext,
): { workflow: CampaignWorkflow; fixes: string[] } {
  const fixes: string[] = [];
  const coerce = (node: CampaignNode) => {
    const result = coerceConfig(node, context);
    fixes.push(...result.fixes);
    return result.node;
  };
  const workflow: CampaignWorkflow = {
    version: 1,
    trigger: coerce(input.trigger),
    conditions: input.conditions.map(coerce),
    actions: input.actions.map(coerce),
    elseActions: input.elseActions.map(coerce),
  };

  const messaging = channel === "whatsapp";

  if (messaging && !workflow.conditions.some((c) => c.type === "marketing_opted_in")) {
    workflow.conditions.unshift(createNode("marketing_opted_in"));
    fixes.push("Added the marketing opt-in check (PDPA)");
  }

  // Model drafted SMS (paused) — keep the words, switch to WhatsApp.
  if (channel === "whatsapp" && !workflow.actions.some((a) => a.type === "send_whatsapp")) {
    const sms = workflow.actions.find((a) => a.type === "send_sms");
    if (sms) {
      const { fixed } = autoFixWhatsAppTemplate({
        ...defaultWhatsAppTemplate(),
        body: String(sms.config.body ?? ""),
      });
      const replacement = createNode("send_whatsapp");
      replacement.config.template = fixed;
      workflow.actions = workflow.actions.map((a) => (a === sms ? replacement : a));
      fixes.push("Switched the message step to WhatsApp (SMS is paused)");
    }
  }

  const issuesVoucher = workflow.actions.some((a) => a.type === "issue_voucher");
  const body = workflowMessageBody(workflow) ?? "";
  if (issuesVoucher && !/\{code\}/i.test(body)) {
    if (appendToMessage(workflow, "Use code {code} at checkout.")) fixes.push("Added {code} so the voucher reaches the member");
  }

  if (channel === "banner") {
    const banner = workflow.actions.find((a) => a.type === "show_banner");
    if (banner && !String(banner.config.title ?? "").trim()) {
      banner.config.title = name;
      fixes.push("Used the campaign name as the banner headline");
    }
  }

  // Dedupe: coerceConfig may report the same fix for several nodes.
  return { workflow, fixes: [...new Set(fixes)] };
}

function buildPlan(raw: RawPlan, context: ComposerContext): ComposerPlan {
  const normalized = asWorkflow({ version: 1, ...raw.workflow }, raw.channel);
  const { workflow, fixes } = sanitizeWorkflow(normalized, raw.channel, raw.name, context);

  const whatsapp = workflow.actions.find((a) => a.type === "send_whatsapp");
  const compliance = whatsapp
    ? whatsAppCompliance(asWhatsAppTemplate(whatsapp.config.template), context.merchantName)
    : null;

  return {
    name: raw.name.trim().slice(0, 60),
    channel: raw.channel,
    goal: raw.goal,
    summary: raw.summary.trim(),
    workflow,
    messagePreview: workflowMessageBody(workflow),
    compliance,
    workflowIssues: validateWorkflow(workflow, raw.channel),
    autoFixes: fixes,
  };
}

function planForModel(plan: ComposerPlan): string {
  return JSON.stringify({
    name: plan.name,
    channel: plan.channel,
    goal: plan.goal,
    workflow: compactWorkflow(plan.workflow),
  });
}

function countQuestionRounds(history: ComposerTurn[]): number {
  return history.filter((t) => t.role === "assistant" && (t.questions?.length ?? 0) > 0).length;
}

/* -------------------------------------------------------------------------- */
/* Guided fallback (no model)                                                  */
/* -------------------------------------------------------------------------- */

type Intent = "winback" | "welcome" | "review" | "postorder" | "banner" | "milestone" | "broadcast";

const INTENT_PATTERNS: { intent: Intent; pattern: RegExp }[] = [
  { intent: "banner", pattern: /\bbanner\b|menu strip|when they scan|on the (?:table )?menu|storefront/i },
  { intent: "review", pattern: /\breview|google|rating/i },
  { intent: "winback", pattern: /win.?back|miss you|haven'?t (?:visited|come|been)|hasn'?t visited|lapsed|inactive|come back|not (?:visited|come|been)|no visit/i },
  { intent: "welcome", pattern: /welcome|new member|first[- ]?(?:time|visit)|just joined|signs? up/i },
  { intent: "milestone", pattern: /milestone|reach(?:es|ed)? \d+ ?(?:pts|points)/i },
  { intent: "postorder", pattern: /after (?:an |each |every |their )?(?:order|payment|purchase|meal)|bounce.?back|thank(?:s|-you)? (?:after|for)/i },
];

function detectIntent(text: string): Intent {
  for (const { intent, pattern } of INTENT_PATTERNS) if (pattern.test(text)) return intent;
  return "broadcast";
}

function extractSignals(text: string, context: ComposerContext) {
  const percent = text.match(/(\d{1,2})\s*%/);
  const days = text.match(/(\d{1,3})\s*days?\b/i);
  const points = text.match(/(\d{2,5})\s*(?:pts|points)\b/i);
  const minSpend = text.match(/(?:spend|order|bill)s?\s*(?:of\s*)?(?:over|above|at least|more than|min(?:imum)?)\s*(?:rm|sgd|\$)?\s*(\d{1,4})/i);
  const tier = context.tierNames.find((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
  return {
    percent: percent ? Math.min(100, Math.max(1, Number(percent[1]))) : null,
    days: days ? Math.min(365, Math.max(1, Number(days[1]))) : null,
    points: points ? Number(points[1]) : null,
    minSpendCents: minSpend ? Number(minSpend[1]) * 100 : null,
    tier: tier ?? null,
    noOffer: /no offer|just a message|no discount|without (?:a )?(?:discount|voucher|offer)|message only/i.test(text),
    timing: /\bmanual|send once|one.?off|right now|today|this week|weekend|blast|broadcast\b/i.test(text),
  };
}

function node(type: string, config: Record<string, unknown> = {}): CampaignNode {
  const created = createNode(type);
  return { ...created, config: { ...created.config, ...config } };
}

function whatsappNode(body: string): CampaignNode {
  return node("send_whatsapp", { template: { ...defaultWhatsAppTemplate(), body, includeOptOut: true } });
}

function fallbackCompose(
  history: ComposerTurn[],
  message: string,
  context: ComposerContext,
  note: string | null,
): ComposerResult {
  const text = [...history.filter((t) => t.role === "user").map((t) => t.content), message].join("\n");
  const intent = detectIntent(text);
  const signals = extractSignals(text, context);
  const roundsAsked = countQuestionRounds(history);
  const hasOffer = signals.percent !== null || signals.points !== null || signals.noOffer;

  if (roundsAsked < MAX_QUESTION_ROUNDS) {
    const questions: ComposerQuestion[] = [];
    if (intent === "broadcast" && !signals.timing) {
      questions.push({
        id: "timing",
        prompt: "When should it go out?",
        options: [
          "Send once, manually",
          "When a member hasn't visited for 30 days",
          "1 hour after a first visit",
          "24 hours after an order is paid",
        ],
        allowFreeText: true,
      });
    }
    if (intent !== "review" && intent !== "banner" && !hasOffer) {
      questions.push({
        id: "offer",
        prompt: "What should members get?",
        options: ["20% off voucher", "10% off voucher", "50 bonus points", "Just a message, no offer"],
        allowFreeText: true,
      });
    }
    if (questions.length > 0) {
      return {
        status: "questions",
        reply: "Quick check before I build it:",
        questions,
        plan: null,
        source: "fallback",
      };
    }
  }

  const pct = signals.percent;
  const pts = signals.points;
  const expiry = 14;
  const voucher = pct ? node("issue_voucher", { name: "Campaign perk", discountPercent: pct, expiryDays: expiry }) : null;
  const award = !pct && pts ? node("award_points", { points: pts, reason: "campaign_bonus" }) : null;
  const offerLine = pct
    ? `Enjoy ${pct}% off your next visit — use code {code} at checkout within ${expiry} days.`
    : pts
      ? `We've added ${pts} bonus points to your account — come and use them soon.`
      : "Show this message on your next visit for a little treat on us.";

  const conditions: CampaignNode[] = [node("marketing_opted_in")];
  if (signals.tier) conditions.push(node("member_tier", { tier: signals.tier }));

  let raw: RawPlan;
  switch (intent) {
    case "winback": {
      const days = signals.days ?? 7;
      raw = {
        name: `Win-back · ${days} days`,
        channel: "whatsapp",
        goal: "retention",
        summary: `Members who have not visited for ${days} days get a WhatsApp nudge${pct ? ` with ${pct}% off` : ""}.`,
        workflow: {
          trigger: node("no_visit_days", { days }),
          conditions,
          actions: [whatsappNode(`Hi {name}, we miss you at {merchant}! ${offerLine}`), voucher, award].filter(Boolean) as CampaignNode[],
          elseActions: [],
        },
      };
      break;
    }
    case "welcome":
      raw = {
        name: "Welcome series",
        channel: "whatsapp",
        goal: "acquisition",
        summary: "One hour after a member's first paid visit, thank them and introduce the club.",
        workflow: {
          trigger: node("first_visit"),
          conditions,
          actions: [
            node("wait", { amount: 1, unit: "hours" }),
            whatsappNode(`Hi {name}, welcome to {merchant}! Thanks for visiting today — you're now on our rewards list. ${offerLine}`),
            voucher,
            award,
          ].filter(Boolean) as CampaignNode[],
          elseActions: [],
        },
      };
      break;
    case "review":
      raw = {
        name: "Review nudge · 24h",
        channel: "whatsapp",
        goal: "retention",
        summary: "A day after a paid order, ask happy diners for a Google review.",
        workflow: {
          trigger: node("order_paid"),
          conditions,
          actions: [
            node("wait", { amount: 24, unit: "hours" }),
            whatsappNode("Hi {name}, thanks for dining at {merchant}! If you enjoyed your visit, we'd love a quick Google review — it helps us a lot."),
          ],
          elseActions: [],
        },
      };
      break;
    case "postorder":
      raw = {
        name: "Bounce-back offer",
        channel: "whatsapp",
        goal: "retention",
        summary: `After a paid order${signals.minSpendCents ? ` over ${context.currency} ${signals.minSpendCents / 100}` : ""}, send a thank-you${pct ? ` with ${pct}% off the next visit` : ""}.`,
        workflow: {
          trigger: node("order_paid", { minSpend: signals.minSpendCents ?? 0 }),
          conditions,
          actions: [
            node("wait", { amount: 1, unit: "hours" }),
            whatsappNode(`Hi {name}, thanks for visiting {merchant} today! ${offerLine}`),
            voucher,
            award,
          ].filter(Boolean) as CampaignNode[],
          elseActions: [],
        },
      };
      break;
    case "banner": {
      const bannerConditions: CampaignNode[] = [];
      if (/\bweekend|sat(?:urday)?|sun(?:day)?\b/i.test(text)) {
        bannerConditions.push(node("day_of_week", { days: "weekend" }));
      }
      raw = {
        name: pct ? `${pct}% off · weekend menu` : "Weekend promo photo",
        channel: "banner",
        goal: "acquisition",
        summary: bannerConditions.length
          ? "Show a promo photo at the top of the table menu on weekends (Sat–Sun)."
          : "Show a promo photo at the top of the table menu while the campaign is live.",
        workflow: {
          trigger: node("storefront_opened"),
          conditions: bannerConditions,
          actions: [
            node("show_banner", {
              title: pct ? `${pct}% off today` : "Weekend special",
              text: pct
                ? `Members get ${pct}% off — join iRewards at checkout to claim it.`
                : "20% off this Sat–Sun",
            }),
          ],
          elseActions: [],
        },
      };
      break;
    }
    case "milestone": {
      const points = pts ?? 500;
      raw = {
        name: `Points milestone · ${points}`,
        channel: "whatsapp",
        goal: "loyalty",
        summary: `Celebrate members the moment they pass ${points} lifetime points.`,
        workflow: {
          trigger: node("points_milestone", { points }),
          conditions,
          actions: [
            whatsappNode(`Hi {name}, you've just passed ${points} points at {merchant} — thank you for being a regular! ${pct ? `Enjoy ${pct}% off your next visit with code {code}.` : "Show this message next time for a treat on us."}`),
            voucher,
          ].filter(Boolean) as CampaignNode[],
          elseActions: [],
        },
      };
      break;
    }
    default:
      raw = {
        name: "Member broadcast",
        channel: "whatsapp",
        goal: "loyalty",
        summary: `A one-off message to opted-in members${pct ? ` with ${pct}% off` : ""}.`,
        workflow: {
          trigger: node("manual"),
          conditions,
          actions: [
            whatsappNode(`Hi {name}, this week only at {merchant}: ${pct ? `${pct}% off for members — use code {code} at checkout.` : "show this message for your member perk. See you soon!"}`),
            voucher,
            award,
          ].filter(Boolean) as CampaignNode[],
          elseActions: [],
        },
      };
  }

  const plan = buildPlan(raw, context);
  return {
    status: "ready",
    reply: `Here's a suggested ${plan.name} campaign from your brief: ${plan.summary} Open it in the builder to edit, save, and submit to Meta.${note ? `\n\n_${note}_` : ""}`,
    questions: [],
    plan,
    source: "fallback",
  };
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

export async function composeCampaign(input: {
  message: string;
  history: ComposerTurn[];
  context: ComposerContext;
}): Promise<ComposerResult> {
  const message = input.message.trim();
  const history = input.history.slice(-10);

  if (!message) {
    return {
      status: "refused",
      reply: "Tell me what the campaign should do — for example “win back members who haven't visited in a month with 20% off”.",
      questions: [],
      plan: null,
      source: "guardrail",
    };
  }
  if (isClearlyOffTopic(message)) {
    return {
      status: "refused",
      reply: "I can only plan iRewards campaigns — describe who you want to reach and what they should get.",
      questions: [],
      plan: null,
      source: "guardrail",
    };
  }

  if (!isDeepseekConfigured()) {
    return fallbackCompose(history, message, input.context, "Planner is in guided mode — add DEEPSEEK_API_KEY for smarter briefs.");
  }

  const roundsAsked = countQuestionRounds(history);
  const messages: DeepseekMessage[] = [
    { role: "system", content: systemPrompt(input.context, roundsAsked) },
    ...history.map((turn) => ({
      role: turn.role,
      content:
        turn.role === "assistant" && turn.plan
          ? `${turn.content}\n\n[Current plan]\n${planForModel(turn.plan)}`
          : turn.content,
    })),
    { role: "user", content: message },
  ];

  let parsed: z.infer<typeof modelResponseSchema> | null = null;
  try {
    const raw = await deepseekChat(messages, { temperature: 0.3, json: true });
    const json = raw ? parseJsonFromModel<unknown>(raw) : null;
    const result = json ? modelResponseSchema.safeParse(json) : null;
    parsed = result?.success ? result.data : null;
  } catch (error) {
    console.error("[campaign-composer] model call failed:", error);
  }
  if (!parsed) {
    return fallbackCompose(history, message, input.context, "The AI planner did not answer; this draft came from the guided planner instead.");
  }

  if (parsed.status === "refused") {
    return { status: "refused", reply: parsed.reply, questions: [], plan: null, source: "deepseek" };
  }

  if (parsed.status === "questions" && roundsAsked < MAX_QUESTION_ROUNDS && parsed.questions.length > 0) {
    return {
      status: "questions",
      reply: parsed.reply,
      questions: parsed.questions.map((q, i) => ({ ...q, id: q.id || `q${i + 1}` })),
      plan: null,
      source: "deepseek",
    };
  }

  if (!parsed.plan) {
    // Out of question rounds (or "ready" with nothing attached): commit with the guided planner.
    return fallbackCompose(history, message, input.context, null);
  }

  let plan = buildPlan(parsed.plan, input.context);

  // One repair pass when the copy would be rejected by Meta.
  if (plan.compliance && !plan.compliance.ok) {
    try {
      const problems = plan.compliance.blockers.map((b) => `- ${b.message}${b.hint ? ` (${b.hint})` : ""}`).join("\n");
      const repairRaw = await deepseekChat(
        [
          ...messages,
          { role: "assistant", content: JSON.stringify(parsed) },
          {
            role: "user",
            content: `The WhatsApp copy failed Meta's template checks:\n${problems}\n\nRewrite the copy to fix every point and return the complete JSON again with status "ready". Keep everything else the same.`,
          },
        ],
        { temperature: 0.2, json: true },
      );
      const repairJson = repairRaw ? parseJsonFromModel<unknown>(repairRaw) : null;
      const repaired = repairJson ? modelResponseSchema.safeParse(repairJson) : null;
      if (repaired?.success && repaired.data.plan) {
        const candidate = buildPlan(repaired.data.plan, input.context);
        const before = plan.compliance.blockers.length;
        const after = candidate.compliance?.blockers.length ?? 0;
        if (after < before) plan = candidate;
      }
    } catch (error) {
      console.error("[campaign-composer] repair pass failed:", error);
    }
  }

  return { status: "ready", reply: parsed.reply, questions: [], plan, source: "deepseek" };
}
