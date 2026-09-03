/**
 * Slug / subdomain helpers for merchant auto-provisioning.
 */

const RESERVED = new Set([
  "www",
  "app",
  "api",
  "admin",
  "platform",
  "login",
  "signup",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
  "status",
  "docs",
  "help",
  "support",
  "billing",
  "irewards",
  "studio",
  "store",
]);

export function slugifyMerchantName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base.slice(0, 48) || "cafe";
}

export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED.has(subdomain.toLowerCase());
}

const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/;

export function isValidSubdomainFormat(subdomain: string): boolean {
  return SUBDOMAIN_RE.test(subdomain);
}

export function assertValidSubdomain(subdomain: string): void {
  if (!isValidSubdomainFormat(subdomain)) {
    throw new Error("Subdomain must be 2–48 chars: lowercase letters, numbers, hyphens");
  }
  if (isReservedSubdomain(subdomain)) {
    throw new Error("That subdomain is reserved");
  }
}

/** Normalize user input into a slug-safe subdomain candidate. */
export function normalizeSubdomainInput(input: string, fallbackName: string): string {
  const fromInput = slugifyMerchantName(input);
  if (fromInput && fromInput !== "cafe") return fromInput;
  return slugifyMerchantName(fallbackName) || "cafe";
}
