export type MessageChannel = "whatsapp" | "sms";

export const MESSAGE_CHAR_LIMIT: Record<MessageChannel, number> = {
  whatsapp: 1024,
  sms: 160,
};

export const MESSAGE_SOFT_LIMIT: Record<MessageChannel, number> = {
  whatsapp: 320,
  sms: 160,
};

export const CAMPAIGN_PLACEHOLDERS = [
  { token: "{merchant}", label: "Store name", example: "Demo Cafe" },
  { token: "{name}", label: "Member name", example: "Alex" },
  { token: "{code}", label: "Promo code", example: "LATTE20" },
] as const;

export function applyMessagePreview(
  body: string,
  samples: { merchant?: string; name?: string; code?: string } = {},
): string {
  return body
    .replace(/\{merchant\}/gi, samples.merchant ?? "Your Cafe")
    .replace(/\{name\}/gi, samples.name ?? "Alex")
    .replace(/\{code\}/gi, samples.code ?? "SAVE10");
}

export function insertAtCursor(
  value: string,
  token: string,
  selectionStart: number,
  selectionEnd: number,
): { next: string; cursor: number } {
  const next = value.slice(0, selectionStart) + token + value.slice(selectionEnd);
  const cursor = selectionStart + token.length;
  return { next, cursor };
}

const OPT_OUT_PATTERN = /\bSTOP\b|opt\s*out|unsubscribe/i;

/** True when message already includes PDPA-friendly opt-out language. */
export function hasMarketingOptOut(body: string): boolean {
  return OPT_OUT_PATTERN.test(body);
}

/** Append standard opt-out line when missing (WhatsApp / SMS broadcasts). */
export function ensureMarketingOptOut(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "Reply STOP to opt out.";
  if (hasMarketingOptOut(trimmed)) return trimmed;
  const separator = /[.!?]$/.test(trimmed) ? " " : ". ";
  return `${trimmed}${separator}Reply STOP to opt out.`;
}
