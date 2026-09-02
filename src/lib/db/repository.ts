import { createInsforgeAdmin } from "@/lib/insforge/client";
import type {
  CustomerRow,
  JoinTokenRow,
  MerchantRow,
  OrderRow,
  RewardLevelRow,
  VenueTableRow,
} from "@/lib/db/types";

function db() {
  return createInsforgeAdmin().database;
}

export async function getMerchantBySlug(slug: string): Promise<MerchantRow | null> {
  const { data, error } = await db()
    .from("merchants")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as MerchantRow | null;
}

export async function getMerchantById(merchantId: string): Promise<MerchantRow | null> {
  const { data, error } = await db()
    .from("merchants")
    .select("*")
    .eq("id", merchantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as MerchantRow | null;
}

export async function getVenueTable(
  merchantId: string,
  tableNumber: string,
): Promise<VenueTableRow | null> {
  const { data, error } = await db()
    .from("venue_tables")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("table_number", tableNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as VenueTableRow | null;
}

export async function createPendingOrder(input: {
  merchantId: string;
  venueTableId: string;
  subtotalCents: number;
  serviceChargeCents?: number;
  taxCents?: number;
  taxLabel?: string | null;
  discountCents?: number;
  customerId?: string | null;
  paymentRef?: string;
  promoId?: string | null;
  pointsRedeemed?: number;
  serviceType?: "dine_in" | "takeaway";
}): Promise<OrderRow> {
  const discountCents = input.discountCents ?? 0;
  const serviceChargeCents = input.serviceChargeCents ?? 0;
  const taxCents = input.taxCents ?? 0;
  const totalCents = Math.max(
    0,
    input.subtotalCents + serviceChargeCents + taxCents - discountCents,
  );

  const { data, error } = await db()
    .from("orders")
    .insert([
      {
        merchant_id: input.merchantId,
        venue_table_id: input.venueTableId,
        customer_id: input.customerId ?? null,
        status: "pending",
        subtotal_cents: input.subtotalCents,
        service_charge_cents: serviceChargeCents,
        tax_cents: taxCents,
        tax_label: input.taxLabel ?? null,
        discount_cents: discountCents,
        total_cents: totalCents,
        payment_ref: input.paymentRef ?? null,
        promo_id: input.promoId ?? null,
        points_redeemed: input.pointsRedeemed ?? 0,
        service_type: input.serviceType ?? "dine_in",
      },
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as OrderRow;
}

export async function getOrderById(orderId: string): Promise<OrderRow | null> {
  const { data, error } = await db()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as OrderRow | null;
}

export async function getOrderByPaymentRef(paymentRef: string): Promise<OrderRow | null> {
  const { data, error } = await db()
    .from("orders")
    .select("*")
    .eq("payment_ref", paymentRef)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as OrderRow | null;
}

export async function markOrderPaid(
  orderId: string,
  paymentRef: string,
): Promise<OrderRow> {
  const { data, error } = await db()
    .from("orders")
    .update({
      status: "paid",
      payment_ref: paymentRef,
      paid_at: new Date().toISOString(),
      kitchen_status: "new",
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    const existing = await getOrderById(orderId);
    if (existing?.status === "paid") return existing;
    throw new Error("Order not found or already processed");
  }
  return data as OrderRow;
}

export async function createJoinToken(orderId: string, token: string, ttlMinutes = 30) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const { error } = await db().from("join_tokens").insert([
    { token, order_id: orderId, expires_at: expiresAt },
  ]);
  if (error) throw new Error(error.message);
  return { token, expiresAt };
}

export async function getJoinToken(token: string): Promise<JoinTokenRow | null> {
  const { data, error } = await db()
    .from("join_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as JoinTokenRow | null;
}

export async function getActiveJoinTokenForOrder(orderId: string): Promise<string | null> {
  const { data, error } = await db()
    .from("join_tokens")
    .select("token")
    .eq("order_id", orderId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as { token: string } | null)?.token ?? null;
}

export async function hasPointsLedgerEntry(
  orderId: string,
  customerId: string,
  reason: string,
): Promise<boolean> {
  const { data, error } = await db()
    .from("points_ledger")
    .select("id")
    .eq("order_id", orderId)
    .eq("customer_id", customerId)
    .eq("reason", reason)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function getCustomerById(customerId: string): Promise<CustomerRow | null> {
  const { data, error } = await db()
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CustomerRow | null;
}

export async function markJoinTokenUsed(token: string) {
  const { error } = await db()
    .from("join_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null);

  if (error) throw new Error(error.message);
}

export async function getCustomerByPhone(
  merchantId: string,
  phone: string,
): Promise<CustomerRow | null> {
  const { data, error } = await db()
    .from("customers")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("phone", phone)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CustomerRow | null;
}

export async function createMemberCustomer(input: {
  merchantId: string;
  phone: string;
  externalUserId?: string | null;
}): Promise<CustomerRow> {
  const { data, error } = await db()
    .from("customers")
    .insert([
      {
        merchant_id: input.merchantId,
        phone: input.phone,
        external_user_id: input.externalUserId ?? null,
        is_member: true,
        points_balance: 0,
        first_join_bonus_awarded: false,
      },
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CustomerRow;
}

export async function updateCustomer(
  customerId: string,
  patch: Partial<
    Pick<
      CustomerRow,
      | "is_member"
      | "points_balance"
      | "lifetime_points_earned"
      | "first_join_bonus_awarded"
      | "external_user_id"
      | "display_name"
      | "last_visit_at"
      | "marketing_opt_out"
      | "favorite_item_name"
      | "usual_order"
      | "email"
      | "phone"
      | "receipt_delivery_preference"
    >
  >,
): Promise<CustomerRow> {
  const { data, error } = await db()
    .from("customers")
    .update(patch)
    .eq("id", customerId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CustomerRow;
}

export async function appendPointsLedger(input: {
  customerId: string;
  orderId: string | null;
  delta: number;
  reason: string;
}) {
  const { error: ledgerError } = await db().from("points_ledger").insert([
    {
      customer_id: input.customerId,
      order_id: input.orderId,
      delta: input.delta,
      reason: input.reason,
    },
  ]);
  if (ledgerError) throw new Error(ledgerError.message);
}

export async function linkOrderToCustomer(orderId: string, customerId: string) {
  const { error } = await db()
    .from("orders")
    .update({ customer_id: customerId })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function getRewardLevels(merchantId: string): Promise<RewardLevelRow[]> {
  const { data, error } = await db()
    .from("reward_levels")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("level_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as RewardLevelRow[];
}

export async function upsertRewardLevels(
  merchantId: string,
  levels: Array<{
    levelNumber: number;
    name: string;
    minLifetimePoints: number;
    pointsMultiplier: number;
    perkDescription: string | null;
    nameI18n?: Record<string, string>;
    perkDescriptionI18n?: Record<string, string>;
    discountPercent: number;
    tierActive?: boolean;
    pointExpiryDays?: number | null;
    birthdayPoints?: number;
    welcomePoints?: number;
    welcomeRewards?: number;
    renewPoints?: number;
    renewRewards?: number;
    validityMonths?: number | null;
  }>,
): Promise<RewardLevelRow[]> {
  for (const level of levels) {
    const { error } = await db()
      .from("reward_levels")
      .upsert(
        {
          merchant_id: merchantId,
          level_number: level.levelNumber,
          name: level.name,
          min_lifetime_points: level.minLifetimePoints,
          points_multiplier: level.pointsMultiplier,
          perk_description: level.perkDescription,
          name_i18n: level.nameI18n ?? { en: level.name },
          perk_description_i18n: level.perkDescriptionI18n ?? {
            en: level.perkDescription ?? "",
          },
          discount_percent: level.discountPercent,
          tier_active: level.tierActive ?? true,
          point_expiry_days: level.pointExpiryDays ?? null,
          birthday_points: level.birthdayPoints ?? 0,
          welcome_points: level.welcomePoints ?? 0,
          welcome_rewards: level.welcomeRewards ?? 0,
          renew_points: level.renewPoints ?? 0,
          renew_rewards: level.renewRewards ?? 0,
          validity_months: level.validityMonths ?? null,
        },
        { onConflict: "merchant_id,level_number" },
      );

    if (error) throw new Error(error.message);
  }

  return getRewardLevels(merchantId);
}

export async function awardPointsToCustomer(input: {
  customer: CustomerRow;
  orderId: string | null;
  points: number;
  reason: string;
}): Promise<CustomerRow> {
  const updated = await updateCustomer(input.customer.id, {
    points_balance: input.customer.points_balance + input.points,
    lifetime_points_earned: input.customer.lifetime_points_earned + input.points,
  });
  await appendPointsLedger({
    customerId: input.customer.id,
    orderId: input.orderId,
    delta: input.points,
    reason: input.reason,
  });
  return updated;
}

export async function touchCustomerVisit(
  customerId: string,
  input: {
    lastVisitAt: string;
    favoriteItemName?: string | null;
    usualOrder?: { name: string; quantity: number }[] | null;
  },
): Promise<CustomerRow> {
  return updateCustomer(customerId, {
    last_visit_at: input.lastVisitAt,
    ...(input.favoriteItemName !== undefined && {
      favorite_item_name: input.favoriteItemName,
    }),
    ...(input.usualOrder !== undefined && { usual_order: input.usualOrder }),
  });
}

export async function deductPointsFromCustomer(input: {
  customer: CustomerRow;
  orderId: string;
  points: number;
  reason: string;
}): Promise<CustomerRow> {
  if (input.points <= 0) return input.customer;
  if (input.customer.points_balance < input.points) {
    throw new Error("Insufficient points");
  }

  const updated = await updateCustomer(input.customer.id, {
    points_balance: input.customer.points_balance - input.points,
  });
  await appendPointsLedger({
    customerId: input.customer.id,
    orderId: input.orderId,
    delta: -input.points,
    reason: input.reason,
  });
  return updated;
}
