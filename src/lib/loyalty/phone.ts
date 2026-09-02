/**
 * Phone numbers arrive from receipts, the storefront opt-in form and the Meta WhatsApp webhook
 * webhooks. They must normalise identically or the same guest is stored as two
 * customers and campaign sends miss them.
 */
export function normalizePhone(value: string): string {
  const trimmed = value.trim().replace(/[\s()-]/g, "");
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  if (trimmed.startsWith("+")) return trimmed;
  if (/^60\d+/.test(trimmed)) return `+${trimmed}`;
  if (/^65\d+/.test(trimmed)) return `+${trimmed}`;
  if (trimmed.startsWith("0")) return `+60${trimmed.slice(1)}`;
  return trimmed;
}

/** Loose check — enough to reject typos without rejecting valid regions. */
export function isPlausiblePhone(value: string): boolean {
  return /^\+\d{8,15}$/.test(normalizePhone(value));
}
