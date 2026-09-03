export type CustomerTab = "shop" | "rewards" | "cart" | "profile";

export type AdminSection =
  | "orders"
  | "menu"
  | "customers"
  | "rewards"
  | "analytics"
  | "reports"
  | "campaigns"
  | "automation"
  | "assistant"
  | "settings"
  | "tables";

/** Diner-facing routes (QR scan entry). Never link to dashboard from these pages. */
export function customerRoutes(merchantSlug: string, tableId: string) {
  const base = `/m/${merchantSlug}/table/${tableId}`;
  return {
    shop: base,
    rewards: `${base}/rewards`,
    cart: `${base}/cart`,
    profile: `${base}/profile`,
    item: (itemSlug: string) => `${base}/item/${encodeURIComponent(itemSlug)}`,
    thanks: (orderId: string) => `${base}/thanks?orderId=${orderId}`,
  };
}

/** Merchant SaaS console. Separate product surface from diner storefront. */
export function dashboardRoutes(merchantSlug: string) {
  const base = `/dashboard/${merchantSlug}`;
  return {
    home: base,
    menu: `${base}/menu`,
    customers: `${base}/customers`,
    rewards: `${base}/rewards`,
    analytics: `${base}/analytics`,
    reports: `${base}/reports`,
    campaigns: `${base}/campaigns`,
    automation: `${base}/automation`,
    assistant: `${base}/assistant`,
    settings: `${base}/settings`,
    tables: `${base}/tables`,
  };
}

/** @deprecated Use dashboardRoutes */
export const adminRoutes = dashboardRoutes;

export type TablePreviewOptions = {
  embed?: boolean;
  /** Simulate a returning member in admin flow preview */
  member?: boolean;
};

/** Dev-only: preview a table QR destination from merchant console */
export function tablePreviewRoute(
  merchantSlug: string,
  tableId = "1",
  embedOrOptions: boolean | TablePreviewOptions = false,
) {
  const options: TablePreviewOptions =
    typeof embedOrOptions === "boolean" ? { embed: embedOrOptions } : embedOrOptions;
  const shop = customerRoutes(merchantSlug, tableId).shop;
  const params = new URLSearchParams();
  if (options.embed) params.set("embed", "1");
  if (options.member) params.set("preview", "member");
  const qs = params.toString();
  return qs ? `${shop}?${qs}` : shop;
}
