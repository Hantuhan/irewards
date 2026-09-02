import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
import {
  autoFixWhatsAppTemplate,
  lintWhatsAppTemplate,
  META_TEMPLATE_RULES_FOR_MODEL,
  type ComplianceReport,
} from "@/lib/whatsapp/meta-compliance";

export type CampaignDraftInput = {
  merchantName: string;
  channel: "whatsapp" | "banner";
  goal: string;
  audience?: string;
  tone?: string;
};

export type CampaignDraftResult = {
  messageBody?: string;
  bannerTitle?: string;
  bannerText?: string;
  rationale?: string;
  /** Meta linter verdict for WhatsApp drafts, so the editor can show it straight away. */
  compliance?: ComplianceReport;
  source: "deepseek" | "template";
};

const TEMPLATES: Record<CampaignDraftInput["channel"], CampaignDraftResult> = {
  whatsapp: {
    messageBody:
      "Hi {name}, {merchant} here! Thanks for visiting us. Scan any table QR to order next time — members get exclusive perks.",
    source: "template",
  },
  banner: {
    bannerTitle: "This week only",
    bannerText: "Order from your table and earn iRewards points.",
    source: "template",
  },
};

/**
 * WhatsApp drafts go through the same harness as the planner: mechanical
 * auto-fixes, the Meta linter, and one repair round-trip when it still blocks.
 */
function harnessWhatsAppDraft(body: string, merchantName: string) {
  const { fixed } = autoFixWhatsAppTemplate({ body, includeOptOut: true, merchantName });
  return { body: fixed.body, compliance: lintWhatsAppTemplate(fixed) };
}

/** The template editor's "Draft with AI" button. One message, no workflow. */
export async function draftCampaignCopy(input: CampaignDraftInput): Promise<CampaignDraftResult> {
  if (!isDeepseekConfigured()) {
    return { ...TEMPLATES[input.channel], rationale: "Set DEEPSEEK_API_KEY for AI drafts." };
  }

  const isWhatsApp = input.channel === "whatsapp";
  const system = `You write short F&B marketing copy for cafes in Malaysia and Singapore.
Channel: ${input.channel}.
Placeholders you may use: {merchant} (store name), {name} (member), {code} (promo code — only if a code is part of the goal).
${isWhatsApp ? META_TEMPLATE_RULES_FOR_MODEL : ""}
Return JSON only: { "messageBody"?, "bannerTitle"?, "bannerText"?, "rationale" } — "rationale" is one short sentence for the merchant.`;
  const user = `Merchant: ${input.merchantName}
Goal: ${input.goal}
Audience: ${input.audience ?? "all members"}
Tone: ${input.tone ?? "warm, local, concise"}`;

  const content = await deepseekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true, temperature: 0.5 },
  );
  const parsed = content ? parseJsonFromModel<CampaignDraftResult>(content) : null;
  if (!parsed) return TEMPLATES[input.channel];

  if (!isWhatsApp || !parsed.messageBody) return { ...parsed, source: "deepseek" };

  let draft = harnessWhatsAppDraft(parsed.messageBody, input.merchantName);
  if (!draft.compliance.ok) {
    const problems = draft.compliance.blockers.map((b) => `- ${b.message}${b.hint ? ` ${b.hint}` : ""}`).join("\n");
    const repaired = await deepseekChat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
        { role: "assistant", content: content ?? "" },
        {
          role: "user",
          content: `That copy would be rejected by Meta:\n${problems}\n\nRewrite it to fix every point and return the same JSON.`,
        },
      ],
      { json: true, temperature: 0.3 },
    ).catch(() => null);
    const repairedParsed = repaired ? parseJsonFromModel<CampaignDraftResult>(repaired) : null;
    if (repairedParsed?.messageBody) {
      const candidate = harnessWhatsAppDraft(repairedParsed.messageBody, input.merchantName);
      if (candidate.compliance.blockers.length < draft.compliance.blockers.length) {
        draft = candidate;
        parsed.rationale = repairedParsed.rationale ?? parsed.rationale;
      }
    }
  }

  return {
    ...parsed,
    messageBody: draft.body,
    compliance: draft.compliance,
    source: "deepseek",
  };
}
