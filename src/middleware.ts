import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeSessionPayload(token: string): { merchantSlug: string; exp: number } | null {
  const [payload] = token.split(".");
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    const session = JSON.parse(json) as { merchantSlug: string; exp: number };
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/dashboard/")) {
    return NextResponse.next();
  }

  if (
    process.env.NODE_ENV === "development" &&
    !process.env.MERCHANT_SESSION_SECRET
  ) {
    return NextResponse.next();
  }

  const slug = pathname.split("/")[2];
  const token = request.cookies.get("irewards_merchant_session")?.value;
  const session = token ? decodeSessionPayload(token) : null;

  if (!session || session.merchantSlug !== slug) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard/:path*",
};
