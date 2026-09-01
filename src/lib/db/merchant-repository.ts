import { createInsforgeAdmin } from "@/lib/insforge/client";
import {
  isMenuItemAvailableNow,
  type MenuItemAvailabilityFields,
  type WeeklySchedule,
} from "@/lib/menu/availability";
import type {
  AutomationRuleRow,
  CampaignRow,
  CustomerRow,
  KitchenStatus,
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
  return createInsforgeAdmin().database;
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
  return { ...row, merchant: row.merchants };
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
      | "google_review_delay_minutes"
      | "bounce_back_discount_percent"
      | "bounce_back_expiry_days"
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
  input: { label: string },
): Promise<MenuCategoryRow> {
  const label = input.label.trim();
  if (!label) throw new Error("Category name is required");

  const categories = await listMenuCategories(merchantId);
  const baseSlug = slugifyCategoryLabel(label) || "category";
  let slug = baseSlug;
  let suffix = 1;
  while (categories.some((c) => c.slug === slug)) {
    slug = `${baseSlug}-${suffix++}`;
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
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as MenuCategoryRow;
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
) {
  const categories = await listMenuCategories(merchantId);
  const { data, error } = await db()
    .from("menu_items")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  const items = (data ?? []) as MenuItemRow[];

  return categories.map((cat) => ({
    id: cat.slug,
    label: cat.label,
    items: items
      .filter((item) => item.category_id === cat.id)
      .filter((item) => isMenuItemAvailableNow(availabilityFromRow(item), timeZone))
      .map((item) => ({
        id: item.slug,
        name: item.name,
        description: item.description ?? "",
        priceCents: item.price_cents,
        category: cat.slug,
        menuItemId: item.id,
        imageUrl: item.image_url,
        tags: item.tags ?? [],
      })),
  }));
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
    availabilityMode?: "always" | "weekly" | "date_range";
    availabilityWeekly?: WeeklySchedule | null;
    availableFrom?: string | null;
    availableUntil?: string | null;
  },
): Promise<MenuItemRow> {
  const categories = await listMenuCategories(merchantId);
  const category = categories.find((c) => c.slug === input.categorySlug);
  if (!category) throw new Error("Category not found");

  const { data, error } = await db()
    .from("menu_items")
    .upsert(
      {
        merchant_id: merchantId,
        category_id: category.id,
        slug: input.slug,
        name: input.name,
        description: input.description,
        price_cents: input.priceCents,
        active: input.active,
        image_url: input.imageUrl ?? null,
        tags: input.tags ?? [],
        availability_mode: input.availabilityMode ?? "always",
        availability_weekly: input.availabilityWeekly ?? null,
        available_from: input.availableFrom ?? null,
        available_until: input.availableUntil ?? null,
      },
      { onConflict: "merchant_id,slug" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as MenuItemRow;
}

export async function resolveMenuItemsForCheckout(
  merchantId: string,
  lines: { id: string; quantity: number }[],
  timeZone: string,
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
  let subtotalCents = 0;
  const orderLines: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }[] = [];

  for (const line of lines) {
    const item = bySlug.get(line.id);
    if (!item) throw new Error(`Unknown item: ${line.id}`);
    if (!isMenuItemAvailableNow(availabilityFromRow(item), timeZone)) {
      throw new Error(`${item.name} is not available right now`);
    }
    subtotalCents += item.price_cents * line.quantity;
    orderLines.push({
      menuItemId: item.id,
      name: item.name,
      quantity: line.quantity,
      unitPriceCents: item.price_cents,
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
  }[],
) {
  if (lines.length === 0) return;
  const { error } = await db().from("order_items").insert(
    lines.map((line) => ({
      order_id: orderId,
      menu_item_id: line.menuItemId,
      name: line.name,
      quantity: line.quantity,
      unit_price_cents: line.unitPriceCents,
    })),
  );
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
  kitchenStatus?: KitchenStatus | "active",
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
  } else if (kitchenStatus === "active") {
    query = query.in("kitchen_status", ["new", "preparing", "ready"]);
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
  kitchenStatus: KitchenStatus,
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

export async function listPromos(merchantId: string): Promise<PromoRow[]> {
  const { data, error } = await db()
    .from("promos")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PromoRow[];
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
  patch: Partial<Pick<PromoRow, "name" | "active" | "value">>,
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
    linkUrl?: string | null;
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
        link_url: input.linkUrl ?? null,
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
      | "link_url"
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

export async function updateCampaignStatus(
  merchantId: string,
  campaignId: string,
  status: CampaignRow["status"],
): Promise<CampaignRow> {
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

export async function listAutomationRules(
  merchantId: string,
): Promise<AutomationRuleRow[]> {
  const { data, error } = await db()
    .from("automation_rules")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("rule_key", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AutomationRuleRow[];
}

export async function setAutomationRuleEnabled(
  merchantId: string,
  ruleKey: string,
  enabled: boolean,
): Promise<AutomationRuleRow> {
  const { data, error } = await db()
    .from("automation_rules")
    .update({ enabled })
    .eq("merchant_id", merchantId)
    .eq("rule_key", ruleKey)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as AutomationRuleRow;
}

export async function getMerchantAnalytics(merchantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [ordersRes, customersRes, levelsRes] = await Promise.all([
    db()
      .from("orders")
      .select("total_cents, paid_at, created_at")
      .eq("merchant_id", merchantId)
      .eq("status", "paid"),
    db()
      .from("customers")
      .select("lifetime_points_earned, is_member")
      .eq("merchant_id", merchantId),
    db()
      .from("reward_levels")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("level_number", { ascending: true }),
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);
  if (levelsRes.error) throw new Error(levelsRes.error.message);

  const orders = ordersRes.data ?? [];
  const customers = customersRes.data ?? [];
  const levels = levelsRes.data ?? [];

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

  const hourly = Array.from({ length: 10 }, (_, i) => {
    const hour = 8 + i;
    const count = orders.filter((o) => {
      if (!o.paid_at) return false;
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
}
