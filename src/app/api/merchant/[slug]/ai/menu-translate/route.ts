import { NextResponse } from "next/server";
import { z } from "zod";
import { draftMenuTranslations } from "@/lib/ai/menu-translation-intelligence";
import { isDeepseekConfigured } from "@/lib/ai/deepseek";
import { listMenuCategories, listMenuItems, getMerchantIngredientCatalog } from "@/lib/db/merchant-repository";
import { ingredientLabel } from "@/lib/menu/menu-ingredients";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  targetLanguages: z.array(z.enum(["zh", "ms"])).min(1),
  overwrite: z.boolean().default(false),
  categorySlugs: z.array(z.string().min(1)).optional(),
  itemSlugs: z.array(z.string().min(1)).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = bodySchema.parse(await request.json());
    const [categories, items, ingredientCatalog] = await Promise.all([
      listMenuCategories(merchant.id),
      listMenuItems(merchant.id),
      getMerchantIngredientCatalog(merchant.id),
    ]);

    const filteredCategories = body.categorySlugs?.length
      ? categories.filter((c) => body.categorySlugs!.includes(c.slug))
      : categories;
    const filteredItems = body.itemSlugs?.length
      ? items.filter((i) => body.itemSlugs!.includes(i.slug))
      : items;

    if (filteredCategories.length === 0 && filteredItems.length === 0) {
      return NextResponse.json({
        categories: [],
        items: [],
        source: "empty",
        message: "Select at least one category or product to translate.",
        configured: isDeepseekConfigured(),
      });
    }

    const draft = await draftMenuTranslations({
      merchantName: merchant.name,
      currency: merchant.currency,
      source: {
        categories: filteredCategories.map((c) => ({ slug: c.slug, label: c.label })),
        items: filteredItems.map((i) => ({
          slug: i.slug,
          name: i.name,
          description: i.description,
          customIngredients: i.ingredients ?? null,
          itemNotes: i.item_notes ?? null,
          ingredientLabels: (i.ingredient_ids ?? []).map((id) =>
            ingredientLabel(id, ingredientCatalog, "en"),
          ),
        })),
      },
      targetLanguages: body.targetLanguages,
      overwrite: body.overwrite,
      existing: {
        categories: filteredCategories.map((c) => ({
          slug: c.slug,
          labelI18n: c.label_i18n ?? {},
        })),
        items: filteredItems.map((i) => ({
          slug: i.slug,
          nameI18n: i.name_i18n ?? {},
          descriptionI18n: i.description_i18n ?? {},
          ingredientsI18n: i.ingredients_i18n ?? {},
          itemNotesI18n: i.item_notes_i18n ?? {},
        })),
      },
    });

    return NextResponse.json({
      ...draft,
      configured: isDeepseekConfigured(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
