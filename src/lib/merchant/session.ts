import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { clearCookieSecurityAttrs, cookieSecurityAttrs } from "@/lib/auth/cookie-attrs";

const COOKIE_NAME = "irewards_merchant_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type MerchantSession = {
  merchantId: string;
  merchantSlug: string;
  email: string;
  userId: string;
  role: "owner" | "manager" | "staff";
  name: string | null;
  exp: number;
};

function normalizeSession(raw: Partial<MerchantSession> & { merchantId: string; merchantSlug: string; email: string; exp: number }): MerchantSession | null {
  if (raw.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    merchantId: raw.merchantId,
    merchantSlug: raw.merchantSlug,
    email: raw.email,
    userId: raw.userId ?? "",
    role: raw.role === "manager" || raw.role === "staff" ? raw.role : "owner",
    name: raw.name ?? null,
    exp: raw.exp,
  };
}

function secret() {
  const value =
    process.env.MERCHANT_SESSION_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "irewards-dev-session-secret");
  if (!value) {
    throw new Error("MERCHANT_SESSION_SECRET is required in production");
  }
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(session: Omit<MerchantSession, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const body = JSON.stringify({ ...session, exp });
  const payload = Buffer.from(body).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function parseSessionToken(token: string): MerchantSession | null {
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
    const raw = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<MerchantSession> & {
      merchantId: string;
      merchantSlug: string;
      email: string;
      exp: number;
    };
    return normalizeSession(raw);
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request): MerchantSession | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return null;
  return parseSessionToken(decodeURIComponent(match[1]));
}

export async function getSessionFromCookies(): Promise<MerchantSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export function sessionCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieSecurityAttrs(MAX_AGE_SEC)}`;
}

export function clearSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; ${clearCookieSecurityAttrs()}`;
}
