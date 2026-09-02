import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import { menuLocalizedText } from "@/lib/menu/i18n";
import type { ModifierGroup } from "@/lib/menu/modifiers";
import {
  formatIngredientList,
  parseMenuIngredientPresets,
  type MenuIngredientPreset,
} from "@/lib/menu/menu-ingredients";
import { takeawayChargeFromRow } from "@/lib/menu/takeaway-charge";
import type { UpsellLinkConfig } from "@/lib/menu/upsell-rules";
import { parseCoffeeProfile } from "@/lib/menu/coffee-profile";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";

export type MenuItemDetailRow = {
  slug: string;
  name: string;
  name_i18n?: Record<string, string> | null;
  description: string | null;
  description_i18n?: Record<string, string> | null;
  price_cents: number;
  image_url: string | null;
  tags: string[] | null;
  special_tags?: string[] | null;
  kcal?: number | null;
  sugar_g?: number | string | null;
  ingredients?: string | null;
  ingredients_i18n?: Record<string, string> | null;
  item_notes?: string | null;
  item_notes_i18n?: Record<string, string> | null;
  ingredient_ids?: string[] | null;
  coffee_profile_json?: Record<string, unknown> | null;
  takeaway_charge_enabled?: boolean | null;
  takeaway_surcharge_type?: string | null;
  takeaway_surcharge_value?: number | null;
  takeaway_surcharge_priority?: number | null;
};

type MapStorefrontItemInput = {
  item: MenuItemDetailRow;
  categorySlug: string;
  menuItemId: string;
  modifierGroups?: ModifierGroup[];
  upsellLinks?: UpsellLinkConfig[];
  ingredientCatalog?: MenuIngredientPreset[];
  lang?: ProgramLanguage;
};

export function mapStorefrontMenuItem({
  item,
  categorySlug,
  menuItemId,
  modifierGroups = [],
  upsellLinks = [],
  ingredientCatalog = [],
  lang = "en",
}: MapStorefrontItemInput): StorefrontMenuItem {
  const catalog = ingredientCatalog.length > 0 ? ingredientCatalog : parseMenuIngredientPresets(null);
  const ingredientIds = item.ingredient_ids ?? [];
  const resolvedIngredients = formatIngredientList(
    ingredientIds,
    catalog,
    item.ingredients,
    lang,
    item.ingredients_i18n,
  );
  const resolvedNotes = menuLocalizedText(item.item_notes_i18n, lang, item.item_notes ?? "");

  return {
    id: item.slug,
    name: menuLocalizedText(item.name_i18n, lang, item.name),
    description: menuLocalizedText(item.description_i18n, lang, item.description ?? ""),
    priceCents: item.price_cents,
    category: categorySlug,
    menuItemId,
    imageUrl: item.image_url,
    tags: item.tags ?? [],
    specialTags: item.special_tags ?? [],
    kcal: item.kcal ?? null,
    sugarG: item.sugar_g != null ? Number(item.sugar_g) : null,
    ingredients: resolvedIngredients,
    notes: resolvedNotes || null,
    ingredientIds,
    coffeeProfile: parseCoffeeProfile(item.coffee_profile_json),
    upsellLinks,
    upsellItemIds: upsellLinks.map((link) => link.slug),
    modifierGroups,
    takeawayCharge: takeawayChargeFromRow(item),
  };
}
