import { deepseekChat, isDeepseekConfigured } from "@/lib/ai/deepseek";
import {
  defaultPrivacyPolicy,
  defaultRefundPolicy,
  type DefaultLegalPolicyContext,
} from "@/lib/merchant/default-legal-policies";

export type LegalPolicyType = "refund" | "privacy";

export type LegalPolicyDraftInput = {
  merchantName: string;
  currency: "MYR" | "SGD";
  storeEmail?: string | null;
  policyType: LegalPolicyType;
  prompt: string;
  existingText?: string;
};

export type LegalPolicyDraftResult = {
  text: string;
  source: "deepseek" | "template";
};

const TEMPLATES: Record<LegalPolicyType, (ctx: DefaultLegalPolicyContext) => string> = {
  refund: defaultRefundPolicy,
  privacy: defaultPrivacyPolicy,
};

export async function draftLegalPolicy(
  input: LegalPolicyDraftInput,
): Promise<LegalPolicyDraftResult> {
  const ctx: DefaultLegalPolicyContext = {
    merchantName: input.merchantName,
    currency: input.currency,
    storeEmail: input.storeEmail,
  };
  const fallback = TEMPLATES[input.policyType](ctx);

  if (!input.prompt.trim()) {
    return { text: fallback, source: "template" };
  }

  if (!isDeepseekConfigured()) {
    return { text: fallback, source: "template" };
  }

  const policyLabel = input.policyType === "refund" ? "refund policy" : "privacy policy";
  const region = input.currency === "MYR" ? "Malaysia" : "Singapore";

  const content = await deepseekChat([
    {
      role: "system",
      content: `You write clear, plain-text ${policyLabel} pages for independent cafes and F&B merchants in ${region}.
Use short paragraphs and bullet points where helpful. No markdown headers (#). No HTML.
Mention PDPA (Malaysia) or PDPA Singapore where relevant for privacy policies.
Keep refund policies practical for dine-in and table QR ordering.
Return only the policy body text — no preamble.`,
    },
    {
      role: "user",
      content: `Merchant: ${input.merchantName}
Currency: ${input.currency}
Merchant notes / instructions: ${input.prompt.trim()}
${input.existingText?.trim() ? `\nExisting draft to improve or expand:\n${input.existingText.trim()}` : ""}`,
    },
  ]);

  if (!content) {
    return { text: fallback, source: "template" };
  }

  return { text: content.trim(), source: "deepseek" };
}
