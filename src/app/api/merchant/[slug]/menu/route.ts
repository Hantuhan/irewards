import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  getActiveMenuForStorefront,
  getMerchantIngredientCatalog,
  listMenuCategories,
  listMenuItems,
  upsertMenuItem,
} from "@/lib/db/merchant-repository";
import { listModifierGroupsByItemIds } from "@/lib/db/modifiers-repository";
import { listUpsellLinksByItemIds } from "@/lib/db/upsell-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { parseMenuBadges } from "@/lib/menu/menu-badges";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";

function parseStorefrontLang(value: string | null): ProgramLanguage {
  if (value === "zh" || value === "ms") return value;
  return "en";
}

type RouteContext = { params: Promise<{ slug: string }> };

const weekdayEnum = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

const weeklyScheduleSchema = z
  .record(weekdayEnum, z.array(z.object({ start: z.string(), end: z.string() })))
  .nullable()
  .optional();

const modifierOptionSchema = z.object({
  name: z.string().min(1),
  priceDeltaCents: z.number().int().optional(),
  maxQuantity: z.number().int().min(1).max(99).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const modifierGroupSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(1).optional(),
  sortOrder: z.number().int().optional(),
  options: z.array(modifierOptionSchema).min(1),
});

import { takeawayChargeFromRow } from "@/lib/menu/takeaway-charge";

const takeawayChargeSchema = z.object({
  enabled: z.boolean(),
  surchargeType: z.enum(["percentage", "fixed"]),
  surchargeValue: z.number().min(0),
  priority: z.number().int().min(0),
});

const localizedMapSchema = z.record(z.string(), z.string()).optional();

const itemSchema = z.object({
  slug: z.string().min(1),
  categorySlug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  nameI18n: localizedMapSchema,
  descriptionI18n: localizedMapSchema,
  ingredientsI18n: localizedMapSchema,
  itemNotesI18n: localizedMapSchema,
  priceCents: z.number().int().min(0),
  active: z.boolean(),
  imageUrl: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  specialTags: z.array(z.string()).optional(),
  availabilityMode: z.enum(["always", "weekly", "date_range"]).optional(),
  availabilityWeekly: weeklyScheduleSchema,
  availableFrom: z.string().nullable().optional(),
  availableUntil: z.string().nullable().optional(),
  modifierGroups: z.array(modifierGroupSchema).optional(),
  upsellItemSlugs: z.array(z.string().min(1)).max(8).optional(),
  upsellLinks: z
    .array(
      z.object({
        slug: z.string().min(1),
        suggestType: z.enum(["upsell", "downsell"]).default("upsell"),
        promoMode: z.enum(["regular", "free", "custom"]).default("regular"),
        promoPriceCents: z.number().int().min(0).optional(),
        ruleType: z.enum(["always", "min_cart", "max_cart"]).default("always"),
        minCartCents: z.number().int().min(0).optional(),
        maxCartCents: z.number().int().min(0).optional(),
        priority: z.number().int().default(10),
      }),
    )
    .max(8)
    .optional(),
  takeawayCharge: takeawayChargeSchema.optional(),
  kcal: z.number().int().min(0).nullable().optional(),
  sugarG: z.number().min(0).nullable().optional(),
  ingredients: z.string().nullable().optional(),
  itemNotes: z.string().nullable().optional(),
  ingredientIds: z.array(z.string().min(1)).optional(),
  coffeeProfile: z.record(z.string(), z.unknown()).optional(),
});

function merchantTimezone(merchant: { timezone?: string | null }) {
  return merchant.timezone ?? "Asia/Kuala_Lumpur";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    if (format === "storefront") {
      const lang = parseStorefrontLang(url.searchParams.get("lang"));
      const menu = await getActiveMenuForStorefront(
        merchant.id,
        merchantTimezone(merchant),
        lang,
      );
      const languages = (merchant.languages ?? ["en"]).filter(
        (l): l is "en" | "zh" | "ms" => l === "en" || l === "zh" || l === "ms",
      );
      return NextResponse.json({
        categories: menu,
        badges: parseMenuBadges(merchant.menu_badges_json),
        languages: languages.length > 0 ? languages : ["en"],
        merchant: {
          name: merchant.name,
          currency: merchant.currency,
        },
      });
    }

    const [categories, items, ingredientCatalog] = await Promise.all([
      listMenuCategories(merchant.id),
      listMenuItems(merchant.id),
      getMerchantIngredientCatalog(merchant.id),
    ]);

    const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));
    const modifierMap = await listModifierGroupsByItemIds(items.map((i) => i.id));
    const upsellMap = await listUpsellLinksByItemIds(items.map((i) => i.id));

    return NextResponse.json({
      currency: merchant.currency,
      badges: parseMenuBadges(merchant.menu_badges_json),
      ingredientPresets: ingredientCatalog,
      categories: categories.map((c) => ({
        slug: c.slug,
        label: c.label,
        labelI18n: c.label_i18n ?? { en: c.label },
        sortOrder: c.sort_order,
      })),
      items: items.map((item) => ({
        slug: item.slug,
        categorySlug: categorySlugById.get(item.category_id) ?? "",
        name: item.name,
        description: item.description,
        nameI18n: item.name_i18n ?? { en: item.name },
        descriptionI18n: item.description_i18n ?? { en: item.description ?? "" },
        priceCents: item.price_cents,
        active: item.active,
        imageUrl: item.image_url,
        tags: item.tags ?? [],
        specialTags: item.special_tags ?? [],
        availabilityMode: item.availability_mode ?? "always",
        availabilityWeekly: item.availability_weekly,
        availableFrom: item.available_from,
        availableUntil: item.available_until,
        modifierGroups: modifierMap.get(item.id) ?? [],
        upsellLinks: upsellMap.get(item.id) ?? [],
        upsellItemSlugs: (upsellMap.get(item.id) ?? []).map((link) => link.slug),
        takeawayCharge: takeawayChargeFromRow(item),
        kcal: item.kcal ?? null,
        sugarG: item.sugar_g ?? null,
        ingredients: item.ingredients ?? null,
        ingredientsI18n: item.ingredients_i18n ?? { en: item.ingredients ?? "" },
        itemNotes: item.item_notes ?? null,
        itemNotesI18n: item.item_notes_i18n ?? { en: item.item_notes ?? "" },
        ingredientIds: item.ingredient_ids ?? [],
        coffeeProfile: item.coffee_profile_json ?? {},
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load menu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = itemSchema.parse(await request.json());
    const item = await upsertMenuItem(merchant.id, {
      ...body,
      nameI18n: body.nameI18n,
      descriptionI18n: body.descriptionI18n,
      ingredientsI18n: body.ingredientsI18n,
      itemNotesI18n: body.itemNotesI18n,
      coffeeProfile: body.coffeeProfile,
      modifierGroups: body.modifierGroups,
      upsellLinks: body.upsellLinks,
      upsellItemSlugs: body.upsellLinks ? undefined : body.upsellItemSlugs,
      takeawayCharge: body.takeawayCharge,
      kcal: body.kcal,
      sugarG: body.sugarG,
      ingredients: body.ingredients,
      itemNotes: body.itemNotes,
      ingredientIds: body.ingredientIds,
    });

    return NextResponse.json({
      slug: item.slug,
      name: item.name,
      priceCents: item.price_cents,
      active: item.active,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save menu item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
