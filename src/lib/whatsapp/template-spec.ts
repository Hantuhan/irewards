/**
 * Pure helpers shared by the browser (approval panel) and the server
 * (submission + sending). No env access, no I/O.
 */

import type { WhatsAppTemplateStatus } from "@/lib/db/types";

export const TEMPLATE_LANGUAGE = "en";

/** Placeholder tokens the editor offers, in the order they may appear in copy. */
export const TEMPLATE_TOKENS = ["merchant", "name", "code"] as const;
export type TemplateToken = (typeof TEMPLATE_TOKENS)[number];

const TOKEN_PATTERN = /\{(merchant|name|code)\}/gi;

export type TemplateValues = Partial<Record<TemplateToken, string>>;

/**
 * Meta templates use positional `{{1}}`, `{{2}}`… variables. We assign a
 * number to each distinct token in order of first appearance so the same
 * copy always maps to the same variable list.
 */
export function toMetaBody(messageBody: string): { text: string; variables: TemplateToken[] } {
  const variables: TemplateToken[] = [];
  const text = messageBody.trim().replace(TOKEN_PATTERN, (_, raw: string) => {
    const token = raw.toLowerCase() as TemplateToken;
    let index = variables.indexOf(token);
    if (index === -1) {
      variables.push(token);
      index = variables.length - 1;
    }
    return `{{${index + 1}}}`;
  });
  return { text, variables };
}

/** Sample values Meta reviewers see; also the preview values in the editor. */
export const TEMPLATE_EXAMPLES: Record<TemplateToken, string> = {
  merchant: "Demo Cafe",
  name: "Alex",
  code: "SAVE10",
};

export function templateValuesFor(
  variables: TemplateToken[],
  values: TemplateValues,
): string[] {
  return variables.map((token) => {
    const value = values[token]?.trim();
    if (value) return value;
    // Meta rejects empty parameters, so fall back to something neutral.
    return token === "name" ? "there" : token === "code" ? "" : TEMPLATE_EXAMPLES[token];
  });
}

/** Substitutes tokens for a plain-text (non-template) send. */
export function renderPlaceholders(messageBody: string, values: TemplateValues): string {
  const variables = TEMPLATE_TOKENS.filter((t) => new RegExp(`\\{${t}\\}`, "i").test(messageBody));
  const resolved = templateValuesFor(variables, values);
  return messageBody.replace(TOKEN_PATTERN, (_, raw: string) => {
    const idx = variables.indexOf(raw.toLowerCase() as TemplateToken);
    return idx === -1 ? "" : resolved[idx];
  });
}

/** Meta template names: lowercase letters, digits, underscores; ≤ 512 chars. */
export function toTemplateName(campaignName: string, campaignId: string, version: number): string {
  const slug = campaignName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "campaign";
  const short = campaignId.replace(/-/g, "").slice(0, 8);
  return `${slug}_${short}_v${version}`;
}

export type MetaTemplateComponent =
  | { type: "HEADER"; format: "IMAGE"; example: { header_handle: string[] } }
  | { type: "BODY"; text: string; example?: { body_text: string[][] } }
  | { type: "FOOTER"; text: string };

export function buildTemplateComponents(input: {
  bodyText: string;
  variables: TemplateToken[];
  headerHandle?: string | null;
}): MetaTemplateComponent[] {
  const components: MetaTemplateComponent[] = [];
  if (input.headerHandle) {
    components.push({
      type: "HEADER",
      format: "IMAGE",
      example: { header_handle: [input.headerHandle] },
    });
  }
  const body: MetaTemplateComponent = { type: "BODY", text: input.bodyText };
  if (input.variables.length > 0) {
    body.example = { body_text: [input.variables.map((t) => TEMPLATE_EXAMPLES[t])] };
  }
  components.push(body);
  return components;
}

/** Maps Meta's review events/statuses onto our row status. */
export function statusFromMeta(value: string | undefined | null): WhatsAppTemplateStatus {
  switch ((value ?? "").toUpperCase()) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "PAUSED":
      return "paused";
    case "DISABLED":
      return "disabled";
    case "PENDING":
    case "IN_APPEAL":
    case "PENDING_DELETION":
      return "pending";
    default:
      return "pending";
  }
}

export const TEMPLATE_STATUS_LABEL: Record<WhatsAppTemplateStatus, string> = {
  draft: "Not submitted",
  pending: "Pending Meta review",
  approved: "Approved by Meta",
  rejected: "Rejected by Meta",
  paused: "Paused by Meta",
  disabled: "Disabled by Meta",
  failed: "Submission failed",
};

/** Summary the campaigns API returns alongside each campaign. */
export type CampaignTemplateSummary = {
  id: string;
  name: string;
  language: string;
  status: WhatsAppTemplateStatus;
  rejectionReason: string | null;
  /** Meta quality score for this template: GREEN / YELLOW / RED, or null before any sends. */
  qualityRating: string | null;
  metaTemplateId: string | null;
  provider: "meta" | "dev";
  submittedAt: string | null;
  reviewedAt: string | null;
  statusCheckedAt: string | null;
  /** The copy Meta reviewed; compare with the live message to detect drift. */
  bodyText: string;
  /** False when the campaign copy changed after this submission. */
  matchesCurrentMessage: boolean;
};

/** Whitespace-insensitive: Meta renders the template's own text, so line breaks alone don't need a resubmission. */
export function templateMatchesMessage(submittedBody: string, currentBody: string | null): boolean {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  return normalize(submittedBody) === normalize(currentBody ?? "");
}

/** True when this campaign may be sent as a template right now. */
export function isTemplateSendable(summary: CampaignTemplateSummary | null | undefined): boolean {
  return !!summary && summary.status === "approved" && summary.matchesCurrentMessage;
}
