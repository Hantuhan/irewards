import type { MenuBadge } from "@/lib/menu/menu-badges";
import type { MenuIngredientPreset } from "@/lib/menu/menu-ingredients";
import type { MenuItemDetail } from "@/lib/menu/detail";

/**
 * A reusable catalog template: categories + fully-specified products
 * (photo, detail-page slots, modifiers, allergens, badges, pairings).
 * Importing a template into a merchant upserts by slug, so it is safe to
 * re-run; existing products with other slugs are left untouched.
 */

export type CatalogTemplateOption = {
  name: string;
  description?: string;
  priceDeltaCents?: number;
  isDefault?: boolean;
  maxQuantity?: number;
};

export type CatalogTemplateGroup = {
  name: string;
  description?: string;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: CatalogTemplateOption[];
};

export type CatalogTemplateProduct = {
  slug: string;
  categorySlug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl?: string;
  /** Badge ids from the template's `badges` catalog (or the merchant's). */
  badgeIds?: string[];
  /** Ingredient / allergen preset ids (template presets + standard presets). */
  ingredientIds?: string[];
  kcal?: number | null;
  tags?: string[];
  detail?: Partial<MenuItemDetail>;
  modifierGroups?: CatalogTemplateGroup[];
  /** Slugs of other template products to suggest as pairings. */
  upsellSlugs?: string[];
};

export type CatalogTemplateCategory = { slug: string; label: string };

export type CatalogTemplate = {
  id: string;
  name: string;
  description: string;
  currency: "MYR" | "SGD";
  categories: CatalogTemplateCategory[];
  badges: MenuBadge[];
  ingredientPresets: MenuIngredientPreset[];
  products: CatalogTemplateProduct[];
};

export type CatalogTemplateSummary = {
  id: string;
  name: string;
  description: string;
  categoryCount: number;
  productCount: number;
  previewImageUrls: string[];
};

export function summarizeCatalogTemplate(template: CatalogTemplate): CatalogTemplateSummary {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    categoryCount: template.categories.length,
    productCount: template.products.length,
    previewImageUrls: template.products
      .map((p) => p.imageUrl)
      .filter((url): url is string => Boolean(url))
      .slice(0, 6),
  };
}
