import { createAdminClient, createClient } from "@insforge/sdk";
import { createBrowserClient, createServerClient } from "@insforge/sdk/ssr";

function getPublicBaseUrl() {
  const url = process.env.NEXT_PUBLIC_INSFORGE_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_INSFORGE_URL");
  }
  return url;
}

function getServerBaseUrl() {
  return process.env.INSFORGE_URL ?? getPublicBaseUrl();
}

function getAnonKey() {
  const key = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_INSFORGE_ANON_KEY");
  }
  return key;
}

/** Server-side admin client for webhooks and loyalty writes. */
export function createInsforgeAdmin() {
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing INSFORGE_API_KEY");
  }

  return createAdminClient({
    baseUrl: getServerBaseUrl(),
    apiKey,
  });
}

/** Server-side public client (RLS-scoped when using user token). */
export function createInsforgeServer() {
  return createClient({
    baseUrl: getServerBaseUrl(),
    anonKey: getAnonKey(),
  });
}

/** Browser client for storefront components. */
export function createInsforgeBrowser() {
  return createBrowserClient({
    baseUrl: getPublicBaseUrl(),
    anonKey: getAnonKey(),
  });
}

/** SSR server client with cookies (merchant dashboard later). */
export async function createInsforgeSSR() {
  const { cookies } = await import("next/headers");
  return createServerClient({
    baseUrl: getPublicBaseUrl(),
    anonKey: getAnonKey(),
    cookies: await cookies(),
  });
}
