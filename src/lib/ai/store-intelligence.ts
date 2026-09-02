import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
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
  source: "deepseek" | "rules";
  regularPriceCents?: number;
  promoPriceCents?: number | null;
};

export type StoreSuggestBundle = {
  productSuggestions: StoreSuggestResult[];
  globalSuggestions: StoreSuggestResult[];
};

function cartTotalCents(input: StoreSuggestInput): number {
  if (input.cartTotalCents != null) return input.cartTotalCents;
  const inCart = new Set(input.cartItemIds);
  return input.menuItems
    .filter((item) => inCart.has(item.id))
    .reduce((sum, item) => sum + item.priceCents, 0);
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

function merchantUpsellSuggests(input: StoreSuggestInput): StoreSuggestResult[] {
  const inCart = new Set(input.cartItemIds);
  const results: StoreSuggestResult[] = [];
  const seen = new Set<string>();
  const total = cartTotalCents(input);

  for (const cartId of input.cartItemIds) {
    const cartItem = input.menuItems.find((item) => item.id === cartId);
    if (!cartItem) continue;

    const links = sortUpsellLinks(linksForItem(cartItem)).filter((link) =>
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

  const links = sortUpsellLinks(globalLinks(input)).filter((link) =>
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

function merchantUpsellSuggest(input: StoreSuggestInput): StoreSuggestResult | null {
  return merchantUpsellSuggests(input)[0] ?? null;
}

function ruleBasedSuggest(input: StoreSuggestInput): StoreSuggestResult {
  const inCart = new Set(input.cartItemIds);
  const available = input.menuItems.filter((i) => !inCart.has(i.id));
  if (available.length === 0) {
    return {
      itemId: null,
      name: null,
      reason: "",
      suggestType: "upsell",
      source: "rules",
    };
  }

  const total = cartTotalCents(input);

  if (total > 4500) {
    const lighter = available.find((i) => i.priceCents < 1500 && i.tags.includes("drink"));
    if (lighter) {
      return {
        itemId: lighter.id,
        name: lighter.name,
        reason: "Pair your meal with something light",
        suggestType: "downsell",
        source: "rules",
        regularPriceCents: lighter.priceCents,
        promoPriceCents: null,
      };
    }
  }

  const addon = available.find((i) => i.tags.includes("dessert") || i.tags.includes("side"));
  const pick = addon ?? available[0];
  return {
    itemId: pick.id,
    name: pick.name,
    reason: "Popular add-on with orders like yours",
    suggestType: "upsell",
    source: "rules",
    regularPriceCents: pick.priceCents,
    promoPriceCents: null,
  };
}

export async function suggestStoreBundles(input: StoreSuggestInput): Promise<StoreSuggestBundle> {
  const productSuggestions = merchantUpsellSuggests(input);
  const usedIds = new Set(
    productSuggestions.map((s) => s.itemId).filter((id): id is string => Boolean(id)),
  );
  const globalSuggestions = globalUpsellSuggests(input, usedIds);

  if (productSuggestions.length > 0 || globalSuggestions.length > 0) {
    return { productSuggestions, globalSuggestions };
  }

  const fallback = await suggestStoreItem(input);
  if (fallback.itemId) {
    return { productSuggestions: [fallback], globalSuggestions: [] };
  }

  return { productSuggestions: [], globalSuggestions: [] };
}

/** @deprecated Use suggestStoreBundles */
export async function suggestStoreItems(input: StoreSuggestInput): Promise<StoreSuggestResult[]> {
  const bundle = await suggestStoreBundles(input);
  return [...bundle.productSuggestions, ...bundle.globalSuggestions];
}

export async function suggestStoreItem(input: StoreSuggestInput): Promise<StoreSuggestResult> {
  const configured = merchantUpsellSuggest(input);
  if (configured) return configured;

  const fallback = ruleBasedSuggest(input);
  if (!isDeepseekConfigured() || input.cartItemIds.length === 0) return fallback;

  const cartNames = input.menuItems
    .filter((i) => input.cartItemIds.includes(i.id))
    .map((i) => i.name);
  const menuSummary = input.menuItems
    .slice(0, 40)
    .map(
      (i) =>
        `${i.id}|${i.name}|${input.currency}${(i.priceCents / 100).toFixed(2)}|${i.tags.join(",")}|upsells:${linksForItem(i).map((l) => l.slug).join(",")}`,
    )
    .join("\n");

  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `You are store intelligence for a cafe QR ordering app in MY/SG.
Pick ONE menu item id NOT already in cart. Prefer merchant-configured upsell links when present.
Otherwise prefer upsell (add-on, dessert, drink) unless cart is already large (>RM45) then downsell to lighter item.
Return JSON only: { "itemId", "reason", "suggestType": "upsell"|"downsell" }`,
      },
      {
        role: "user",
        content: `Merchant: ${input.merchantName}
Cart: ${cartNames.join(", ") || "(empty)"}
Member tier: ${input.memberTier ?? "guest"}
Usual: ${input.usualOrder?.map((u) => u.name).join(", ") ?? "none"}
Hour: ${input.hour ?? new Date().getHours()}
Menu (id|name|price|tags):
${menuSummary}`,
      },
    ],
    { json: true, temperature: 0.4 },
  );

  const parsed = parseJsonFromModel<{
    itemId: string;
    reason: string;
    suggestType: "upsell" | "downsell";
  }>(content ?? "");

  if (!parsed?.itemId || inCartHas(parsed.itemId, input)) return fallback;

  const item = input.menuItems.find((i) => i.id === parsed.itemId);
  if (!item) return fallback;

  return {
    itemId: item.id,
    name: item.name,
    reason: parsed.reason || fallback.reason,
    suggestType: parsed.suggestType === "downsell" ? "downsell" : "upsell",
    source: "deepseek",
    regularPriceCents: item.priceCents,
    promoPriceCents: null,
  };
}

function inCartHas(itemId: string, input: StoreSuggestInput): boolean {
  return input.cartItemIds.includes(itemId);
}
