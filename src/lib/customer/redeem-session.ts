import { createHmac, timingSafeEqual } from "crypto";
import { clearCookieSecurityAttrs, cookieSecurityAttrs } from "@/lib/auth/cookie-attrs";

const COOKIE_NAME = "irewards_redeem_auth";
/** Redeem authorization is short-lived — must re-verify WhatsApp OTP to spend again later. */
const MAX_AGE_SEC = 30 * 60;

export type RedeemAuthSession = {
  customerId: string;
  merchantId: string;
  merchantSlug: string;
  exp: number;
};

function secret() {
  const value =
    process.env.MEMBER_SESSION_SECRET ??
    process.env.MERCHANT_SESSION_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "irewards-dev-member-session");
  if (!value) {
    throw new Error("MEMBER_SESSION_SECRET (or MERCHANT_SESSION_SECRET) is required in production");
  }
  return `${value}:redeem-auth`;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createRedeemAuthToken(session: Omit<RedeemAuthSession, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const body = JSON.stringify({ ...session, exp });
  const payload = Buffer.from(body).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseRedeemAuthToken(token: string): RedeemAuthSession | null {
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
    ) as RedeemAuthSession;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function getRedeemAuthFromRequest(request: Request): RedeemAuthSession | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return null;
  return parseRedeemAuthToken(decodeURIComponent(match[1]));
}

export function redeemAuthCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieSecurityAttrs(MAX_AGE_SEC)}`;
}

export function clearRedeemAuthCookieHeader(): string {
  return `${COOKIE_NAME}=; ${clearCookieSecurityAttrs()}`;
}

export const REDEEM_AUTH_MAX_AGE_SEC = MAX_AGE_SEC;
