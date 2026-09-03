import type { MenuBadge } from "@/lib/menu/menu-badges";
import type { MenuIngredientPreset } from "@/lib/menu/menu-ingredients";
import type { CoffeeProfile } from "@/lib/menu/coffee-profile";
import type { SimpleCategoryProfile } from "@/lib/menu/simple-category-profile";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import type { MenuItemDetail } from "@/lib/menu/detail";

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
  mainIngredientIds?: string[];
  coffeeProfile?: CoffeeProfile;
  simpleCategoryProfile?: SimpleCategoryProfile;

  upsellLinks?: import("@/lib/menu/upsell-rules").UpsellLinkConfig[];
  upsellItemIds?: string[];
  modifierGroups?: import("@/lib/menu/modifiers").ModifierGroup[];
  takeawayCharge?: import("@/lib/menu/takeaway-charge").TakeawayChargeConfig;
  availableDineIn?: boolean;
  availableTakeaway?: boolean;
  /** Detail-page template slots (eyebrow, hero caption, stats, note prompt). */
  detail?: MenuItemDetail;
};

export type StorefrontCategory = {
  id: string;
  label: string;
  items: StorefrontMenuItem[];
};

export type StorefrontMenuResponse = {
  categories: StorefrontCategory[];
  badges: MenuBadge[];
  /** Merchant allergen / dietary chip library (for localized disclosure labels). */
  ingredientPresets?: MenuIngredientPreset[];
  languages: ProgramLanguage[];
  merchant: {
    name: string;
    currency: "MYR" | "SGD";
    pointsProgramEnabled?: boolean;
    stampsProgramEnabled?: boolean;
    pointsPerRinggit?: number;
    pointsRedeemCentsPerPoint?: number;
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
    ingredientPresets: json.ingredientPresets ?? [],
    languages: json.languages ?? ["en"],
    merchant: json.merchant ?? {
      name: merchantSlug,
      currency: "MYR",
      pointsProgramEnabled: true,
      stampsProgramEnabled: false,
      pointsPerRinggit: 0.1,
      pointsRedeemCentsPerPoint: 10,
    },
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
