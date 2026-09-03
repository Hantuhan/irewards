import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySignedSessionToken } from "@/lib/auth/edge-session";
import { rewritePathForTenant, tenantSubdomainFromHost } from "@/lib/tenancy/host";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const tenant = tenantSubdomainFromHost(host);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/platform") && pathname !== "/platform/login") {
    const token = request.cookies.get("irewards_platform_session")?.value;
    const session = token ? await verifySignedSessionToken(token, "platform") : null;
    if (!session || session.role !== "platform_admin") {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }
  }

  if (tenant) {
    const rewriteTo = rewritePathForTenant(pathname, tenant);
    if (rewriteTo) {
      const url = request.nextUrl.clone();
      url.pathname = rewriteTo;
      const response = NextResponse.rewrite(url);
      response.headers.set("x-irewards-tenant", tenant);
      return response;
    }
  }

  if (!pathname.startsWith("/dashboard/")) {
    const res = NextResponse.next();
    if (tenant) res.headers.set("x-irewards-tenant", tenant);
    return res;
  }

  if (
    process.env.NODE_ENV === "development" &&
    !process.env.MERCHANT_SESSION_SECRET
  ) {
    return NextResponse.next();
  }

  const slug = pathname.split("/")[2];
  if (tenant && slug && tenant !== slug) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `/dashboard/${tenant}`);
    return NextResponse.redirect(loginUrl);
  }

  const token = request.cookies.get("irewards_merchant_session")?.value;
  const session = token ? await verifySignedSessionToken(token, "merchant") : null;

  if (!session || session.merchantSlug !== slug) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  if (tenant) response.headers.set("x-irewards-tenant", tenant);
  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/login",
    "/signup",
    "/platform",
    "/platform/:path*",
  ],
};
