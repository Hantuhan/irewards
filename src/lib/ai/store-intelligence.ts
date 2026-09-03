import {
  buildSuggestReason,
  effectivePromoPriceCents,
  matchesUpsellRule,
  sortUpsellLinks,
  type UpsellLinkConfig,
} from "@/lib/menu/upsell-rules";

export type MenuItemContext = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  tags: string[];
  upsellLinks?: UpsellLinkConfig[];
  /** @deprecated Use upsellLinks */
  upsellItemIds?: string[];
};

export type StoreSuggestInput = {
  merchantName: string;
  currency: string;
  cartItemIds: string[];
  cartTotalCents?: number;
  menuItems: MenuItemContext[];
  globalUpsellLinks?: UpsellLinkConfig[];
  /** @deprecated Use globalUpsellLinks */
  globalUpsellItemIds?: string[];
  memberTier?: string | null;
  usualOrder?: { name: string }[];
  hour?: number;
};

export type StoreSuggestResult = {
  itemId: string | null;
  name: string | null;
  reason: string;
  suggestType: "upsell" | "downsell";
  source: "rules";
  regularPriceCents?: number;
  promoPriceCents?: number | null;
};

export type StoreSuggestBundle = {
  productSuggestions: StoreSuggestResult[];
  globalSuggestions: StoreSuggestResult[];
};

/** Cart at/above this → light adds only / suppress if meal complete. */
export const CART_LARGE_CENTS = 4500; // RM / SGD 45.00
/** Prefer drinks/sides under this when downselling. */
export const LIGHT_ITEM_MAX_CENTS = 1500; // 15.00
/** Cap suggestions (industry: 1–3 prompts; more raises abandonment). */
export const MAX_PRODUCT_SUGGESTIONS = 2;
export const MAX_GLOBAL_SUGGESTIONS = 3;

/** Keep diner-facing copy short; drop accidental debug / long reasons. */
const INTERNAL_REASON =
  /cart is not|cart is already|no upsell|upsell links|suggesting a|configured|threshold|prefer upsell|prefer downsell|downsell to|because the|since the|therefore|however,|RM\s?\d|SGD\s?\d|member tier|usual:|hour:|menu \(id|itemId|json only|chain.of.thought|debug/i;

export function dinerFacingSuggestReason(
  reason: string | null | undefined,
  fallback: string,
  maxLen = 60,
): string {
  const trimmed = (reason ?? "").trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return fallback;
  if (INTERNAL_REASON.test(trimmed) || trimmed.length > maxLen) return fallback;
  if ((trimmed.match(/[.!?]/g) ?? []).length > 1) return fallback;
  return trimmed;
}

export function defaultSuggestReason(suggestType: "upsell" | "downsell"): string {
  return suggestType === "downsell"
    ? "A lighter add-on for your order"
    : "Popular pick that pairs with your cart";
}

/** Product description first; sanitized tagline only as fallback. */
export function dinerFacingSuggestBlurb(input: {
  description?: string | null;
  reason?: string | null;
  suggestType?: "upsell" | "downsell";
}): string {
  const description = input.description?.trim();
  if (description) return description;
  const suggestType = input.suggestType === "downsell" ? "downsell" : "upsell";
  return dinerFacingSuggestReason(input.reason, defaultSuggestReason(suggestType));
}

function sanitizeSuggestion(suggestion: StoreSuggestResult): StoreSuggestResult {
  const suggestType = suggestion.suggestType === "downsell" ? "downsell" : "upsell";
  return {
    ...suggestion,
    source: "rules",
    reason: dinerFacingSuggestReason(suggestion.reason, defaultSuggestReason(suggestType)),
  };
}

export function sanitizeSuggestBundle(bundle: StoreSuggestBundle): StoreSuggestBundle {
  return {
    productSuggestions: bundle.productSuggestions.map(sanitizeSuggestion),
    globalSuggestions: bundle.globalSuggestions.map(sanitizeSuggestion),
  };
}

function cartTotalCents(input: StoreSuggestInput): number {
  if (input.cartTotalCents != null) return input.cartTotalCents;
  const inCart = new Set(input.cartItemIds);
  return input.menuItems
    .filter((item) => inCart.has(item.id))
    .reduce((sum, item) => sum + item.priceCents, 0);
}

/** Below threshold → upsell; at/above → downsell (for configured link preference). */
export function preferredSuggestType(cartTotalCents: number): "upsell" | "downsell" {
  return cartTotalCents >= CART_LARGE_CENTS ? "downsell" : "upsell";
}

function linksForItem(item: MenuItemContext): UpsellLinkConfig[] {
  if (item.upsellLinks?.length) return item.upsellLinks;
  return (item.upsellItemIds ?? []).map((slug) => ({
    slug,
    suggestType: "upsell" as const,
    promoMode: "regular" as const,
    ruleType: "always" as const,
    priority: 10,
  }));
}

function globalLinks(input: StoreSuggestInput): UpsellLinkConfig[] {
  if (input.globalUpsellLinks?.length) return input.globalUpsellLinks;
  return (input.globalUpsellItemIds ?? []).map((slug) => ({
    slug,
    suggestType: "upsell" as const,
    promoMode: "regular" as const,
    ruleType: "always" as const,
    priority: 10,
  }));
}

function linkToSuggestion(
  link: UpsellLinkConfig,
  pick: MenuItemContext,
  sourceName: string | null,
  currency: string,
): StoreSuggestResult {
  const promo = effectivePromoPriceCents(link, pick.priceCents);
  return {
    itemId: pick.id,
    name: pick.name,
    reason: buildSuggestReason(link, sourceName, pick.priceCents, currency),
    suggestType: link.suggestType,
    source: "rules",
    regularPriceCents: pick.priceCents,
    promoPriceCents: promo,
  };
}

function sortLinksForCart(links: UpsellLinkConfig[], total: number): UpsellLinkConfig[] {
  const prefer = preferredSuggestType(total);
  return sortUpsellLinks(links).sort((a, b) => {
    const aMatch = a.suggestType === prefer ? 1 : 0;
    const bMatch = b.suggestType === prefer ? 1 : 0;
    return bMatch - aMatch;
  });
}

function merchantUpsellSuggests(input: StoreSuggestInput): StoreSuggestResult[] {
  const inCart = new Set(input.cartItemIds);
  const results: StoreSuggestResult[] = [];
  const seen = new Set<string>();
  const total = cartTotalCents(input);

  for (const cartId of input.cartItemIds) {
    const cartItem = input.menuItems.find((item) => item.id === cartId);
    if (!cartItem) continue;

    const links = sortLinksForCart(linksForItem(cartItem), total).filter((link) =>
      matchesUpsellRule(link, total),
    );

    for (const link of links) {
      const upsellId = link.slug;
      if (inCart.has(upsellId) || seen.has(upsellId)) continue;
      const pick = input.menuItems.find((item) => item.id === upsellId);
      if (!pick) continue;
      seen.add(upsellId);
      results.push(linkToSuggestion(link, pick, cartItem.name, input.currency));
    }
  }

  return results;
}

function globalUpsellSuggests(
  input: StoreSuggestInput,
  excludeIds: Set<string>,
): StoreSuggestResult[] {
  const inCart = new Set(input.cartItemIds);
  const results: StoreSuggestResult[] = [];
  const total = cartTotalCents(input);

  const links = sortLinksForCart(globalLinks(input), total).filter((link) =>
    matchesUpsellRule(link, total),
  );

  for (const link of links) {
    const upsellId = link.slug;
    if (inCart.has(upsellId) || excludeIds.has(upsellId)) continue;
    const pick = input.menuItems.find((item) => item.id === upsellId);
    if (!pick) continue;
    excludeIds.add(upsellId);
    results.push(linkToSuggestion(link, pick, null, input.currency));
  }

  return results;
}

type CartCourse = "drink" | "food" | "dessert";

function itemCourses(item: MenuItemContext): Set<CartCourse> {
  const tags = new Set(item.tags.map((t) => t.toLowerCase()));
  const name = item.name.toLowerCase();
  const courses = new Set<CartCourse>();

  const drinkish =
    tags.has("drink") ||
    tags.has("coffee") ||
    tags.has("tea") ||
    tags.has("beverage") ||
    /\b(latte|espresso|americano|cappuccino|matcha|mocha|tea|juice|soda)\b/.test(name);
  const pastryish =
    tags.has("pastry") || /\b(croissant|pain au|bagel|muffin|toast)\b/.test(name);
  const dessertish =
    tags.has("dessert") ||
    tags.has("sweet") ||
    /\b(cake|cookie|brownie|tart|pie)\b/.test(name);
  const foodish =
    tags.has("food") ||
    tags.has("sandwich") ||
    tags.has("meal") ||
    tags.has("bakery") ||
    tags.has("side") ||
    tags.has("salad") ||
    /\b(sandwich|salad|bowl|wrap|club)\b/.test(name);

  if (drinkish) courses.add("drink");
  if (pastryish || (foodish && !drinkish)) courses.add("food");
  if (dessertish && !pastryish) courses.add("dessert");
  if (courses.size === 0) {
    if (item.priceCents <= LIGHT_ITEM_MAX_CENTS) courses.add("drink");
    else courses.add("food");
  }
  return courses;
}

function cartCourses(input: StoreSuggestInput): Set<CartCourse> {
  const covered = new Set<CartCourse>();
  for (const id of input.cartItemIds) {
    const item = input.menuItems.find((i) => i.id === id);
    if (!item) continue;
    for (const c of itemCourses(item)) covered.add(c);
  }
  return covered;
}

function pickFromAvailable(
  available: MenuItemContext[],
  predicate: (item: MenuItemContext) => boolean,
  preferCheaper: boolean,
): MenuItemContext | null {
  const matched = available.filter(predicate);
  if (matched.length === 0) return null;
  matched.sort((a, b) =>
    preferCheaper ? a.priceCents - b.priceCents : b.priceCents - a.priceCents,
  );
  return matched[0] ?? null;
}

function toResult(
  pick: MenuItemContext,
  suggestType: "upsell" | "downsell",
  reason: string,
): StoreSuggestResult {
  return {
    itemId: pick.id,
    name: pick.name,
    reason,
    suggestType,
    source: "rules",
    regularPriceCents: pick.priceCents,
    promoPriceCents: null,
  };
}

function isLightItem(item: MenuItemContext): boolean {
  return (
    item.priceCents <= LIGHT_ITEM_MAX_CENTS &&
    (itemCourses(item).has("drink") ||
      item.tags.includes("side") ||
      item.tags.includes("dessert") ||
      item.tags.length === 0)
  );
}

/**
 * Industry default when merchant has no configured links:
 * fill missing courses first; large carts only get light adds (or nothing if complete).
 * @see docs/STOREFRONT_UPSELL_STRATEGY.md
 */
function ruleBasedSuggest(input: StoreSuggestInput): StoreSuggestResult {
  const empty: StoreSuggestResult = {
    itemId: null,
    name: null,
    reason: "",
    suggestType: "upsell",
    source: "rules",
  };

  const inCart = new Set(input.cartItemIds);
  const available = input.menuItems.filter((i) => !inCart.has(i.id));
  if (available.length === 0) return empty;

  const total = cartTotalCents(input);
  const covered = cartCourses(input);
  const large = total >= CART_LARGE_CENTS;
  const complete = covered.has("drink") && covered.has("food");

  // High cart + already a full meal → don't push.
  if (large && complete) return empty;

  // Gap 1: no drink → drink (highest attach in cafe / QSR).
  if (!covered.has("drink")) {
    const drink = pickFromAvailable(
      available,
      (i) => itemCourses(i).has("drink"),
      large,
    );
    if (drink) {
      return toResult(
        drink,
        large ? "downsell" : "upsell",
        "Add a drink to complete your order",
      );
    }
  }

  // Gap 2: drink but no food/pastry.
  if (covered.has("drink") && !covered.has("food")) {
    const food = pickFromAvailable(available, (i) => itemCourses(i).has("food"), false);
    if (food) {
      return toResult(food, "upsell", "Pair it with something to eat");
    }
  }

  // Gap 3: dessert/side when not already covered (skip if large + complete).
  if (!covered.has("dessert") && !complete) {
    const dessert = pickFromAvailable(
      available,
      (i) => itemCourses(i).has("dessert") || i.tags.includes("side"),
      true,
    );
    if (dessert) {
      return toResult(
        dessert,
        large ? "downsell" : "upsell",
        large ? defaultSuggestReason("downsell") : "Something sweet before you pay",
      );
    }
  }

  if (large) {
    const light = pickFromAvailable(available, isLightItem, true);
    if (light) return toResult(light, "downsell", defaultSuggestReason("downsell"));
    return empty;
  }

  const addon =
    pickFromAvailable(
      available,
      (i) =>
        i.tags.includes("dessert") ||
        i.tags.includes("side") ||
        itemCourses(i).has("food"),
      false,
    ) ?? [...available].sort((a, b) => b.priceCents - a.priceCents)[0];

  return toResult(addon, "upsell", defaultSuggestReason("upsell"));
}

/**
 * Suggest order (rules only — no AI):
 * 1) Merchant product upsell links
 * 2) Global upsell links
 * 3) Gap-fill / cart-tier defaults
 */
export async function suggestStoreBundles(input: StoreSuggestInput): Promise<StoreSuggestBundle> {
  const productSuggestions = merchantUpsellSuggests(input).slice(0, MAX_PRODUCT_SUGGESTIONS);
  const usedIds = new Set(
    productSuggestions.map((s) => s.itemId).filter((id): id is string => Boolean(id)),
  );
  const globalSuggestions = globalUpsellSuggests(input, usedIds).slice(0, MAX_GLOBAL_SUGGESTIONS);

  if (productSuggestions.length > 0 || globalSuggestions.length > 0) {
    return sanitizeSuggestBundle({ productSuggestions, globalSuggestions });
  }

  if (input.cartItemIds.length === 0) {
    return { productSuggestions: [], globalSuggestions: [] };
  }

  const fallback = ruleBasedSuggest(input);
  if (!fallback.itemId) {
    return { productSuggestions: [], globalSuggestions: [] };
  }

  return sanitizeSuggestBundle({
    productSuggestions: [fallback],
    globalSuggestions: [],
  });
}

/** @deprecated Use suggestStoreBundles */
export async function suggestStoreItems(input: StoreSuggestInput): Promise<StoreSuggestResult[]> {
  const bundle = await suggestStoreBundles(input);
  return [...bundle.productSuggestions, ...bundle.globalSuggestions];
}

export async function suggestStoreItem(input: StoreSuggestInput): Promise<StoreSuggestResult> {
  const bundle = await suggestStoreBundles(input);
  return (
    bundle.productSuggestions[0] ??
    bundle.globalSuggestions[0] ?? {
      itemId: null,
      name: null,
      reason: "",
      suggestType: "upsell",
      source: "rules",
    }
  );
}
