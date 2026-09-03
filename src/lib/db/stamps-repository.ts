import { adminDb } from "@/lib/db/admin";
import type {
  CustomerStampCardRow,
  StampProgramRow,
  StampsLedgerRow,
} from "@/lib/db/types";
import {
  normalizeCardSize,
  type StampProgramConfig,
  type StampRewardType,
} from "@/lib/loyalty/stamps";

function db() {
  return adminDb();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

export function serializeStampProgram(row: StampProgramRow): StampProgramConfig & {
  id: string;
  merchantId: string;
} {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    cardSize: normalizeCardSize(row.card_size),
    rewardType: row.reward_type as StampRewardType,
    rewardLabel: row.reward_label,
    rewardMenuItemId: row.reward_menu_item_id,
    rewardPercent: row.reward_percent != null ? Number(row.reward_percent) : null,
    rewardCents: row.reward_cents,
    qualifyingMenuItemIds: asStringArray(row.qualifying_menu_item_ids),
    qualifyingCategoryIds: asStringArray(row.qualifying_category_ids),
    maxStampsPerOrder: row.max_stamps_per_order,
    maxStampsPerDay: row.max_stamps_per_day,
    cartNudgeEnabled: row.cart_nudge_enabled !== false,
  };
}

export async function getStampProgram(
  merchantId: string,
): Promise<StampProgramRow | null> {
  const { data, error } = await db()
    .from("stamp_programs")
    .select("*")
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as StampProgramRow | null;
}

export async function upsertStampProgram(
  merchantId: string,
  input: {
    cardSize: number;
    rewardType: StampRewardType;
    rewardLabel: string;
    rewardMenuItemId?: string | null;
    rewardPercent?: number | null;
    rewardCents?: number | null;
    qualifyingMenuItemIds?: string[];
    qualifyingCategoryIds?: string[];
    maxStampsPerOrder?: number | null;
    maxStampsPerDay?: number | null;
    cartNudgeEnabled?: boolean;
  },
): Promise<StampProgramRow> {
  const payload = {
    merchant_id: merchantId,
    card_size: normalizeCardSize(input.cardSize),
    reward_type: input.rewardType,
    reward_label: input.rewardLabel.trim() || "Free drink",
    reward_menu_item_id: input.rewardMenuItemId ?? null,
    reward_percent: input.rewardPercent ?? null,
    reward_cents: input.rewardCents ?? null,
    qualifying_menu_item_ids: input.qualifyingMenuItemIds ?? [],
    qualifying_category_ids: input.qualifyingCategoryIds ?? [],
    max_stamps_per_order: input.maxStampsPerOrder ?? null,
    max_stamps_per_day: input.maxStampsPerDay ?? null,
    cart_nudge_enabled: input.cartNudgeEnabled !== false,
    updated_at: new Date().toISOString(),
  };

  const existing = await getStampProgram(merchantId);
  if (existing) {
    const { data, error } = await db()
      .from("stamp_programs")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as StampProgramRow;
  }

  const { data, error } = await db()
    .from("stamp_programs")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StampProgramRow;
}

/** Active menu item slugs that earn stamps (for storefront Pay-bar nudge). */
export async function listQualifyingMenuItemSlugs(
  merchantId: string,
  program: Pick<StampProgramConfig, "qualifyingMenuItemIds" | "qualifyingCategoryIds">,
): Promise<string[]> {
  const itemIds = new Set(program.qualifyingMenuItemIds);
  const categoryIds = new Set(program.qualifyingCategoryIds);
  if (itemIds.size === 0 && categoryIds.size === 0) return [];

  const { data, error } = await db()
    .from("menu_items")
    .select("id, slug, category_id")
    .eq("merchant_id", merchantId)
    .eq("active", true);

  if (error) throw new Error(error.message);

  return ((data ?? []) as { id: string; slug: string; category_id: string | null }[])
    .filter(
      (row) =>
        itemIds.has(row.id) ||
        (row.category_id != null && categoryIds.has(row.category_id)),
    )
    .map((row) => row.slug)
    .filter(Boolean);
}

export async function getCustomerStampCard(
  merchantId: string,
  customerId: string,
): Promise<CustomerStampCardRow | null> {
  const { data, error } = await db()
    .from("customer_stamp_cards")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CustomerStampCardRow | null;
}

export async function ensureCustomerStampCard(
  merchantId: string,
  customerId: string,
): Promise<CustomerStampCardRow> {
  const existing = await getCustomerStampCard(merchantId, customerId);
  if (existing) return existing;

  const { data, error } = await db()
    .from("customer_stamp_cards")
    .insert({
      merchant_id: merchantId,
      customer_id: customerId,
      stamps_collected: 0,
      cards_completed: 0,
      pending_reward: false,
    })
    .select("*")
    .single();

  if (error) {
    // Race: another request created it
    const again = await getCustomerStampCard(merchantId, customerId);
    if (again) return again;
    throw new Error(error.message);
  }
  return data as CustomerStampCardRow;
}

export async function updateCustomerStampCard(
  cardId: string,
  patch: Partial<
    Pick<
      CustomerStampCardRow,
      "stamps_collected" | "cards_completed" | "pending_reward"
    >
  >,
): Promise<CustomerStampCardRow> {
  const { data, error } = await db()
    .from("customer_stamp_cards")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CustomerStampCardRow;
}

export async function hasStampsLedgerEntry(
  orderId: string,
  customerId: string,
  reason: string,
): Promise<boolean> {
  const { data, error } = await db()
    .from("stamps_ledger")
    .select("id")
    .eq("order_id", orderId)
    .eq("customer_id", customerId)
    .eq("reason", reason)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function appendStampsLedger(input: {
  merchantId: string;
  customerId: string;
  orderId: string | null;
  delta: number;
  reason: string;
}): Promise<StampsLedgerRow> {
  const { data, error } = await db()
    .from("stamps_ledger")
    .insert({
      merchant_id: input.merchantId,
      customer_id: input.customerId,
      order_id: input.orderId,
      delta: input.delta,
      reason: input.reason,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StampsLedgerRow;
}

/** Positive earn deltas today (merchant TZ approximated by UTC day for v1). */
export async function stampsEarnedToday(
  merchantId: string,
  customerId: string,
  dayStartIso: string,
): Promise<number> {
  const { data, error } = await db()
    .from("stamps_ledger")
    .select("delta")
    .eq("merchant_id", merchantId)
    .eq("customer_id", customerId)
    .gt("delta", 0)
    .gte("created_at", dayStartIso)
    .in("reason", ["order_paid", "staff_add"]);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce(
    (sum, row) => sum + Math.max(0, Number((row as { delta: number }).delta)),
    0,
  );
}

export async function getMenuItemCategoryMap(
  merchantId: string,
  menuItemIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (menuItemIds.length === 0) return map;

  const { data, error } = await db()
    .from("menu_items")
    .select("id, category_id")
    .eq("merchant_id", merchantId)
    .in("id", menuItemIds);

  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const r = row as { id: string; category_id: string };
    map.set(r.id, r.category_id);
  }
  return map;
}

export async function getMenuItemPriceCents(
  merchantId: string,
  menuItemId: string,
): Promise<number | null> {
  const { data, error } = await db()
    .from("menu_items")
    .select("price_cents")
    .eq("merchant_id", merchantId)
    .eq("id", menuItemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return Number((data as { price_cents: number }).price_cents);
}
