import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { assertPasswordStrength, timingSafeEqualString } from "@/lib/merchant/password";
import { clearCookieSecurityAttrs, cookieSecurityAttrs } from "@/lib/auth/cookie-attrs";

const COOKIE_NAME = "irewards_platform_session";
const MAX_AGE_SEC = 60 * 60 * 8; // 8 hours

export type PlatformSession = {
  role: "platform_admin";
  exp: number;
};

function secret() {
  const value =
    process.env.PLATFORM_SESSION_SECRET ??
    process.env.MERCHANT_SESSION_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "irewards-dev-platform-session");
  if (!value) {
    throw new Error("PLATFORM_SESSION_SECRET (or MERCHANT_SESSION_SECRET) is required in production");
  }
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createPlatformSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const body = JSON.stringify({ role: "platform_admin", exp } satisfies PlatformSession);
  const payload = Buffer.from(body).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parsePlatformSessionToken(token: string): PlatformSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  try {
    if (
      expected.length !== signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as PlatformSession;
    if (session.role !== "platform_admin") return null;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function getPlatformSessionFromRequest(request: Request): PlatformSession | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return null;
  return parsePlatformSessionToken(decodeURIComponent(match[1]));
}

export async function getPlatformSessionFromCookies(): Promise<PlatformSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return parsePlatformSessionToken(token);
}

export function platformSessionCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieSecurityAttrs(MAX_AGE_SEC)}`;
}

export function clearPlatformSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; ${clearCookieSecurityAttrs()}`;
}

/**
 * Verifies PLATFORM_ADMIN_PASSWORD from env.
 * Must be set and meet the complex password policy (even in development, if set).
 */
export function verifyPlatformAdminPassword(candidate: string): boolean {
  const expected = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!expected) {
    // No hardcoded fallback — set PLATFORM_ADMIN_PASSWORD in `.env.local`.
    return false;
  }
  try {
    assertPasswordStrength(expected);
  } catch {
    console.error("[platform] PLATFORM_ADMIN_PASSWORD does not meet complexity policy");
    return false;
  }
  return timingSafeEqualString(candidate, expected);
}

export function platformAdminConfigured(): boolean {
  return Boolean(process.env.PLATFORM_ADMIN_PASSWORD);
}
