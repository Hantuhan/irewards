import { createHmac, timingSafeEqual } from "crypto";
import { clearCookieSecurityAttrs, cookieSecurityAttrs } from "@/lib/auth/cookie-attrs";

const COOKIE_NAME = "irewards_member_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 365;

export type MemberSession = {
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
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createMemberSessionToken(
  session: Omit<MemberSession, "exp">,
): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const body = JSON.stringify({ ...session, exp });
  const payload = Buffer.from(body).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseMemberSessionToken(token: string): MemberSession | null {
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
    ) as MemberSession;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function getMemberSessionFromRequest(request: Request): MemberSession | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return null;
  return parseMemberSessionToken(decodeURIComponent(match[1]));
}

export function memberSessionCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieSecurityAttrs(MAX_AGE_SEC)}`;
}

export function clearMemberSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; ${clearCookieSecurityAttrs()}`;
}
