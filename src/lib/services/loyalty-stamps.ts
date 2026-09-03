import { recordManualVoucherIssue } from "@/lib/db/automation-repository";
import {
  countPendingStampRewardHolds,
  createPromo,
  getOrderItemsForOrder,
  listCustomerActiveVouchers,
  type CustomerVoucherItem,
} from "@/lib/db/merchant-repository";
import { getMerchantById } from "@/lib/db/repository";
import {
  appendStampsLedger,
  ensureCustomerStampCard,
  getCustomerStampCard,
  getMenuItemCategoryMap,
  getMenuItemPriceCents,
  getStampProgram,
  hasStampsLedgerEntry,
  listQualifyingMenuItemSlugs,
  serializeStampProgram,
  stampsEarnedToday,
  updateCustomerStampCard,
} from "@/lib/db/stamps-repository";
import type { CustomerRow, CustomerStampCardRow, PromoRow } from "@/lib/db/types";
import {
  applyStampCaps,
  cardIsFull,
  normalizeCardSize,
  rawStampsFromOrderLines,
  stampRewardDiscountCents,
  stampRewardToPromoFields,
  stampVoucherCode,
  stampsTowardReward,
  type StampProgramConfig,
} from "@/lib/loyalty/stamps";

/** Merchant-local calendar midnight as UTC ISO (for daily stamp caps). */
function startOfDayIso(timeZone: string, at = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMs = asIfUtc - at.getTime();
  const localMidnightAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    0,
    0,
    0,
  );
  return new Date(localMidnightAsUtc - offsetMs).toISOString();
}

export type StampCartNudgeView = {
  /** Merchant toggle: show “Add X for +1 stamp?” on menu Pay bar. */
  enabled: boolean;
  /** Storefront item ids (slugs) that earn a stamp and can be suggested. */
  qualifyingItemSlugs: string[];
};

export type StampProgressView = {
  enabled: boolean;
  program: StampProgramConfig | null;
  stampsCollected: number;
  filled: number;
  size: number;
  remaining: number;
  readyToRedeem: boolean;
  pendingReward: boolean;
  cardsCompleted: number;
  rewardLabel: string | null;
  /** Latest unused stamp-card voucher (if any). */
  voucher: CustomerVoucherItem | null;
  cartNudge: StampCartNudgeView;
};

export type RedeemStampResult = {
  card: CustomerStampCardRow;
  voucher: PromoRow | null;
};

async function issueStampRewardPromo(input: {
  merchantId: string;
  customerId: string;
  program: StampProgramConfig;
}): Promise<PromoRow | null> {
  let rewardItemPriceCents: number | null = null;
  if (input.program.rewardMenuItemId) {
    rewardItemPriceCents = await getMenuItemPriceCents(
      input.merchantId,
      input.program.rewardMenuItemId,
    );
  }

  const fields = stampRewardToPromoFields({
    rewardType: input.program.rewardType,
    rewardLabel: input.program.rewardLabel,
    rewardPercent: input.program.rewardPercent,
    rewardCents: input.program.rewardCents,
    rewardItemPriceCents,
  });
  if (!fields) return null;

  const code = stampVoucherCode(fields.name);
  const promo = await createPromo(input.merchantId, {
    name: fields.name,
    code,
    type: fields.type,
    value: fields.value,
    minSpendCents: null,
    expiresAt: fields.expiresAt,
  });

  await recordManualVoucherIssue({
    merchantId: input.merchantId,
    customerId: input.customerId,
    promoId: promo.id,
    code: promo.code,
    promoName: promo.name,
    issuedBy: "stamp_card",
  });

  return promo;
}

/**
 * Convert a full stamp card into a personal promo voucher.
 * Falls back to pending_reward only when the reward cannot be expressed as a promo.
 */
export async function redeemStampCard(input: {
  customer: CustomerRow;
  merchantId: string;
}): Promise<RedeemStampResult> {
  if (!input.customer.is_member) {
    throw new Error("Only WhatsApp members can redeem stamps");
  }

  const merchant = await getMerchantById(input.merchantId);
  if (!merchant?.stamps_program_enabled) {
    throw new Error("Stamps are not enabled");
  }

  const programRow = await getStampProgram(input.merchantId);
  if (!programRow) throw new Error("Stamp program not configured");
  const program = serializeStampProgram(programRow);
  const size = normalizeCardSize(program.cardSize);

  const card = await ensureCustomerStampCard(input.merchantId, input.customer.id);

  // Legacy: pending checkout discount → convert to voucher when possible.
  if (card.pending_reward) {
    const voucher = await issueStampRewardPromo({
      merchantId: input.merchantId,
      customerId: input.customer.id,
      program,
    });
    if (voucher) {
      const updated = await updateCustomerStampCard(card.id, { pending_reward: false });
      return { card: updated, voucher };
    }
    throw new Error("You already have a stamp reward waiting — use it at checkout");
  }

  if (!cardIsFull(card.stamps_collected, size)) {
    throw new Error(`Need ${size} stamps to redeem`);
  }

  const voucher = await issueStampRewardPromo({
    merchantId: input.merchantId,
    customerId: input.customer.id,
    program,
  });

  const updated = await updateCustomerStampCard(card.id, {
    stamps_collected: card.stamps_collected - size,
    cards_completed: card.cards_completed + 1,
    // Only keep pending_reward if we could not create a voucher (e.g. free item with no price).
    pending_reward: !voucher,
  });

  await appendStampsLedger({
    merchantId: input.merchantId,
    customerId: input.customer.id,
    orderId: null,
    delta: -size,
    reason: "redeemed",
  });

  return { card: updated, voucher };
}

export async function getStampProgressForCustomer(
  merchantId: string,
  customerId: string | null,
): Promise<StampProgressView> {
  const merchant = await getMerchantById(merchantId);
  const enabled = Boolean(merchant?.stamps_program_enabled);
  const programRow = await getStampProgram(merchantId);
  const program = programRow ? serializeStampProgram(programRow) : null;

  const emptyNudge: StampCartNudgeView = { enabled: false, qualifyingItemSlugs: [] };

  if (!enabled || !program) {
    return {
      enabled: false,
      program: null,
      stampsCollected: 0,
      filled: 0,
      size: program?.cardSize ?? 6,
      remaining: program?.cardSize ?? 6,
      readyToRedeem: false,
      pendingReward: false,
      cardsCompleted: 0,
      rewardLabel: program?.rewardLabel ?? null,
      voucher: null,
      cartNudge: emptyNudge,
    };
  }

  const qualifyingItemSlugs = await listQualifyingMenuItemSlugs(merchantId, program);
  const cartNudge: StampCartNudgeView = {
    enabled: program.cartNudgeEnabled && qualifyingItemSlugs.length > 0,
    qualifyingItemSlugs,
  };

  let card: CustomerStampCardRow | null = null;
  let stampVoucher: CustomerVoucherItem | null = null;
  if (customerId) {
    card = await getCustomerStampCard(merchantId, customerId);

    const vouchers = await listCustomerActiveVouchers(
      merchantId,
      customerId,
      merchant?.currency ?? "MYR",
    );
    stampVoucher = vouchers.find((v) => v.source === "stamp_card") ?? null;

    // Auto-migrate legacy pending_reward → voucher once (skip if one already issued).
    if (card?.pending_reward && !stampVoucher) {
      try {
        const voucher = await issueStampRewardPromo({
          merchantId,
          customerId,
          program,
        });
        if (voucher) {
          card = await updateCustomerStampCard(card.id, { pending_reward: false });
          const refreshed = await listCustomerActiveVouchers(
            merchantId,
            customerId,
            merchant?.currency ?? "MYR",
          );
          stampVoucher = refreshed.find((v) => v.source === "stamp_card") ?? null;
        }
      } catch {
        // Keep pending_reward for checkout fallback.
      }
    }
  }

  const collected = card?.stamps_collected ?? 0;
  const toward = stampsTowardReward(collected, program.cardSize);

  return {
    enabled: true,
    program,
    stampsCollected: collected,
    filled: toward.filled,
    size: toward.size,
    remaining: toward.remaining,
    readyToRedeem: toward.readyToRedeem && !card?.pending_reward,
    pendingReward: Boolean(card?.pending_reward),
    cardsCompleted: card?.cards_completed ?? 0,
    rewardLabel: program.rewardLabel,
    voucher: stampVoucher,
    cartNudge,
  };
}

export async function awardOrderStampsIfEligible(input: {
  customer: CustomerRow;
  merchantId: string;
  orderId: string;
}): Promise<number> {
  if (!input.customer.is_member) return 0;

  const merchant = await getMerchantById(input.merchantId);
  if (!merchant?.stamps_program_enabled) return 0;

  const programRow = await getStampProgram(input.merchantId);
  if (!programRow) return 0;
  const program = serializeStampProgram(programRow);

  const already = await hasStampsLedgerEntry(
    input.orderId,
    input.customer.id,
    "order_paid",
  );
  if (already) return 0;

  const items = await getOrderItemsForOrder(input.orderId);
  const menuIds = items
    .map((i) => i.menu_item_id)
    .filter((id): id is string => Boolean(id));
  const categoryMap = await getMenuItemCategoryMap(input.merchantId, menuIds);

  const lines = items.map((i) => ({
    menuItemId: i.menu_item_id,
    categoryId: i.menu_item_id ? categoryMap.get(i.menu_item_id) ?? null : null,
    quantity: i.quantity,
  }));

  const raw = rawStampsFromOrderLines(lines, program);
  if (raw <= 0) return 0;

  const card = await ensureCustomerStampCard(input.merchantId, input.customer.id);
  const size = normalizeCardSize(program.cardSize);

  // Cap at full card until diner redeems / auto-converts (traditional punch card).
  const roomOnCard = Math.max(0, size - card.stamps_collected);

  const timeZone = merchant.timezone?.trim() || "Asia/Kuala_Lumpur";
  const earnedToday = await stampsEarnedToday(
    input.merchantId,
    input.customer.id,
    startOfDayIso(timeZone),
  );

  const stamps = applyStampCaps({
    rawStamps: raw,
    maxPerOrder: program.maxStampsPerOrder,
    maxPerDay: program.maxStampsPerDay,
    alreadyEarnedToday: earnedToday,
    roomOnCard,
  });

  if (stamps <= 0) return 0;

  const updated = await updateCustomerStampCard(card.id, {
    stamps_collected: card.stamps_collected + stamps,
  });
  await appendStampsLedger({
    merchantId: input.merchantId,
    customerId: input.customer.id,
    orderId: input.orderId,
    delta: stamps,
    reason: "order_paid",
  });

  // Full card → personal voucher automatically.
  if (cardIsFull(updated.stamps_collected, size) && !updated.pending_reward) {
    try {
      await redeemStampCard({
        customer: input.customer,
        merchantId: input.merchantId,
      });
    } catch {
      // Stamps stay on the card; member can claim via redeem endpoint.
    }
  }

  return stamps;
}

export async function staffAdjustStamps(input: {
  customer: CustomerRow;
  merchantId: string;
  delta: number;
  reason?: string;
}): Promise<CustomerStampCardRow> {
  if (!input.customer.is_member) {
    throw new Error("Customer must be a WhatsApp member");
  }
  const delta = Math.trunc(input.delta);
  if (delta === 0) throw new Error("Delta cannot be zero");
  if (Math.abs(delta) > 20) throw new Error("Delta too large");

  const card = await ensureCustomerStampCard(input.merchantId, input.customer.id);
  const next = Math.max(0, card.stamps_collected + delta);
  const updated = await updateCustomerStampCard(card.id, {
    stamps_collected: next,
  });

  await appendStampsLedger({
    merchantId: input.merchantId,
    customerId: input.customer.id,
    orderId: null,
    delta,
    reason: delta > 0 ? "staff_add" : "staff_void",
  });

  // Staff fill → same auto voucher conversion.
  if (delta > 0) {
    const programRow = await getStampProgram(input.merchantId);
    if (programRow) {
      const size = normalizeCardSize(programRow.card_size);
      if (cardIsFull(updated.stamps_collected, size) && !updated.pending_reward) {
        try {
          const result = await redeemStampCard({
            customer: input.customer,
            merchantId: input.merchantId,
          });
          return result.card;
        } catch {
          return updated;
        }
      }
    }
  }

  return updated;
}

/** @deprecated Prefer stamp vouchers; kept for cards that could not issue a promo. */
/**
 * What the member's stamp reward is worth on this order — without spending it.
 *
 * Checkout only quotes the discount; the reward is not consumed until the
 * order is actually paid (see `consumeStampRewardForPaidOrder`). Abandoning
 * the payment screen used to burn the reward outright.
 */
export async function previewPendingStampRewardDiscount(input: {
  customer: CustomerRow;
  merchantId: string;
  subtotalCents: number;
}): Promise<{ discountCents: number; label: string | null }> {
  const merchant = await getMerchantById(input.merchantId);
  if (!merchant?.stamps_program_enabled) {
    return { discountCents: 0, label: null };
  }

  const programRow = await getStampProgram(input.merchantId);
  if (!programRow) return { discountCents: 0, label: null };
  const program = serializeStampProgram(programRow);

  const card = await getCustomerStampCard(input.merchantId, input.customer.id);
  if (!card?.pending_reward) return { discountCents: 0, label: null };

  // Another unpaid order already holds this reward — one reward, one order.
  const held = await countPendingStampRewardHolds(input.customer.id);
  if (held > 0) return { discountCents: 0, label: null };

  let rewardItemPriceCents: number | null = null;
  if (program.rewardMenuItemId) {
    rewardItemPriceCents = await getMenuItemPriceCents(
      input.merchantId,
      program.rewardMenuItemId,
    );
  }

  const discountCents = stampRewardDiscountCents({
    rewardType: program.rewardType,
    rewardPercent: program.rewardPercent,
    rewardCents: program.rewardCents,
    rewardItemPriceCents,
    subtotalCents: input.subtotalCents,
  });

  if (discountCents <= 0) {
    return { discountCents: 0, label: null };
  }

  return { discountCents, label: program.rewardLabel };
}

/**
 * Spends the stamp reward an order was quoted with. Called once payment is
 * confirmed. Safe to call twice — the card's `pending_reward` flag is the
 * guard, so a replayed payment webhook is a no-op.
 */
export async function consumeStampRewardForPaidOrder(input: {
  merchantId: string;
  customerId: string;
  orderId: string;
}): Promise<boolean> {
  const card = await getCustomerStampCard(input.merchantId, input.customerId);
  if (!card?.pending_reward) return false;

  await updateCustomerStampCard(card.id, { pending_reward: false });
  await appendStampsLedger({
    merchantId: input.merchantId,
    customerId: input.customerId,
    orderId: input.orderId,
    delta: 0,
    reason: "reward_applied",
  });
  return true;
}
