/** Stamp card earn / redeem rules (pure). */

export const STAMP_SIZE_PRESETS = [3, 6, 9, 12] as const;

export type StampRewardType = "free_item" | "percent_off" | "fixed_off";

export type StampProgramConfig = {
  cardSize: number;
  rewardType: StampRewardType;
  rewardLabel: string;
  rewardMenuItemId: string | null;
  rewardPercent: number | null;
  rewardCents: number | null;
  qualifyingMenuItemIds: string[];
  qualifyingCategoryIds: string[];
  maxStampsPerOrder: number | null;
  maxStampsPerDay: number | null;
  /** Storefront Pay bar: “Add X for +1 stamp?” using qualifying items. */
  cartNudgeEnabled: boolean;
};

export type OrderLineForStamps = {
  menuItemId: string | null;
  categoryId: string | null;
  quantity: number;
};

export function normalizeCardSize(size: number): number {
  const n = Math.floor(size);
  if (!Number.isFinite(n)) return 6;
  return Math.min(20, Math.max(2, n));
}

export function isQualifyingLine(
  line: OrderLineForStamps,
  program: Pick<StampProgramConfig, "qualifyingMenuItemIds" | "qualifyingCategoryIds">,
): boolean {
  const itemIds = program.qualifyingMenuItemIds;
  const categoryIds = program.qualifyingCategoryIds;
  if (itemIds.length === 0 && categoryIds.length === 0) return false;

  if (line.menuItemId && itemIds.includes(line.menuItemId)) return true;
  if (line.categoryId && categoryIds.includes(line.categoryId)) return true;
  return false;
}

/** Raw stamps from qualifying line quantities (before caps). */
export function rawStampsFromOrderLines(
  lines: OrderLineForStamps[],
  program: Pick<StampProgramConfig, "qualifyingMenuItemIds" | "qualifyingCategoryIds">,
): number {
  let total = 0;
  for (const line of lines) {
    if (!isQualifyingLine(line, program)) continue;
    total += Math.max(0, Math.floor(line.quantity));
  }
  return total;
}

export function applyStampCaps(input: {
  rawStamps: number;
  maxPerOrder: number | null;
  maxPerDay: number | null;
  alreadyEarnedToday: number;
  /** Room left on current card before Redeem (cardSize - collected). Null = no card cap. */
  roomOnCard: number | null;
}): number {
  let stamps = Math.max(0, Math.floor(input.rawStamps));
  if (stamps === 0) return 0;

  if (input.maxPerOrder != null && input.maxPerOrder > 0) {
    stamps = Math.min(stamps, input.maxPerOrder);
  }

  if (input.maxPerDay != null && input.maxPerDay > 0) {
    const remainingToday = Math.max(0, input.maxPerDay - input.alreadyEarnedToday);
    stamps = Math.min(stamps, remainingToday);
  }

  if (input.roomOnCard != null) {
    stamps = Math.min(stamps, Math.max(0, input.roomOnCard));
  }

  return stamps;
}

export function cardIsFull(stampsCollected: number, cardSize: number): boolean {
  return stampsCollected >= normalizeCardSize(cardSize);
}

export function stampsTowardReward(stampsCollected: number, cardSize: number): {
  filled: number;
  size: number;
  remaining: number;
  readyToRedeem: boolean;
} {
  const size = normalizeCardSize(cardSize);
  const filled = Math.min(Math.max(0, stampsCollected), size);
  return {
    filled,
    size,
    remaining: Math.max(0, size - filled),
    readyToRedeem: stampsCollected >= size,
  };
}

/** Discount cents for a pending stamp reward against this order subtotal. */
export function stampRewardDiscountCents(input: {
  rewardType: StampRewardType;
  rewardPercent: number | null;
  rewardCents: number | null;
  rewardItemPriceCents: number | null;
  subtotalCents: number;
}): number {
  const subtotal = Math.max(0, input.subtotalCents);
  if (subtotal <= 0) return 0;

  if (input.rewardType === "percent_off") {
    const pct = Number(input.rewardPercent ?? 0);
    if (pct <= 0) return 0;
    return Math.min(subtotal, Math.floor((subtotal * pct) / 100));
  }

  if (input.rewardType === "fixed_off") {
    const cents = Math.max(0, Math.floor(input.rewardCents ?? 0));
    return Math.min(subtotal, cents);
  }

  // free_item: use item price, else rewardCents fallback
  const itemPrice = input.rewardItemPriceCents ?? input.rewardCents ?? 0;
  return Math.min(subtotal, Math.max(0, Math.floor(itemPrice)));
}

/** Map stamp program reward → promo fields (fixed value is currency units, not cents). */
export function stampRewardToPromoFields(input: {
  rewardType: StampRewardType;
  rewardLabel: string;
  rewardPercent: number | null;
  rewardCents: number | null;
  rewardItemPriceCents: number | null;
  expiryDays?: number;
}): {
  name: string;
  type: "percentage" | "fixed";
  value: number;
  expiresAt: string;
} | null {
  const name = input.rewardLabel.trim() || "Stamp reward";
  const expiryDays = Math.max(1, Math.min(365, input.expiryDays ?? 30));
  const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();

  if (input.rewardType === "percent_off") {
    const pct = Math.min(100, Math.max(0, Number(input.rewardPercent ?? 0)));
    if (pct <= 0) return null;
    return { name, type: "percentage", value: pct, expiresAt };
  }

  const cents =
    input.rewardType === "fixed_off"
      ? Math.max(0, Math.floor(input.rewardCents ?? 0))
      : Math.max(
          0,
          Math.floor(input.rewardItemPriceCents ?? input.rewardCents ?? 0),
        );
  if (cents <= 0) return null;
  return { name, type: "fixed", value: cents / 100, expiresAt };
}

export function stampVoucherCode(rewardLabel: string): string {
  const base =
    rewardLabel.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase().slice(0, 6) || "STAMP";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}
