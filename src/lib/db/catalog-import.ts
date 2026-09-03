import { adminDb } from "@/lib/db/admin";
import {
  createMenuCategory,
  getMerchantIngredientPresetsRaw,
  listMenuCategories,
  saveMerchantIngredientPresets,
  updateMerchant,
  upsertMenuItem,
} from "@/lib/db/merchant-repository";
import { getMerchantById } from "@/lib/db/repository";
import { replaceUpsellLinks } from "@/lib/db/upsell-repository";
import type { CatalogTemplate } from "@/lib/menu/catalog-templates";
import { parseMenuItemDetail } from "@/lib/menu/detail";
import { guessMainIngredientsFromText } from "@/lib/menu/main-ingredients";
import { parseMenuBadges, sanitizeMenuBadges } from "@/lib/menu/menu-badges";
import { isDrinkMenuCategory } from "@/lib/menu/coffee-templates";
import { defaultUpsellLink } from "@/lib/menu/upsell-rules";

export type CatalogImportResult = {
  templateId: string;
  categoriesCreated: number;
  categoriesReused: number;
  productsUpserted: number;
  badgesAdded: number;
  ingredientPresetsAdded: number;
};

/**
 * Import a catalog template into a merchant.
 *
 * - Categories are matched by slug, then by label (case-insensitive); missing ones are created.
 * - Products are upserted by slug (existing same-slug products are overwritten; others untouched).
 * - Template badges / ingredient presets are merged into the merchant catalogs (never removed).
 * - Pairings are linked in a second pass once every product row exists.
 */
export async function importCatalogTemplate(
  merchantId: string,
  template: CatalogTemplate,
): Promise<CatalogImportResult> {
  const merchant = await getMerchantById(merchantId);
  if (!merchant) throw new Error("Merchant not found");

  // 1. Badges
  const existingBadges = parseMenuBadges(merchant.menu_badges_json);
  const badgeIds = new Set(existingBadges.map((b) => b.id));
  const newBadges = template.badges.filter((b) => !badgeIds.has(b.id));
  if (newBadges.length > 0) {
    await updateMerchant(merchantId, {
      menu_badges_json: sanitizeMenuBadges([...existingBadges, ...newBadges]),
    });
  }

  // 2. Ingredient presets
  const existingPresets = await getMerchantIngredientPresetsRaw(merchantId);
  const presetIds = new Set(existingPresets.map((p) => p.id));
  const newPresets = template.ingredientPresets.filter((p) => !presetIds.has(p.id));
  if (newPresets.length > 0) {
    await saveMerchantIngredientPresets(merchantId, [...existingPresets, ...newPresets]);
  }

  // 3. Categories
  let categories = await listMenuCategories(merchantId);
  const categorySlugMap = new Map<string, string>();
  let categoriesCreated = 0;
  let categoriesReused = 0;
  for (const cat of template.categories) {
    const bySlug = categories.find((c) => c.slug === cat.slug);
    const byLabel =
      bySlug ?? categories.find((c) => c.label.toLowerCase() === cat.label.toLowerCase());
    if (byLabel) {
      categorySlugMap.set(cat.slug, byLabel.slug);
      categoriesReused += 1;
      continue;
    }
    const created = await createMenuCategory(merchantId, { label: cat.label, slug: cat.slug });
    categorySlugMap.set(cat.slug, created.slug);
    categoriesCreated += 1;
    categories = [...categories, created];
  }

  // 4. Products (first pass — no pairings yet)
  const rowIdBySlug = new Map<string, string>();
  let sortOrder = 1;
  for (const product of template.products) {
    const categorySlug = categorySlugMap.get(product.categorySlug);
    if (!categorySlug) continue;
    const category = categories.find((c) => c.slug === categorySlug);
    const drink = isDrinkMenuCategory(categorySlug, category?.label);
    const row = await upsertMenuItem(merchantId, {
      slug: product.slug,
      categorySlug,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      active: true,
      imageUrl: product.imageUrl ?? null,
      tags: product.tags ?? [],
      specialTags: product.badgeIds ?? [],
      availabilityMode: "always",
      modifierGroups: (product.modifierGroups ?? []).map((group, gi) => ({
        name: group.name,
        description: group.description ?? null,
        required: group.required ?? false,
        minSelect: group.minSelect ?? (group.required ? 1 : 0),
        maxSelect: group.maxSelect ?? 1,
        sortOrder: gi,
        options: group.options.map((option, oi) => ({
          name: option.name,
          description: option.description ?? null,
          priceDeltaCents: option.priceDeltaCents ?? 0,
          maxQuantity: option.maxQuantity ?? 1,
          isDefault: option.isDefault ?? false,
          sortOrder: oi,
        })),
      })),
      kcal: product.kcal ?? null,
      ingredientIds: product.ingredientIds ?? [],
      mainIngredientIds: drink
        ? []
        : guessMainIngredientsFromText({ name: product.name, description: product.description }),
      nameI18n: { en: product.name },
      descriptionI18n: { en: product.description },
      detail: parseMenuItemDetail(product.detail ?? {}),
    });
    rowIdBySlug.set(product.slug, row.id);

    const { error: sortError } = await adminDb()
      .from("menu_items")
      .update({ sort_order: sortOrder })
      .eq("id", row.id);
    if (sortError) throw new Error(sortError.message);
    sortOrder += 1;
  }

  // 5. Pairings (second pass)
  for (const product of template.products) {
    const rowId = rowIdBySlug.get(product.slug);
    if (!rowId) continue;
    const links = (product.upsellSlugs ?? [])
      .filter((slug) => slug !== product.slug && rowIdBySlug.has(slug))
      .map((slug) => defaultUpsellLink(slug));
    await replaceUpsellLinks(rowId, merchantId, links);
  }

  return {
    templateId: template.id,
    categoriesCreated,
    categoriesReused,
    productsUpserted: rowIdBySlug.size,
    badgesAdded: newBadges.length,
    ingredientPresetsAdded: newPresets.length,
  };
}
