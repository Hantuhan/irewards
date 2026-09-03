const DEFAULT_APEX = "irewards.store";

/**
 * Host-based SaaS tenancy helpers.
 *
 * Production: cafe1.irewards.store → tenant "cafe1"
 * Local:      cafe1.localhost:3002 → tenant "cafe1"
 */
export function apexDomain(): string {
  return (process.env.NEXT_PUBLIC_APEX_DOMAIN || DEFAULT_APEX).toLowerCase();
}

/** Hostnames that are not merchant tenants (marketing, login, platform admin). */
export function isPlatformHost(hostname: string): boolean {
  const host = hostname.split(":")[0].toLowerCase();
  const apex = apexDomain();
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host === apex || host === `www.${apex}` || host === `app.${apex}` || host === `api.${apex}` || host === `platform.${apex}`) {
    return true;
  }
  return false;
}

/**
 * Extract merchant subdomain from Host, or null when on the platform apex.
 * Subdomain is expected to match merchants.subdomain (defaults to slug).
 */
export function tenantSubdomainFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0].toLowerCase();
  if (!host || isPlatformHost(host)) return null;

  if (host.endsWith(".localhost") || host.endsWith(".local")) {
    const sub = host.split(".")[0];
    return sub && sub !== "www" ? sub : null;
  }

  const apex = apexDomain();
  if (host.endsWith(`.${apex}`)) {
    const sub = host.slice(0, -(apex.length + 1));
    if (!sub || sub.includes(".") || sub === "www" || sub === "app" || sub === "api") {
      return null;
    }
    return sub;
  }

  return null;
}

/** Public storefront origin for a merchant (subdomain when apex is configured). */
export function merchantPublicOrigin(subdomain: string, protocol = "https"): string {
  const apex = apexDomain();
  if (process.env.NODE_ENV !== "production") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
    try {
      const u = new URL(appUrl);
      return `${u.protocol}//${subdomain}.localhost${u.port ? `:${u.port}` : ""}`;
    } catch {
      return `http://${subdomain}.localhost:3002`;
    }
  }
  return `${protocol}://${subdomain}.${apex}`;
}

export function rewritePathForTenant(pathname: string, tenant: string): string | null {
  if (pathname === "/" || pathname === "") {
    return `/m/${tenant}/table/1`;
  }
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return `/dashboard/${tenant}`;
  }
  if (pathname.startsWith("/dashboard/") && !pathname.startsWith(`/dashboard/${tenant}`)) {
    const rest = pathname.slice("/dashboard/".length);
    // Already /dashboard/{otherSlug}/... — leave alone (middleware will auth-fail).
    if (rest && !rest.includes("/")) return null;
    const first = rest.split("/")[0];
    if (first && first !== tenant) return null;
  }
  if (pathname === "/login" || pathname.startsWith("/login?")) {
    return null;
  }
  if (pathname.startsWith("/api/")) {
    return null;
  }
  // Bare /admin → dashboard
  if (pathname === "/admin" || pathname === "/admin/") {
    return `/dashboard/${tenant}`;
  }
  return null;
}
