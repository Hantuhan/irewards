import type { MenuBadge } from "@/lib/menu/menu-badges";
import type { CoffeeProfile } from "@/lib/menu/coffee-profile";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";

export type StorefrontMenuItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  menuItemId: string;
  imageUrl?: string | null;
  tags?: string[];
  specialTags?: string[];
  kcal?: number | null;
  sugarG?: number | null;
  ingredients?: string | null;
  notes?: string | null;
  ingredientIds?: string[];
  coffeeProfile?: CoffeeProfile;
  upsellLinks?: import("@/lib/menu/upsell-rules").UpsellLinkConfig[];
  upsellItemIds?: string[];
  modifierGroups?: import("@/lib/menu/modifiers").ModifierGroup[];
  takeawayCharge?: import("@/lib/menu/takeaway-charge").TakeawayChargeConfig;
};

export type StorefrontCategory = {
  id: string;
  label: string;
  items: StorefrontMenuItem[];
};

export type StorefrontMenuResponse = {
  categories: StorefrontCategory[];
  badges: MenuBadge[];
  languages: ProgramLanguage[];
  merchant: {
    name: string;
    currency: "MYR" | "SGD";
  };
};

export async function fetchStorefrontMenu(
  merchantSlug: string,
  lang?: ProgramLanguage,
): Promise<StorefrontMenuResponse> {
  const response = await fetch(
    `/api/merchant/${merchantSlug}/menu?format=storefront${lang && lang !== "en" ? `&lang=${lang}` : ""}`,
    { cache: "no-store" },
  );
  const json = (await response.json()) as StorefrontMenuResponse & { error?: string };
  if (!response.ok) throw new Error(json.error ?? "Failed to load menu");
  return {
    categories: json.categories ?? [],
    badges: json.badges ?? [],
    languages: json.languages ?? ["en"],
    merchant: json.merchant ?? { name: merchantSlug, currency: "MYR" },
  };
}

export async function fetchStorefrontMenuItem(
  merchantSlug: string,
  itemSlug: string,
  lang?: ProgramLanguage,
): Promise<StorefrontMenuItem> {
  const response = await fetch(
    `/api/merchant/${merchantSlug}/menu/items/${encodeURIComponent(itemSlug)}${lang && lang !== "en" ? `?lang=${lang}` : ""}`,
    { cache: "no-store" },
  );
  const json = (await response.json()) as {
    item?: StorefrontMenuItem;
    error?: string;
  };
  if (!response.ok) throw new Error(json.error ?? "Failed to load product");
  if (!json.item) throw new Error("Product not found");
  return json.item;
}
