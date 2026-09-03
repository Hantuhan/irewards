import { apexDomain } from "@/lib/tenancy/host";

/** Shared cookie flags for SaaS hosts (Path, HttpOnly, SameSite, Secure, Domain). */
export function cookieSecurityAttrs(maxAgeSec: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const domain =
    process.env.NODE_ENV === "production"
      ? `; Domain=.${apexDomain()}`
      : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}${domain}`;
}

export function clearCookieSecurityAttrs(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const domain =
    process.env.NODE_ENV === "production"
      ? `; Domain=.${apexDomain()}`
      : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}${domain}`;
}
