export type CustomerTab = "shop" | "rewards" | "cart" | "profile";

export type AdminSection =
  | "orders"
  | "menu"
  | "customers"
  | "rewards"
  | "analytics"
  | "campaigns"
  | "automation"
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
    campaigns: `${base}/campaigns`,
    automation: `${base}/automation`,
    settings: `${base}/settings`,
    tables: `${base}/tables`,
  };
}

/** @deprecated Use dashboardRoutes */
export const adminRoutes = dashboardRoutes;

/** Dev-only: preview a table QR destination from merchant console */
export function tablePreviewRoute(merchantSlug: string, tableId = "1") {
  return customerRoutes(merchantSlug, tableId).shop;
}
