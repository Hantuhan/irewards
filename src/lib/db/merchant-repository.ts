import { adminDb } from "@/lib/db/admin";
import type { ProgramLanguage, LocalizedMap } from "@/lib/i18n/program-locale";
import { mergeLocalizedMap, menuLocalizedText } from "@/lib/menu/i18n";
import {
  isMenuItemAvailableNow,
  type MenuItemAvailabilityFields,
  type WeeklySchedule,
} from "@/lib/menu/availability";
import {
  listModifierGroupsByItemIds,
  replaceModifierGroups,
  type ModifierGroupInput,
} from "@/lib/db/modifiers-repository";
import { listUpsellLinksByItemIds, replaceUpsellLinks } from "@/lib/db/upsell-repository";
import { defaultUpsellLink, type UpsellLinkConfig } from "@/lib/menu/upsell-rules";
import {
  formatVoucherCode,
  formatVoucherValue,
  resolveVoucherStatus,
  type VoucherInventoryItem,
} from "@/lib/campaigns/voucher-inventory";
import {
  mergeStandardIngredientPresets,
  parseMenuIngredientPresets,
  normalizeIngredientIds,
  sanitizeIngredientIds,
  type MenuIngredientPreset,
} from "@/lib/menu/menu-ingredients";
import { normalizeMainIngredientIds } from "@/lib/menu/main-ingredients";
import { mapStorefrontMenuItem } from "@/lib/menu/storefront-item";
import { isCoffeeMenuCategory, mergeCoffeeIngredientPresets } from "@/lib/menu/coffee-templates";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";
import {
  calculateTakeawaySurchargeCents,
  DEFAULT_TAKEAWAY_CHARGE,
  shouldApplyTakeawayCharge,
  takeawayChargeFromRow,
  type TakeawayChargeConfig,
} from "@/lib/menu/takeaway-charge";
import {
  buildSalesReport,
  queryFromForPeriod,
  type SalesPeriod,
  type SalesReport,
} from "@/lib/merchant/sales-report";
import {
  normalizeLineNote,
  unitPriceWithModifiers,
  validateSelections,
} from "@/lib/menu/modifiers";
import { menuItemDetailToJson, type MenuItemDetail } from "@/lib/menu/detail";
import type {
  CampaignRow,
  CustomerRow,
  MenuCategoryRow,
  MenuItemRow,
  MerchantRow,
  MerchantUserRow,
  OrderItemRow,
  OrderRow,
  PromoRow,
  VenueTableRow,
} from "@/lib/db/types";

function db() {
  return adminDb();
}

export async function getMerchantUserByEmail(
  email: string,
): Promise<(MerchantUserRow & { merchant: MerchantRow }) | null> {
  const { data, error } = await db()
    .from("merchant_users")
    .select("*, merchants(*)")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as MerchantUserRow & { merchants: MerchantRow };
  if (row.active === false) return null;
  return { ...row, merchant: row.merchants };
}

export async function listMerchantUsers(merchantId: string): Promise<MerchantUserRow[]> {
  const { data, error } = await db()
    .from("merchant_users")
    .select("id, merchant_id, email, password_hash, name, role, active, invited_at, last_login_at")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MerchantUserRow[];
}

export async function createMerchantUser(input: {
  merchantId: string;
  email: string;
  passwordHash: string;
  name: string | null;
  role: "owner" | "manager" | "staff";
}): Promise<MerchantUserRow> {
  const { data, error } = await db()
    .from("merchant_users")
    .insert([
      {
        merchant_id: input.merchantId,
        email: input.email.toLowerCase(),
        password_hash: input.passwordHash,
        name: input.name,
        role: input.role,
        active: true,
        invited_at: new Date().toISOString(),
      },
    ])
    .select("id, merchant_id, email, password_hash, name, role, active, invited_at, last_login_at")
    .single();
  if (error) throw new Error(error.message);
  return data as MerchantUserRow;
}

export async function setMerchantUserActive(
  merchantId: string,
  userId: string,
  active: boolean,
): Promise<void> {
  const { error } = await db()
    .from("merchant_users")
    .update({ active })
    .eq("merchant_id", merchantId)
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function touchMerchantUserLogin(userId: string): Promise<void> {
  await db()
    .from("merchant_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function getMerchantBySubdomain(subdomain: string): Promise<MerchantRow | null> {
  const key = subdomain.toLowerCase();
  const bySub = await db().from("merchants").select("*").eq("subdomain", key).maybeSingle();
  if (bySub.error) throw new Error(bySub.error.message);
  if (bySub.data) return bySub.data as MerchantRow;
  const bySlug = await db().from("merchants").select("*").eq("slug", key).maybeSingle();
  if (bySlug.error) throw new Error(bySlug.error.message);
  return (bySlug.data as MerchantRow | null) ?? null;
}

export async function updateMerchant(
  merchantId: string,
  patch: Partial<
    Pick<
      MerchantRow,
      | "name"
      | "whatsapp_number"
      | "currency"
      | "points_per_ringgit"
      | "facebook_url"
      | "instagram_url"
      | "google_url"
      | "xhs_url"
      | "website_url"
      | "store_email"
      | "logo_url"
      | "address"
      | "latitude"
      | "longitude"
      | "languages"
      | "registration_number"
      | "sst_number"
      | "gst_number"
      | "landline_number"
      | "retention_enabled"
      | "campaign_send_window_start"
      | "campaign_send_window_end"
      | "campaign_send_cap_hours"
      | "birthday_bonus_points"
      | "points_expiry_days"
      | "points_redeem_cents_per_point"
      | "service_charge_enabled"
      | "service_charge_percent"
      | "sst_enabled"
      | "sst_rate_percent"
      | "gst_enabled"
      | "gst_rate_percent"
      | "receipt_footer_text"
      | "receipt_show_registration"
      | "receipt_layout_json"
      | "receipt_delivery_email"
      | "receipt_delivery_whatsapp"
      | "menu_badges_json"
      | "menu_ingredient_presets_json"
      | "halal_certified"
      | "halal_certificate_url"
      | "refund_policy"
      | "privacy_policy"
      | "daily_revenue_target_cents"
      | "weekly_revenue_target_cents"
      | "monthly_revenue_target_cents"
      | "kitchen_flow_json"
      | "membership_setup_completed_at"
      | "points_program_enabled"
      | "stamps_program_enabled"
    >
  >,
): Promise<MerchantRow> {
  const { data, error } = await db()
    .from("merchants")
    .update(patch)
    .eq("id", merchantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as MerchantRow;
}

export async function getMerchantSalesReport(
  merchantId: string,
  period: SalesPeriod,
  timeZone = "Asia/Kuala_Lumpur",
): Promise<SalesReport> {
  const fromIso = queryFromForPeriod(period, timeZone);
  const { data, error } = await db()
    .from("orders")
    .select("total_cents, paid_at")
    .eq("merchant_id", merchantId)
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .gte("paid_at", fromIso);

  if (error) throw new Error(error.message);
  return buildSalesReport((data ?? []) as { total_cents: number; paid_at: string }[], period, timeZone);
}

/** Paid orders for reports (compare, intelligence) — up to 400 days. */
export async function getMerchantPaidOrdersForReports(merchantId: string, days = 400) {
  const fromIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db()
    .from("orders")
    .select("id, total_cents, paid_at")
    .eq("merchant_id", merchantId)
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .gte("paid_at", fromIso)
    .order("paid_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; total_cents: number; paid_at: string }[];
}

export async function getPromoRedemptionsForMerchant(merchantId: string) {
  const { data: promos, error: promoError } = await db()
    .from("promos")
    .select("id")
    .eq("merchant_id", merchantId);

  if (promoError) throw new Error(promoError.message);
  const promoIds = (promos ?? []).map((p) => p.id as string);
  if (promoIds.length === 0) return [];

  const { data, error } = await db()
    .from("promo_redemptions")
    .select("promo_id, order_id, redeemed_at")
    .in("promo_id", promoIds);

  if (error) throw new Error(error.message);
  return (data ?? []) as { promo_id: string; order_id: string; redeemed_at: string }[];
}

export async function listMenuCategories(
  merchantId: string,
): Promise<MenuCategoryRow[]> {
  const { data, error } = await db()
    .from("menu_categories")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MenuCategoryRow[];
}

function slugifyCategoryLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createMenuCategory(
  merchantId: string,
  input: { label: string; slug?: string },
): Promise<MenuCategoryRow> {
  const label = input.label.trim();
  if (!label) throw new Error("Category name is required");

  const categories = await listMenuCategories(merchantId);
  const preferred = input.slug?.trim().toLowerCase();
  const baseSlug =
    (preferred && preferred.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")) ||
    slugifyCategoryLabel(label) ||
    "category";
  let slug = baseSlug;
  let suffix = 1;
  while (categories.some((c) => c.slug === slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  if (categories.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
    throw new Error("That category already exists");
  }

  const sortOrder =
    categories.length > 0
      ? Math.max(...categories.map((c) => c.sort_order)) + 1
      : 1;

  const { data, error } = await db()
    .from("menu_categories")
    .insert({
      merchant_id: merchantId,
      slug,
      label,
      label_i18n: { en: label },
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as MenuCategoryRow;
}

export async function deleteMenuCategory(
  merchantId: string,
  slug: string,
): Promise<{ deletedItemCount: number }> {
  const categories = await listMenuCategories(merchantId);
  const category = categories.find((c) => c.slug === slug);
  if (!category) throw new Error("Category not found");

  const { count, error: countError } = await db()
    .from("menu_items")
    .select("*", { count: "exact", head: true })
    .eq("category_id", category.id);

  if (countError) throw new Error(countError.message);

  const { error } = await db()
    .from("menu_categories")
    .delete()
    .eq("id", category.id)
    .eq("merchant_id", merchantId);

  if (error) throw new Error(error.message);
  return { deletedItemCount: count ?? 0 };
}

export async function listMenuItems(merchantId: string): Promise<MenuItemRow[]> {
  const { data, error } = await db()
    .from("menu_items")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MenuItemRow[];
}

function availabilityFromRow(row: MenuItemRow): MenuItemAvailabilityFields {
  return {
    availabilityMode: row.availability_mode ?? "always",
    availabilityWeekly: (row.availability_weekly as WeeklySchedule | null) ?? null,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
  };
}

export async function getActiveMenuForStorefront(
  merchantId: string,
  timeZone: string,
  lang: ProgramLanguage = "en",
) {
  const categories = await listMenuCategories(merchantId);
  const ingredientCatalog = await getMerchantIngredientCatalog(merchantId);
  const { data, error } = await db()
    .from("menu_items")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  const items = (data ?? []) as MenuItemRow[];

  const modifierMap = await listModifierGroupsByItemIds(items.map((i) => i.id));
  const upsellMap = await listUpsellLinksByItemIds(items.map((i) => i.id));

  return categories.map((cat) => ({
    id: cat.slug,
    label: menuLocalizedText(cat.label_i18n, lang, cat.label),
    items: items
      .filter((item) => item.category_id === cat.id)
      .filter((item) => isMenuItemAvailableNow(availabilityFromRow(item), timeZone))
      .map((item) =>
        mapStorefrontMenuItem({
          item,
          categorySlug: cat.slug,
          menuItemId: item.id,
          modifierGroups: modifierMap.get(item.id) ?? [],
          upsellLinks: upsellMap.get(item.id) ?? [],
          ingredientCatalog,
          lang,
        }),
      ),
  }));
}

export async function getStorefrontMenuItemBySlug(
  merchantId: string,
  itemSlug: string,
  timeZone: string,
  lang: ProgramLanguage = "en",
): Promise<StorefrontMenuItem | null> {
  const ingredientCatalog = await getMerchantIngredientCatalog(merchantId);
  const { data, error } = await db()
    .from("menu_items")
    .select("*, menu_categories(slug)")
    .eq("merchant_id", merchantId)
    .eq("slug", itemSlug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as MenuItemRow & { menu_categories: { slug: string } | null };
  if (!isMenuItemAvailableNow(availabilityFromRow(row), timeZone)) return null;

  const modifierMap = await listModifierGroupsByItemIds([row.id]);
  const upsellMap = await listUpsellLinksByItemIds([row.id]);

  return mapStorefrontMenuItem({
    item: row,
    categorySlug: row.menu_categories?.slug ?? "",
    menuItemId: row.id,
    modifierGroups: modifierMap.get(row.id) ?? [],
    upsellLinks: upsellMap.get(row.id) ?? [],
    ingredientCatalog,
    lang,
  });
}

export async function getMerchantIngredientCatalog(merchantId: string) {
  const categories = await listMenuCategories(merchantId);
  const hasCoffeeCategory = categories.some((c) => isCoffeeMenuCategory(c.slug, c.label));

  const { data, error } = await db()
    .from("merchants")
    .select("menu_ingredient_presets_json")
    .eq("id", merchantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const base = mergeStandardIngredientPresets(
    parseMenuIngredientPresets(
      (data as { menu_ingredient_presets_json?: unknown } | null)?.menu_ingredient_presets_json,
    ),
  );
  return hasCoffeeCategory ? mergeCoffeeIngredientPresets(base) : base;
}

export async function getMerchantIngredientPresetsRaw(merchantId: string) {
  const { data, error } = await db()
    .from("merchants")
    .select("menu_ingredient_presets_json")
    .eq("id", merchantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return parseMenuIngredientPresets(
    (data as { menu_ingredient_presets_json?: unknown } | null)?.menu_ingredient_presets_json,
  );
}

export async function saveMerchantIngredientPresets(
  merchantId: string,
  presets: MenuIngredientPreset[],
) {
  const normalized = parseMenuIngredientPresets(
    presets.map(({ id, label, group, labelI18n }) => ({
      id,
      label,
      group,
      labelI18n,
    })),
  );
  return updateMerchant(merchantId, { menu_ingredient_presets_json: normalized });
}

export async function upsertMenuItem(
  merchantId: string,
  input: {
    slug: string;
    categorySlug: string;
    name: string;
    description: string | null;
    priceCents: number;
    active: boolean;
    imageUrl?: string | null;
    tags?: string[];
    specialTags?: string[];
    availabilityMode?: "always" | "weekly" | "date_range";
    availabilityWeekly?: WeeklySchedule | null;
    availableFrom?: string | null;
    availableUntil?: string | null;
    modifierGroups?: ModifierGroupInput[];
    upsellLinks?: UpsellLinkConfig[];
    upsellItemSlugs?: string[];
    takeawayCharge?: TakeawayChargeConfig;
    availableDineIn?: boolean;
    availableTakeaway?: boolean;
    kcal?: number | null;
    sugarG?: number | null;
    ingredients?: string | null;
    itemNotes?: string | null;
    ingredientIds?: string[];
    mainIngredientIds?: string[];
    nameI18n?: LocalizedMap;
    descriptionI18n?: LocalizedMap;
    ingredientsI18n?: LocalizedMap;
    itemNotesI18n?: LocalizedMap;
    coffeeProfile?: Record<string, unknown>;
    detail?: MenuItemDetail;
  },
): Promise<MenuItemRow> {
  const categories = await listMenuCategories(merchantId);
  const category = categories.find((c) => c.slug === input.categorySlug);
  if (!category) throw new Error("Category not found");

  const ingredientCatalog = await getMerchantIngredientCatalog(merchantId);
  const normalizedIngredientIds =
    input.ingredientIds !== undefined
      ? sanitizeIngredientIds(
          normalizeIngredientIds(input.ingredientIds, ingredientCatalog),
        )
      : undefined;
  const normalizedMainIngredientIds =
    input.mainIngredientIds !== undefined
      ? normalizeMainIngredientIds(input.mainIngredientIds)
      : undefined;

  const existingItems = await listMenuItems(merchantId);
  const existing = existingItems.find((i) => i.slug === input.slug);
  const nameI18n = mergeLocalizedMap(existing?.name_i18n, {
    ...(input.nameI18n ?? {}),
    en: input.name,
  });
  const descriptionI18n = mergeLocalizedMap(existing?.description_i18n, {
    ...(input.descriptionI18n ?? {}),
    en: input.description ?? "",
  });
  const ingredientsI18n = mergeLocalizedMap(existing?.ingredients_i18n, {
    ...(input.ingredientsI18n ?? {}),
    en: input.ingredients ?? "",
  });
  const itemNotesI18n = mergeLocalizedMap(existing?.item_notes_i18n, {
    ...(input.itemNotesI18n ?? {}),
    en: input.itemNotes ?? "",
  });

  // Omit main_ingredient_ids from the primary upsert so menus still save when
  // migration 049 is not applied / PostgREST schema cache is stale.
  const rowPayload: Record<string, unknown> = {
    merchant_id: merchantId,
    category_id: category.id,
    slug: input.slug,
    name: input.name,
    name_i18n: nameI18n,
    description: input.description,
    description_i18n: descriptionI18n,
    price_cents: input.priceCents,
    active: input.active,
    image_url: input.imageUrl ?? null,
    tags: input.tags ?? [],
    special_tags: input.specialTags ?? [],
    availability_mode: input.availabilityMode ?? "always",
    availability_weekly: input.availabilityWeekly ?? null,
    available_from: input.availableFrom ?? null,
    available_until: input.availableUntil ?? null,
    takeaway_charge_enabled: (input.takeawayCharge ?? DEFAULT_TAKEAWAY_CHARGE).enabled,
    takeaway_surcharge_type: (input.takeawayCharge ?? DEFAULT_TAKEAWAY_CHARGE).enabled
      ? (input.takeawayCharge ?? DEFAULT_TAKEAWAY_CHARGE).surchargeType
      : null,
    takeaway_surcharge_value: (input.takeawayCharge ?? DEFAULT_TAKEAWAY_CHARGE).enabled
      ? (input.takeawayCharge ?? DEFAULT_TAKEAWAY_CHARGE).surchargeValue
      : null,
    takeaway_surcharge_priority:
      (input.takeawayCharge ?? DEFAULT_TAKEAWAY_CHARGE).priority,
    kcal: input.kcal ?? null,
    sugar_g: input.sugarG ?? null,
    ingredients: (ingredientsI18n.en?.trim() || input.ingredients) ?? null,
    ingredients_i18n: ingredientsI18n,
    item_notes: (itemNotesI18n.en?.trim() || input.itemNotes) ?? null,
    item_notes_i18n: itemNotesI18n,
    ingredient_ids: normalizedIngredientIds ?? [],
    coffee_profile_json: input.coffeeProfile ?? existing?.coffee_profile_json ?? {},
  };

  const { data, error } = await db()
    .from("menu_items")
    .upsert(rowPayload, { onConflict: "merchant_id,slug" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const row = data as MenuItemRow;

  if (normalizedMainIngredientIds !== undefined) {
    const { error: mainErr } = await db()
      .from("menu_items")
      .update({ main_ingredient_ids: normalizedMainIngredientIds })
      .eq("id", row.id);
    if (mainErr && !/main_ingredient_ids/i.test(mainErr.message)) {
      throw new Error(mainErr.message);
    }
    if (!mainErr) {
      row.main_ingredient_ids = normalizedMainIngredientIds;
    }
  }

  if (input.detail !== undefined) {
    const detailJson = menuItemDetailToJson(input.detail);
    const { error: detailErr } = await db()
      .from("menu_items")
      .update({ detail_json: detailJson })
      .eq("id", row.id);
    if (detailErr && !/detail_json/i.test(detailErr.message)) {
      throw new Error(detailErr.message);
    }
    if (!detailErr) row.detail_json = detailJson;
  }

  if (input.availableDineIn !== undefined || input.availableTakeaway !== undefined) {
    const channelPatch: Record<string, boolean> = {};
    if (input.availableDineIn !== undefined) channelPatch.available_dine_in = input.availableDineIn;
    if (input.availableTakeaway !== undefined) {
      channelPatch.available_takeaway = input.availableTakeaway;
    }
    const { error: channelErr } = await db()
      .from("menu_items")
      .update(channelPatch)
      .eq("id", row.id);
    if (channelErr && !/available_dine_in|available_takeaway/i.test(channelErr.message)) {
      throw new Error(channelErr.message);
    }
    if (!channelErr) {
      if (input.availableDineIn !== undefined) row.available_dine_in = input.availableDineIn;
      if (input.availableTakeaway !== undefined) row.available_takeaway = input.availableTakeaway;
    }
  }

  if (input.modifierGroups !== undefined) {
    await replaceModifierGroups(row.id, input.modifierGroups);
  }

  if (input.upsellLinks !== undefined) {
    await replaceUpsellLinks(row.id, merchantId, input.upsellLinks);
  } else if (input.upsellItemSlugs !== undefined) {
    await replaceUpsellLinks(
      row.id,
      merchantId,
      input.upsellItemSlugs.map((slug) => defaultUpsellLink(slug)),
    );
  }

  return row;
}

export async function applyMenuTranslations(
  merchantId: string,
  input: {
    categories?: Array<{ slug: string; labelI18n: LocalizedMap }>;
    items?: Array<{
      slug: string;
      nameI18n?: LocalizedMap;
      descriptionI18n?: LocalizedMap;
      ingredientsI18n?: LocalizedMap;
      itemNotesI18n?: LocalizedMap;
    }>;
  },
) {
  const categories = await listMenuCategories(merchantId);
  const items = await listMenuItems(merchantId);

  for (const catInput of input.categories ?? []) {
    const cat = categories.find((c) => c.slug === catInput.slug);
    if (!cat) continue;
    const labelI18n = mergeLocalizedMap(cat.label_i18n, catInput.labelI18n);
    const { error } = await db()
      .from("menu_categories")
      .update({ label_i18n: labelI18n, label: labelI18n.en?.trim() || cat.label })
      .eq("id", cat.id);
    if (error) throw new Error(error.message);
  }

  for (const itemInput of input.items ?? []) {
    const item = items.find((i) => i.slug === itemInput.slug);
    if (!item) continue;
    const nameI18n = mergeLocalizedMap(item.name_i18n, itemInput.nameI18n ?? {});
    const descriptionI18n = mergeLocalizedMap(
      item.description_i18n,
      itemInput.descriptionI18n ?? {},
    );
    const ingredientsI18n = mergeLocalizedMap(
      item.ingredients_i18n,
      itemInput.ingredientsI18n ?? {},
    );
    const itemNotesI18n = mergeLocalizedMap(item.item_notes_i18n, itemInput.itemNotesI18n ?? {});
    const { error } = await db()
      .from("menu_items")
      .update({
        name_i18n: nameI18n,
        description_i18n: descriptionI18n,
        ingredients_i18n: ingredientsI18n,
        item_notes_i18n: itemNotesI18n,
        name: nameI18n.en?.trim() || item.name,
        description: descriptionI18n.en?.trim() || item.description,
        ingredients: ingredientsI18n.en?.trim() || item.ingredients,
        item_notes: itemNotesI18n.en?.trim() || item.item_notes,
      })
      .eq("id", item.id);
    if (error) throw new Error(error.message);
  }
}

export async function resolveMenuItemsForCheckout(
  merchantId: string,
  lines: {
    id: string;
    quantity: number;
    selections?: { groupId: string; optionId: string }[];
    packedForTakeaway?: boolean;
    note?: string;
  }[],
  timeZone: string,
  serviceType: "dine_in" | "takeaway" = "dine_in",
) {
  const { data, error } = await db()
    .from("menu_items")
    .select("*, menu_categories(slug)")
    .eq("merchant_id", merchantId)
    .eq("active", true);

  if (error) throw new Error(error.message);
  const items = (data ?? []) as (MenuItemRow & {
    menu_categories: { slug: string };
  })[];

  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const modifierMap = await listModifierGroupsByItemIds(items.map((i) => i.id));
  let subtotalCents = 0;
  const orderLines: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    modifiers: { groupName: string; optionName: string; priceDeltaCents: number }[];
    packedForTakeaway: boolean;
    takeawaySurchargeCents: number;
    note?: string;
  }[] = [];

  for (const line of lines) {
    const item = bySlug.get(line.id);
    if (!item) throw new Error(`Unknown item: ${line.id}`);
    if (!isMenuItemAvailableNow(availabilityFromRow(item), timeZone)) {
      throw new Error(`${item.name} is not available right now`);
    }

    const groups = modifierMap.get(item.id) ?? [];
    const validated = validateSelections(groups, line.selections ?? []);
    if (!validated.ok) throw new Error(validated.error);

    const baseUnitPriceCents = unitPriceWithModifiers(item.price_cents, validated.selections);
    const modifiers = validated.selections.map((s) => ({
      groupName: s.groupName,
      optionName: s.quantity > 1 ? `${s.optionName} ×${s.quantity}` : s.optionName,
      priceDeltaCents: s.priceDeltaCents * s.quantity,
    }));

    const packedForTakeaway = shouldApplyTakeawayCharge(
      serviceType,
      line.packedForTakeaway ?? false,
    );
    const takeawaySurchargeCents = packedForTakeaway
      ? calculateTakeawaySurchargeCents(baseUnitPriceCents, takeawayChargeFromRow(item))
      : 0;
    const unitPriceCents = baseUnitPriceCents + takeawaySurchargeCents;

    subtotalCents += unitPriceCents * line.quantity;
    orderLines.push({
      menuItemId: item.id,
      name: item.name,
      quantity: line.quantity,
      unitPriceCents,
      modifiers,
      packedForTakeaway,
      takeawaySurchargeCents,
      note: normalizeLineNote(line.note),
    });
  }

  return { subtotalCents, orderLines };
}

export async function createOrderItems(
  orderId: string,
  lines: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    modifiers?: { groupName: string; optionName: string; priceDeltaCents: number }[];
    packedForTakeaway?: boolean;
    takeawaySurchargeCents?: number;
    note?: string;
  }[],
) {
  if (lines.length === 0) return;
  const rows = lines.map((line) => ({
    order_id: orderId,
    menu_item_id: line.menuItemId,
    name: line.name,
    quantity: line.quantity,
    unit_price_cents: line.unitPriceCents,
    modifiers: line.modifiers ?? null,
    packed_for_takeaway: line.packedForTakeaway ?? false,
    takeaway_surcharge_cents: line.takeawaySurchargeCents ?? 0,
    note: line.note ?? null,
  }));
  const { error } = await db().from("order_items").insert(rows);
  if (error && /note/i.test(error.message)) {
    // Migration 055 not applied yet — retry without the note column.
    const { error: retryError } = await db()
      .from("order_items")
      .insert(rows.map(({ note: _note, ...rest }) => rest));
    if (retryError) throw new Error(retryError.message);
    return;
  }
  if (error) throw new Error(error.message);
}

export async function getOrderItems(orderId: string): Promise<OrderItemRow[]> {
  const { data, error } = await db()
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (error) throw new Error(error.message);
  return (data ?? []) as OrderItemRow[];
}

export type MerchantOrderView = OrderRow & {
  table_number: string | null;
  customer_display: string | null;
  tier_name: string | null;
  items: OrderItemRow[];
};

export async function listMerchantOrders(
  merchantId: string,
  kitchenStatus?: string | "active",
  activeStatuses?: string[],
): Promise<MerchantOrderView[]> {
  let query = db()
    .from("orders")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(100);

  if (kitchenStatus && kitchenStatus !== "active") {
    query = query.eq("kitchen_status", kitchenStatus);
  } else if (kitchenStatus === "active" && activeStatuses?.length) {
    query = query.in("kitchen_status", activeStatuses);
  }

  const { data: orders, error } = await query;
  if (error) throw new Error(error.message);
  if (!orders?.length) return [];

  const orderRows = orders as OrderRow[];
  const orderIds = orderRows.map((o) => o.id);
  const tableIds = [...new Set(orderRows.map((o) => o.venue_table_id).filter(Boolean))];
  const customerIds = [...new Set(orderRows.map((o) => o.customer_id).filter(Boolean))];

  const [tablesRes, customersRes, itemsRes] = await Promise.all([
    tableIds.length
      ? db().from("venue_tables").select("*").in("id", tableIds)
      : Promise.resolve({ data: [], error: null }),
    customerIds.length
      ? db().from("customers").select("*").in("id", customerIds)
      : Promise.resolve({ data: [], error: null }),
    db().from("order_items").select("*").in("order_id", orderIds),
  ]);

  if (tablesRes.error) throw new Error(tablesRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);

  const tableMap = new Map(
    ((tablesRes.data ?? []) as VenueTableRow[]).map((t) => [t.id, t.table_number]),
  );
  const customerMap = new Map(
    ((customersRes.data ?? []) as CustomerRow[]).map((c) => [
      c.id,
      c.display_name ?? c.phone ?? "Guest",
    ]),
  );
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of (itemsRes.data ?? []) as OrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return orderRows.map((order) => ({
    ...order,
    table_number: order.venue_table_id
      ? (tableMap.get(order.venue_table_id) ?? null)
      : null,
    customer_display: order.customer_id
      ? (customerMap.get(order.customer_id) ?? null)
      : null,
    tier_name: null,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

export async function updateOrderKitchenStatus(
  merchantId: string,
  orderId: string,
  kitchenStatus: string,
): Promise<OrderRow> {
  const { data, error } = await db()
    .from("orders")
    .update({ kitchen_status: kitchenStatus })
    .eq("id", orderId)
    .eq("merchant_id", merchantId)
    .eq("status", "paid")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as OrderRow;
}

export async function remapMerchantOrderKitchenStatuses(
  merchantId: string,
  oldFlow: import("@/lib/kitchen/flow").KitchenFlow,
  newFlow: import("@/lib/kitchen/flow").KitchenFlow,
): Promise<void> {
  const { remapKitchenStatus } = await import("@/lib/kitchen/flow");
  const { data: orders, error } = await db()
    .from("orders")
    .select("id, kitchen_status")
    .eq("merchant_id", merchantId)
    .eq("status", "paid");

  if (error) throw new Error(error.message);
  if (!orders?.length) return;

  for (const order of orders as { id: string; kitchen_status: string | null }[]) {
    const next = remapKitchenStatus(order.kitchen_status, oldFlow, newFlow);
    if (next === order.kitchen_status) continue;
    const { error: updateError } = await db()
      .from("orders")
      .update({ kitchen_status: next })
      .eq("id", order.id);
    if (updateError) throw new Error(updateError.message);
  }
}

export async function listVenueTables(merchantId: string): Promise<VenueTableRow[]> {
  const { data, error } = await db()
    .from("venue_tables")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("table_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as VenueTableRow[];
}

export async function createVenueTable(
  merchantId: string,
  tableNumber: string,
): Promise<VenueTableRow> {
  const { data, error } = await db()
    .from("venue_tables")
    .insert([{ merchant_id: merchantId, table_number: tableNumber }])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as VenueTableRow;
}

export async function deleteVenueTable(merchantId: string, tableId: string) {
  const { error } = await db()
    .from("venue_tables")
    .delete()
    .eq("id", tableId)
    .eq("merchant_id", merchantId);

  if (error) throw new Error(error.message);
}

export async function listCustomersForMerchant(
  merchantId: string,
  search?: string,
): Promise<CustomerRow[]> {
  const query = db()
    .from("customers")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as CustomerRow[];
  if (search?.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (c) =>
        c.display_name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }
  return rows;
}

export type MemberActivityType =
  | "order"
  | "voucher_redeemed"
  | "voucher_issued"
  | "points"
  | "whatsapp"
  | "feedback";

export type MemberActivityItem = {
  id: string;
  type: MemberActivityType;
  title: string;
  at: string;
  description: string;
};

export type MemberVoucherStatus = "active" | "expiring_soon" | "redeemed" | "expired";

export type MemberVoucherItem = {
  id: string;
  name: string;
  description: string;
  expiresAt: string | null;
  status: MemberVoucherStatus;
  icon: "local_bar" | "percent" | "loyalty" | "card_giftcard";
  code?: string | null;
};

/** Active vouchers issued to a member (for storefront + admin). */
export type CustomerVoucherItem = {
  id: string;
  name: string;
  code: string | null;
  description: string;
  expiresAt: string | null;
  status: Extract<MemberVoucherStatus, "active" | "expiring_soon">;
  source: "stamp_card" | "campaign" | "merchant" | "unknown";
};

export type MemberDetailView = {
  customer: CustomerRow;
  lifetimeSpendCents: number;
  totalVisits: number;
  activity: MemberActivityItem[];
  vouchers: MemberVoucherItem[];
};

function formatMoneyLabel(cents: number, currency: "MYR" | "SGD"): string {
  const symbol = currency === "SGD" ? "S$" : "RM";
  return `${symbol}${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function voucherIconFor(type: "percentage" | "fixed", name: string): MemberVoucherItem["icon"] {
  if (type === "percentage") return "percent";
  const lower = name.toLowerCase();
  if (/sake|wine|drink|cocktail|beer|coffee/.test(lower)) return "local_bar";
  if (/gift|welcome|birthday/.test(lower)) return "card_giftcard";
  return "loyalty";
}

function resolveMemberVoucherStatus(
  promo: PromoRow,
  redeemedAt: string | null,
): MemberVoucherStatus {
  if (redeemedAt) return "redeemed";
  if (!promo.active) return "expired";
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return "expired";
  if (promo.expires_at) {
    const daysLeft =
      (new Date(promo.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 7) return "expiring_soon";
  }
  return "active";
}

export async function getMemberDetailForMerchant(
  merchantId: string,
  customerId: string,
  currency: "MYR" | "SGD" = "MYR",
): Promise<MemberDetailView | null> {
  const { data: customerData, error: customerError } = await db()
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (customerError) throw new Error(customerError.message);
  if (!customerData) return null;
  const customer = customerData as CustomerRow;

  const [ordersRes, ledgerRes, redemptionsRes, jobsRes] = await Promise.all([
    db()
      .from("orders")
      .select("id, total_cents, paid_at, created_at, status, venue_table_id, points_redeemed")
      .eq("merchant_id", merchantId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(40),
    db()
      .from("points_ledger")
      .select("id, delta, reason, created_at, order_id")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(40),
    db()
      .from("promo_redemptions")
      .select("id, promo_id, redeemed_at, promos(id, name, type, value, expires_at, active, code)")
      .eq("customer_id", customerId)
      .order("redeemed_at", { ascending: false })
      .limit(40),
    db()
      .from("automation_jobs")
      .select("id, job_type, status, payload, sent_at, created_at, run_at")
      .eq("merchant_id", merchantId)
      .eq("customer_id", customerId)
      .in("status", ["sent", "pending"])
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (ledgerRes.error) throw new Error(ledgerRes.error.message);
  if (redemptionsRes.error) throw new Error(redemptionsRes.error.message);
  if (jobsRes.error) throw new Error(jobsRes.error.message);

  type OrderLite = {
    id: string;
    total_cents: number;
    paid_at: string | null;
    created_at: string;
    status: string;
    venue_table_id: string | null;
    points_redeemed: number;
  };
  type LedgerLite = {
    id: string;
    delta: number;
    reason: string;
    created_at: string;
    order_id: string | null;
  };
  type RedemptionLite = {
    id: string;
    promo_id: string;
    redeemed_at: string;
    promos:
      | {
          id: string;
          name: string;
          type: "percentage" | "fixed";
          value: number;
          expires_at: string | null;
          active: boolean;
          code: string | null;
        }
      | {
          id: string;
          name: string;
          type: "percentage" | "fixed";
          value: number;
          expires_at: string | null;
          active: boolean;
          code: string | null;
        }[]
      | null;
  };
  type JobLite = {
    id: string;
    job_type: string;
    status: string;
    payload: Record<string, unknown> | null;
    sent_at: string | null;
    created_at: string;
    run_at: string;
  };

  const orders = (ordersRes.data ?? []) as OrderLite[];
  const ledger = (ledgerRes.data ?? []) as LedgerLite[];
  const redemptions = (redemptionsRes.data ?? []) as RedemptionLite[];
  const jobs = (jobsRes.data ?? []) as JobLite[];

  const paidOrders = orders.filter((o) => o.status === "paid");
  const lifetimeSpendCents = paidOrders.reduce((sum, o) => sum + Number(o.total_cents ?? 0), 0);
  const totalVisits = paidOrders.length;

  const tableIds = [
    ...new Set(orders.map((o) => o.venue_table_id).filter((id): id is string => Boolean(id))),
  ];
  const tableMap = new Map<string, string>();
  if (tableIds.length > 0) {
    const { data: tables, error: tablesError } = await db()
      .from("venue_tables")
      .select("id, table_number")
      .in("id", tableIds);
    if (tablesError) throw new Error(tablesError.message);
    for (const t of (tables ?? []) as { id: string; table_number: string }[]) {
      tableMap.set(t.id, t.table_number);
    }
  }

  const pointsByOrder = new Map<string, number>();
  for (const entry of ledger) {
    if (!entry.order_id || entry.delta <= 0) continue;
    pointsByOrder.set(entry.order_id, (pointsByOrder.get(entry.order_id) ?? 0) + entry.delta);
  }

  const activity: MemberActivityItem[] = [];

  for (const order of orders.slice(0, 20)) {
    const table = order.venue_table_id ? tableMap.get(order.venue_table_id) : null;
    const earned = pointsByOrder.get(order.id) ?? 0;
    const parts = [
      table ? `Table ${table}` : null,
      `${formatMoneyLabel(order.total_cents, currency)} total`,
      earned > 0 ? `Earned ${earned} points` : null,
      order.status === "pending" ? "Payment pending" : null,
      order.status === "cancelled" ? "Cancelled" : null,
    ].filter(Boolean);
    activity.push({
      id: `order-${order.id}`,
      type: "order",
      title: "Order Placed",
      at: order.paid_at ?? order.created_at,
      description: parts.join(". ") + (parts.length ? "." : ""),
    });
  }

  for (const row of redemptions) {
    const promo = Array.isArray(row.promos) ? row.promos[0] ?? null : row.promos;
    activity.push({
      id: `redeem-${row.id}`,
      type: "voucher_redeemed",
      title: "Voucher Redeemed",
      at: row.redeemed_at,
      description: promo ? `Redeemed '${promo.name}'.` : "Redeemed a voucher.",
    });
  }

  for (const entry of ledger) {
    if (entry.order_id && entry.delta > 0) continue;
    const reason = entry.reason.replace(/_/g, " ");
    activity.push({
      id: `points-${entry.id}`,
      type: "points",
      title: entry.delta >= 0 ? "Points Added" : "Points Redeemed",
      at: entry.created_at,
      description:
        entry.delta >= 0
          ? `+${entry.delta} points · ${reason}`
          : `${entry.delta} points · ${reason}`,
    });
  }

  for (const job of jobs) {
    if (job.job_type === "campaign_issue_voucher") {
      const promoName =
        typeof job.payload?.promoName === "string"
          ? job.payload.promoName
          : typeof job.payload?.code === "string"
            ? job.payload.code
            : "Voucher";
      const code =
        typeof job.payload?.code === "string" && job.payload.code
          ? ` Code ${job.payload.code}.`
          : "";
      activity.push({
        id: `issue-${job.id}`,
        type: "voucher_issued",
        title: "Voucher Issued",
        at: job.sent_at ?? job.run_at ?? job.created_at,
        description: `Issued '${promoName}'.${code}`,
      });
      continue;
    }
    if (!/whatsapp|sms|review|bounce|churn|winback/i.test(job.job_type)) continue;
    const message = typeof job.payload?.message === "string" ? job.payload.message : null;
    const preview = message
      ? message.length > 80
        ? `${message.slice(0, 77)}…`
        : message
      : job.job_type.replace(/_/g, " ");
    activity.push({
      id: `msg-${job.id}`,
      type: "whatsapp",
      title: job.status === "pending" ? "WhatsApp Message Queued" : "WhatsApp Message Sent",
      at: job.sent_at ?? job.run_at ?? job.created_at,
      description: preview.startsWith("Automated") ? preview : `Automated campaign: "${preview}"`,
    });
  }

  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const redeemedPromoIds = new Set(redemptions.map((r) => r.promo_id));
  const issuedCodes = new Set<string>();
  const issuedCampaignIds = new Set<string>();
  const issuedPromoIds = new Set<string>();
  for (const job of jobs) {
    const code = job.payload?.code;
    if (typeof code === "string" && code.trim()) issuedCodes.add(code.trim().toUpperCase());
    const campaignId = job.payload?.campaignId;
    if (typeof campaignId === "string") issuedCampaignIds.add(campaignId);
    const promoId = job.payload?.promoId;
    if (typeof promoId === "string") issuedPromoIds.add(promoId);
  }

  const vouchers: MemberVoucherItem[] = [];
  const seenPromoIds = new Set<string>();
  const hasIssued =
    issuedCodes.size > 0 || issuedCampaignIds.size > 0 || issuedPromoIds.size > 0;

  if (hasIssued) {
    const { data: promoRows, error: promoError } = await db()
      .from("promos")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("active", true);
    if (promoError) throw new Error(promoError.message);

    for (const promo of (promoRows ?? []) as PromoRow[]) {
      const codeMatch = promo.code && issuedCodes.has(promo.code.toUpperCase());
      const campaignMatch = promo.campaign_id && issuedCampaignIds.has(promo.campaign_id);
      const idMatch = issuedPromoIds.has(promo.id);
      if (!codeMatch && !campaignMatch && !idMatch) continue;
      if (redeemedPromoIds.has(promo.id)) continue;
      if (seenPromoIds.has(promo.id)) continue;
      seenPromoIds.add(promo.id);
      const status = resolveMemberVoucherStatus(promo, null);
      if (status === "expired" || status === "redeemed") continue;
      vouchers.push({
        id: promo.id,
        name: promo.name,
        description:
          promo.type === "percentage"
            ? `${promo.value}% off total bill`
            : `${currency === "SGD" ? "S$" : "RM"}${promo.value} off`,
        expiresAt: promo.expires_at,
        status,
        icon: voucherIconFor(promo.type, promo.name),
      });
    }
  }

  // Fall back to merchant-wide active promos when none were issued to this member.
  if (vouchers.length === 0 && !hasIssued) {
    const { data: activePromos, error: activePromoError } = await db()
      .from("promos")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(6);
    if (activePromoError) throw new Error(activePromoError.message);

    for (const promo of (activePromos ?? []) as PromoRow[]) {
      if (redeemedPromoIds.has(promo.id)) continue;
      const status = resolveMemberVoucherStatus(promo, null);
      if (status === "expired") continue;
      vouchers.push({
        id: promo.id,
        name: promo.name,
        description:
          promo.type === "percentage"
            ? `${promo.value}% off total bill`
            : `${currency === "SGD" ? "S$" : "RM"}${promo.value} off`,
        expiresAt: promo.expires_at,
        status,
        icon: voucherIconFor(promo.type, promo.name),
      });
      if (vouchers.length >= 4) break;
    }
  }

  return {
    customer,
    lifetimeSpendCents,
    totalVisits,
    activity: activity.slice(0, 25),
    vouchers,
  };
}

export async function listPromos(merchantId: string): Promise<PromoRow[]> {
  const { data, error } = await db()
    .from("promos")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PromoRow[];
}

/**
 * Vouchers issued to this customer that are still usable (not redeemed / expired).
 * Includes stamp-card, staff, and campaign issues tracked via automation_jobs.
 */
export async function listCustomerActiveVouchers(
  merchantId: string,
  customerId: string,
  currency: "MYR" | "SGD" = "MYR",
): Promise<CustomerVoucherItem[]> {
  const [jobsRes, redemptionsRes] = await Promise.all([
    db()
      .from("automation_jobs")
      .select("id, payload, created_at")
      .eq("merchant_id", merchantId)
      .eq("customer_id", customerId)
      .eq("job_type", "campaign_issue_voucher")
      .in("status", ["sent", "pending"])
      .order("created_at", { ascending: false })
      .limit(40),
    db()
      .from("promo_redemptions")
      .select("promo_id")
      .eq("customer_id", customerId),
  ]);

  if (jobsRes.error) throw new Error(jobsRes.error.message);
  if (redemptionsRes.error) throw new Error(redemptionsRes.error.message);

  const redeemedPromoIds = new Set(
    ((redemptionsRes.data ?? []) as { promo_id: string }[]).map((r) => r.promo_id),
  );

  type IssueJob = {
    id: string;
    payload: Record<string, unknown> | null;
    created_at: string;
  };
  const jobs = (jobsRes.data ?? []) as IssueJob[];
  if (jobs.length === 0) return [];

  const issuedPromoIds = new Set<string>();
  const issuedCodes = new Set<string>();
  const sourceByPromoId = new Map<string, CustomerVoucherItem["source"]>();
  const sourceByCode = new Map<string, CustomerVoucherItem["source"]>();

  for (const job of jobs) {
    const payload = job.payload ?? {};
    const issuedBy =
      payload.issuedBy === "stamp_card"
        ? "stamp_card"
        : payload.issuedBy === "merchant"
          ? "merchant"
          : payload.campaignId
            ? "campaign"
            : "unknown";
    const promoId = typeof payload.promoId === "string" ? payload.promoId : null;
    const code =
      typeof payload.code === "string" && payload.code.trim()
        ? payload.code.trim().toUpperCase()
        : null;
    if (promoId) {
      issuedPromoIds.add(promoId);
      if (!sourceByPromoId.has(promoId)) sourceByPromoId.set(promoId, issuedBy);
    }
    if (code) {
      issuedCodes.add(code);
      if (!sourceByCode.has(code)) sourceByCode.set(code, issuedBy);
    }
  }

  if (issuedPromoIds.size === 0 && issuedCodes.size === 0) return [];

  const { data: promoRows, error: promoError } = await db()
    .from("promos")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("active", true);
  if (promoError) throw new Error(promoError.message);

  const money = currency === "SGD" ? "S$" : "RM";
  const vouchers: CustomerVoucherItem[] = [];
  const seen = new Set<string>();

  for (const promo of (promoRows ?? []) as PromoRow[]) {
    const codeMatch = promo.code && issuedCodes.has(promo.code.toUpperCase());
    const idMatch = issuedPromoIds.has(promo.id);
    if (!codeMatch && !idMatch) continue;
    if (redeemedPromoIds.has(promo.id)) continue;
    if (seen.has(promo.id)) continue;
    seen.add(promo.id);

    const status = resolveMemberVoucherStatus(promo, null);
    if (status !== "active" && status !== "expiring_soon") continue;

    const source =
      sourceByPromoId.get(promo.id) ??
      (promo.code ? sourceByCode.get(promo.code.toUpperCase()) : undefined) ??
      "unknown";

    vouchers.push({
      id: promo.id,
      name: promo.name,
      code: promo.code,
      description:
        promo.type === "percentage"
          ? `${promo.value}% off total bill`
          : `${money}${Number(promo.value).toFixed(2)} off`,
      expiresAt: promo.expires_at,
      status,
      source,
    });
  }

  return vouchers;
}

export async function createPromo(
  merchantId: string,
  input: {
    name: string;
    code: string | null;
    type: "percentage" | "fixed";
    value: number;
    minSpendCents: number | null;
    expiresAt: string | null;
    campaignId?: string | null;
  },
): Promise<PromoRow> {
  const { data, error } = await db()
    .from("promos")
    .insert([
      {
        merchant_id: merchantId,
        name: input.name,
        code: input.code,
        type: input.type,
        value: input.value,
        min_spend_cents: input.minSpendCents,
        expires_at: input.expiresAt,
        active: true,
        ...(input.campaignId ? { campaign_id: input.campaignId } : {}),
      },
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as PromoRow;
}

export async function updatePromo(
  merchantId: string,
  promoId: string,
  patch: Partial<
    Pick<PromoRow, "name" | "active" | "value" | "expires_at" | "campaign_id">
  >,
): Promise<PromoRow> {
  const { data, error } = await db()
    .from("promos")
    .update(patch)
    .eq("id", promoId)
    .eq("merchant_id", merchantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as PromoRow;
}

export async function getPromoById(
  merchantId: string,
  promoId: string,
): Promise<PromoRow | null> {
  const { data, error } = await db()
    .from("promos")
    .select("*")
    .eq("id", promoId)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PromoRow | null) ?? null;
}

/** Promos owned by a campaign (issue_voucher step), newest first. */
export async function listPromosForCampaign(
  merchantId: string,
  campaignId: string,
): Promise<PromoRow[]> {
  const { data, error } = await db()
    .from("promos")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PromoRow[];
}

export async function listVoucherInventory(
  merchantId: string,
  currency: "MYR" | "SGD" = "MYR",
): Promise<VoucherInventoryItem[]> {
  const promos = await listPromos(merchantId);
  if (promos.length === 0) return [];

  const promoIds = promos.map((p) => p.id);
  const { data: redemptionRows, error: redemptionError } = await db()
    .from("promo_redemptions")
    .select("id, promo_id, customer_id, redeemed_at, customers(display_name)")
    .in("promo_id", promoIds)
    .order("redeemed_at", { ascending: false });

  if (redemptionError) throw new Error(redemptionError.message);

  type RedemptionRow = {
    id: string;
    promo_id: string;
    customer_id: string | null;
    redeemed_at: string;
    customers: { display_name: string | null } | { display_name: string | null }[] | null;
  };

  const redemptions = (redemptionRows ?? []) as RedemptionRow[];
  const promoById = new Map(promos.map((p) => [p.id, p]));
  const promosWithRedemptions = new Set(redemptions.map((r) => r.promo_id));

  const campaignIds = [
    ...new Set(promos.map((p) => p.campaign_id).filter((id): id is string => Boolean(id))),
  ];
  const campaignById = new Map<string, { name: string; status: CampaignRow["status"] }>();
  if (campaignIds.length > 0) {
    const { data: campaignRows, error: campaignError } = await db()
      .from("campaigns")
      .select("id, name, status")
      .eq("merchant_id", merchantId)
      .in("id", campaignIds);
    if (campaignError) throw new Error(campaignError.message);
    for (const row of (campaignRows ?? []) as { id: string; name: string; status: CampaignRow["status"] }[]) {
      campaignById.set(row.id, { name: row.name, status: row.status });
    }
  }

  const campaignMeta = (promo: PromoRow) => {
    const campaign = promo.campaign_id ? campaignById.get(promo.campaign_id) : null;
    return {
      campaignId: promo.campaign_id ?? null,
      campaignName: campaign?.name ?? null,
      campaignActive: campaign?.status === "active",
    };
  };

  const items: VoucherInventoryItem[] = [];

  for (const row of redemptions) {
    const promo = promoById.get(row.promo_id);
    if (!promo) continue;
    const customerRaw = row.customers;
    const customerName = Array.isArray(customerRaw)
      ? (customerRaw[0]?.display_name ?? null)
      : (customerRaw?.display_name ?? null);

    items.push({
      id: row.id,
      promoId: promo.id,
      code: formatVoucherCode(promo.code, row.id),
      customerName,
      valueLabel: formatVoucherValue(promo.type, Number(promo.value), currency),
      status: "redeemed",
      expiresAt: promo.expires_at,
      issuedAt: promo.created_at ?? row.redeemed_at,
      issuedBy: "Admin",
      redeemedAt: row.redeemed_at,
      promoName: promo.name,
      ...campaignMeta(promo),
    });
  }

  for (const promo of promos) {
    if (promosWithRedemptions.has(promo.id)) continue;
    items.push({
      id: promo.id,
      promoId: promo.id,
      code: formatVoucherCode(promo.code, promo.id),
      customerName: null,
      valueLabel: formatVoucherValue(promo.type, Number(promo.value), currency),
      status: resolveVoucherStatus({
        active: promo.active,
        expiresAt: promo.expires_at,
        redeemedAt: null,
      }),
      expiresAt: promo.expires_at,
      issuedAt: promo.created_at ?? new Date().toISOString(),
      issuedBy: "Admin",
      redeemedAt: null,
      promoName: promo.name,
      ...campaignMeta(promo),
    });
  }

  return items.sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );
}

export async function listCampaigns(merchantId: string): Promise<CampaignRow[]> {
  const { data, error } = await db()
    .from("campaigns")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignRow[];
}

export async function createCampaign(
  merchantId: string,
  input: {
    name: string;
    channel: CampaignRow["channel"];
    status: CampaignRow["status"];
    messageBody?: string | null;
    bannerTitle?: string | null;
    bannerText?: string | null;
    bannerImageUrl?: string | null;
    linkUrl?: string | null;
    workflow?: unknown;
    triggerType?: string | null;
  },
): Promise<CampaignRow> {
  const { data, error } = await db()
    .from("campaigns")
    .insert([
      {
        merchant_id: merchantId,
        name: input.name,
        channel: input.channel,
        status: input.status,
        message_body: input.messageBody ?? null,
        banner_title: input.bannerTitle ?? null,
        banner_text: input.bannerText ?? null,
        banner_image_url: input.bannerImageUrl ?? null,
        link_url: input.linkUrl ?? null,
        workflow: input.workflow ?? null,
        trigger_type: input.triggerType ?? null,
      },
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CampaignRow;
}

export async function updateCampaign(
  merchantId: string,
  campaignId: string,
  patch: Partial<
    Pick<
      CampaignRow,
      | "name"
      | "status"
      | "message_body"
      | "banner_title"
      | "banner_text"
      | "banner_image_url"
      | "link_url"
      | "workflow"
      | "trigger_type"
      | "status_reason"
    >
  >,
): Promise<CampaignRow> {
  const { data, error } = await db()
    .from("campaigns")
    .update(patch)
    .eq("id", campaignId)
    .eq("merchant_id", merchantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CampaignRow;
}

export async function getActiveBannerCampaign(
  merchantId: string,
): Promise<CampaignRow | null> {
  const { data, error } = await db()
    .from("campaigns")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("channel", "banner")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CampaignRow | null) ?? null;
}

/**
 * Active WhatsApp/auto campaigns used to drive the post-payment join CTA.
 * Caller picks the welcome journey via `pickWelcomeCampaign`.
 */
export async function listActiveMessagingCampaigns(
  merchantId: string,
): Promise<CampaignRow[]> {
  const { data, error } = await db()
    .from("campaigns")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("status", "active")
    .in("channel", ["whatsapp", "auto"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignRow[];
}

export async function updateCampaignStatus(
  merchantId: string,
  campaignId: string,
  status: CampaignRow["status"],
): Promise<CampaignRow> {
  if (status === "active") {
    const { data: target, error: targetError } = await db()
      .from("campaigns")
      .select("channel, trigger_type")
      .eq("id", campaignId)
      .eq("merchant_id", merchantId)
      .single();

    if (targetError) throw new Error(targetError.message);

    const { channel, trigger_type: triggerType } = target as Pick<
      CampaignRow,
      "channel" | "trigger_type"
    >;
    // Only one banner can occupy the storefront strip, and only one manual
    // broadcast can be armed per channel. Triggered workflows (welcome,
    // win-back, …) run concurrently — each fires on its own event.
    const isExclusive =
      channel === "banner" || ((channel === "whatsapp" || channel === "sms") && triggerType === "manual");

    if (isExclusive) {
      const query = db()
        .from("campaigns")
        .update({ status: "paused" })
        .eq("merchant_id", merchantId)
        .eq("channel", channel)
        .in("status", ["active", "scheduled"])
        .neq("id", campaignId);

      const { error: pauseError } =
        channel === "banner" ? await query : await query.eq("trigger_type", "manual");

      if (pauseError) throw new Error(pauseError.message);
    }
  }

  const { data, error } = await db()
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId)
    .eq("merchant_id", merchantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CampaignRow;
}

export async function getMerchantAnalytics(merchantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [ordersRes, customersRes, levelsRes, recentOrdersRes] = await Promise.all([
    db()
      .from("orders")
      .select("total_cents, paid_at, created_at")
      .eq("merchant_id", merchantId)
      .eq("status", "paid"),
    db()
      .from("customers")
      .select("id, lifetime_points_earned, is_member, last_visit_at, created_at")
      .eq("merchant_id", merchantId),
    db()
      .from("reward_levels")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("level_number", { ascending: true }),
    db()
      .from("orders")
      .select("customer_id, total_cents, paid_at")
      .eq("merchant_id", merchantId)
      .eq("status", "paid")
      .not("customer_id", "is", null)
      .gte("paid_at", new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);
  if (levelsRes.error) throw new Error(levelsRes.error.message);
  if (recentOrdersRes.error) throw new Error(recentOrdersRes.error.message);

  const orders = ordersRes.data ?? [];
  const customers = customersRes.data ?? [];
  const levels = levelsRes.data ?? [];
  const recentOrders = recentOrdersRes.data ?? [];

  const visits90 = new Map<string, { count: number; spend: number }>();
  const d90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
  for (const o of recentOrders) {
    if (!o.customer_id || !o.paid_at) continue;
    if (new Date(o.paid_at as string).getTime() < d90) continue;
    const cur = visits90.get(o.customer_id as string) ?? { count: 0, spend: 0 };
    cur.count += 1;
    cur.spend += o.total_cents as number;
    visits90.set(o.customer_id as string, cur);
  }

  const members = customers.filter((c) => c.is_member);
  const totalMembers = members.length || 1;

  type Segment = { key: string; label: string; count: number; pct: number; detail: string; color: string };
  const segments: Segment[] = [];
  let newJoined = 0;
  let frequent = 0;
  let loyal = 0;
  let infrequent = 0;
  let atRisk = 0;

  for (const c of members) {
    const id = c.id as string;
    const v = visits90.get(id);
    const lastVisit = c.last_visit_at ? new Date(c.last_visit_at as string).getTime() : 0;
    const daysSince = lastVisit ? (Date.now() - lastVisit) / (24 * 60 * 60 * 1000) : 999;

    if (!v || v.count === 0) {
      if (daysSince > 90) atRisk += 1;
      else newJoined += 1;
      continue;
    }
    if (v.count >= 3) loyal += 1;
    else if (v.count >= 2) frequent += 1;
    else infrequent += 1;
  }

  const pct = (n: number) => Math.round((n / totalMembers) * 100);
  const avgSpend = (n: number, spend: number) =>
    n > 0 ? `RM ${(spend / n / 100).toFixed(2)} avg spend / visit` : "";

  let frequentSpend = 0;
  let loyalSpend = 0;
  let infrequentSpend = 0;
  for (const [, v] of visits90) {
    if (v.count >= 3) loyalSpend += v.spend;
    else if (v.count >= 2) frequentSpend += v.spend;
    else infrequentSpend += v.spend;
  }

  segments.push(
    {
      key: "new",
      label: "New / joined",
      count: newJoined,
      pct: pct(newJoined),
      detail: `${newJoined} members with no recent visits`,
      color: "#FACC15",
    },
    {
      key: "frequent",
      label: "Frequent",
      count: frequent,
      pct: pct(frequent),
      detail: `${frequent} visit 2–3× in 90 days. ${avgSpend(frequent, frequentSpend)}`,
      color: "#86EFAC",
    },
    {
      key: "loyal",
      label: "Loyal",
      count: loyal,
      pct: pct(loyal),
      detail: `${loyal} visit 3+ times in 90 days. ${avgSpend(loyal, loyalSpend)}`,
      color: "#22C55E",
    },
    {
      key: "infrequent",
      label: "Infrequent",
      count: infrequent,
      pct: pct(infrequent),
      detail: `${infrequent} visited once in 90 days. ${avgSpend(infrequent, infrequentSpend)}`,
      color: "#FB923C",
    },
    {
      key: "at_risk",
      label: "At risk / dormant",
      count: atRisk,
      pct: pct(atRisk),
      detail: `${atRisk} with no visit in 90+ days`,
      color: "#EF4444",
    },
  );

  const revenueToday = orders
    .filter((o) => o.paid_at && o.paid_at >= todayIso)
    .reduce((sum, o) => sum + (o.total_cents as number), 0);

  const ordersToday = orders.filter(
    (o) => o.paid_at && o.paid_at >= todayIso,
  ).length;

  const memberJoins = customers.filter((c) => c.is_member).length;

  const tierDistribution = levels.map((level) => {
    const count = customers.filter(
      (c) =>
        (c.lifetime_points_earned as number) >= level.min_lifetime_points &&
        !levels.some(
          (l) =>
            l.level_number > level.level_number &&
            (c.lifetime_points_earned as number) >= l.min_lifetime_points,
        ),
    ).length;
    const pct =
      customers.length > 0 ? Math.round((count / customers.length) * 100) : 0;
    return { tier: level.name, pct, count };
  });

  const hourlyBuckets = Array.from({ length: 17 }, (_, i) => 6 + i);
  const hourly = hourlyBuckets.map((hour) => {
    const count = orders.filter((o) => {
      if (!o.paid_at || o.paid_at < todayIso) return false;
      return new Date(o.paid_at as string).getHours() === hour;
    }).length;
    return { hour, count };
  });

  const maxHourly = Math.max(1, ...hourly.map((h) => h.count));

  return {
    revenueTodayCents: revenueToday,
    ordersToday,
    memberJoins,
    repeatRatePct:
      customers.length > 0
        ? Math.round(
            (customers.filter((c) => (c.lifetime_points_earned as number) > 0)
              .length /
              customers.length) *
              100,
          )
        : 0,
    tierDistribution,
    hourly: hourly.map((h) => ({
      ...h,
      heightPct: Math.round((h.count / maxHourly) * 100),
    })),
    memberInsights: {
      totalMembers: members.length,
      segments,
    },
  };
}

export async function getOrderItemsForOrder(orderId: string) {
  const { data, error } = await db()
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as import("@/lib/db/types").OrderItemRow[];
}

export async function getPromoByCode(
  merchantId: string,
  code: string,
): Promise<import("@/lib/db/types").PromoRow | null> {
  const { data, error } = await db()
    .from("promos")
    .select("*")
    .eq("merchant_id", merchantId)
    .ilike("code", code.trim())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as import("@/lib/db/types").PromoRow | null;
}

export async function recordPromoRedemption(input: {
  promoId: string;
  customerId: string | null;
  orderId: string;
}) {
  const { error } = await db().from("promo_redemptions").insert([
    {
      promo_id: input.promoId,
      customer_id: input.customerId,
      order_id: input.orderId,
    },
  ]);
  if (error) throw new Error(error.message);

  const { data: promo } = await db()
    .from("promos")
    .select("campaign_id")
    .eq("id", input.promoId)
    .maybeSingle();
  const campaignId = (promo as { campaign_id?: string | null } | null)?.campaign_id;
  if (campaignId) {
    const { recordCampaignEvent } = await import("@/lib/db/automation-repository");
    await recordCampaignEvent(campaignId, "redeem").catch(() => undefined);
  }
}
