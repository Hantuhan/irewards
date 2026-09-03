import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import { menuLocalizedText } from "@/lib/menu/i18n";
import type { ModifierGroup } from "@/lib/menu/modifiers";
import {
  formatCustomIngredients,
  parseMenuIngredientPresets,
  stripCoffeeDisclosureIngredientIds,
  stripFoodOnlyIngredientIds,
  type MenuIngredientPreset,
} from "@/lib/menu/menu-ingredients";
import { normalizeMainIngredientIds } from "@/lib/menu/main-ingredients";
import { takeawayChargeFromRow } from "@/lib/menu/takeaway-charge";
import type { UpsellLinkConfig } from "@/lib/menu/upsell-rules";
import { parseCoffeeProfile } from "@/lib/menu/coffee-profile";
import { parseCategoryProfile, resolveSimpleCategory } from "@/lib/menu/simple-category-options";
import { isCoffeeMenuCategory, isDrinkMenuCategory } from "@/lib/menu/coffee-templates";
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
  main_ingredient_ids?: string[] | null;
  coffee_profile_json?: Record<string, unknown> | null;
  takeaway_charge_enabled?: boolean | null;
  takeaway_surcharge_type?: string | null;
  takeaway_surcharge_value?: number | null;
  takeaway_surcharge_priority?: number | null;
  available_dine_in?: boolean | null;
  available_takeaway?: boolean | null;
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
  const coffeeItem = isCoffeeMenuCategory(categorySlug);
  const drinkItem = isDrinkMenuCategory(categorySlug);
  let ingredientIds = coffeeItem
    ? stripCoffeeDisclosureIngredientIds(item.ingredient_ids ?? [], catalog)
    : (item.ingredient_ids ?? []);
  if (drinkItem) ingredientIds = stripFoodOnlyIngredientIds(ingredientIds);
  const resolvedIngredients = formatCustomIngredients(
    item.ingredients,
    lang,
    item.ingredients_i18n,
  );
  const resolvedNotes = menuLocalizedText(item.item_notes_i18n, lang, item.item_notes ?? "");

  const simpleKind = resolveSimpleCategory(categorySlug);

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
    mainIngredientIds: normalizeMainIngredientIds(item.main_ingredient_ids ?? []),
    coffeeProfile: coffeeItem ? parseCoffeeProfile(item.coffee_profile_json) : undefined,
    simpleCategoryProfile: simpleKind
      ? parseCategoryProfile(simpleKind, item.coffee_profile_json)
      : undefined,
    upsellLinks,
    upsellItemIds: upsellLinks.map((link) => link.slug),
    modifierGroups,
    takeawayCharge: takeawayChargeFromRow(item),
    availableDineIn: item.available_dine_in ?? true,
    availableTakeaway: item.available_takeaway ?? true,
  };
}
