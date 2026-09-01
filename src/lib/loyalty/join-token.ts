import { randomBytes } from "crypto";

const JOIN_PREFIX = "JOIN-";

export function createJoinTokenValue(): string {
  return randomBytes(16).toString("hex");
}

export function formatJoinMessage(token: string): string {
  return `${JOIN_PREFIX}${token}`;
}

export function parseJoinMessage(body: string): string | null {
  const trimmed = body.trim().toUpperCase();
  if (!trimmed.startsWith(JOIN_PREFIX)) return null;
  return trimmed.slice(JOIN_PREFIX.length).toLowerCase();
}

export function buildWhatsAppJoinUrl(merchantWhatsApp: string, token: string) {
  const text = encodeURIComponent(formatJoinMessage(token));
  const phone = merchantWhatsApp.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${text}`;
}
