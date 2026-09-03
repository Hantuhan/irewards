export type SuggestType = "upsell" | "downsell";
export type UpsellRuleType = "always" | "min_cart" | "max_cart";
export type UpsellPromoMode = "regular" | "free" | "custom";

export type UpsellLinkConfig = {
  slug: string;
  suggestType: SuggestType;
  promoMode: UpsellPromoMode;
  promoPriceCents?: number;
  ruleType: UpsellRuleType;
  minCartCents?: number;
  maxCartCents?: number;
  priority: number;
};

export function defaultUpsellLink(slug: string): UpsellLinkConfig {
  return {
    slug,
    suggestType: "upsell",
    promoMode: "regular",
    ruleType: "always",
    priority: 10,
  };
}

export function promoPriceFromRow(promoPriceCents: number | null | undefined): {
  promoMode: UpsellPromoMode;
  promoPriceCents?: number;
} {
  if (promoPriceCents == null) return { promoMode: "regular" };
  if (promoPriceCents === 0) return { promoMode: "free", promoPriceCents: 0 };
  return { promoMode: "custom", promoPriceCents };
}

export function promoPriceToRow(config: UpsellLinkConfig): number | null {
  if (config.promoMode === "regular") return null;
  if (config.promoMode === "free") return 0;
  return config.promoPriceCents ?? 0;
}

export function upsellLinkFromRow(row: {
  slug: string;
  suggest_type?: string | null;
  promo_price_cents?: number | null;
  rule_type?: string | null;
  min_cart_cents?: number | null;
  max_cart_cents?: number | null;
  priority?: number | null;
}): UpsellLinkConfig {
  const promo = promoPriceFromRow(row.promo_price_cents);
  return {
    slug: row.slug,
    suggestType: row.suggest_type === "downsell" ? "downsell" : "upsell",
    promoMode: promo.promoMode,
    promoPriceCents: promo.promoPriceCents,
    ruleType:
      row.rule_type === "min_cart" || row.rule_type === "max_cart"
        ? row.rule_type
        : "always",
    minCartCents: row.min_cart_cents ?? undefined,
    maxCartCents: row.max_cart_cents ?? undefined,
    priority: row.priority ?? 10,
  };
}

export function matchesUpsellRule(link: UpsellLinkConfig, cartTotalCents: number): boolean {
  if (link.ruleType === "min_cart") {
    return cartTotalCents >= (link.minCartCents ?? 0);
  }
  if (link.ruleType === "max_cart") {
    return cartTotalCents <= (link.maxCartCents ?? Number.MAX_SAFE_INTEGER);
  }
  return true;
}

export function effectivePromoPriceCents(
  link: UpsellLinkConfig,
  regularPriceCents: number,
): number | null {
  if (link.promoMode === "regular") return null;
  if (link.promoMode === "free") return 0;
  return link.promoPriceCents ?? regularPriceCents;
}

export function formatPromoLabel(
  regularPriceCents: number,
  promoPriceCents: number | null,
  currencyCode = "RM",
): string {
  if (promoPriceCents == null) {
    return `${currencyCode} ${(regularPriceCents / 100).toFixed(2)}`;
  }
  if (promoPriceCents === 0) return "FREE";
  return `${currencyCode} ${(promoPriceCents / 100).toFixed(2)}`;
}

export function buildSuggestReason(
  link: UpsellLinkConfig,
  sourceName: string | null,
  regularPriceCents: number,
  currencyCode = "RM",
): string {
  const promo = effectivePromoPriceCents(link, regularPriceCents);
  const priceBit =
    promo === 0
      ? "Get it FREE"
      : promo != null
        ? `Now ${formatPromoLabel(regularPriceCents, promo, currencyCode)} (was ${formatPromoLabel(regularPriceCents, null, currencyCode)})`
        : null;

  if (link.suggestType === "downsell") {
    return priceBit ?? "A lighter add-on for your order";
  }
  if (sourceName) {
    return priceBit ? `${priceBit} · pairs with ${sourceName}` : `Pairs well with ${sourceName}`;
  }
  return priceBit ?? "Popular add-on before you pay";
}

/** Merge AI picks into existing selection: keep curated links, fill remaining slots. */
export function mergeMaxProfitLinks(
  existing: UpsellLinkConfig[],
  suggested: UpsellLinkConfig[],
  max: number,
): UpsellLinkConfig[] {
  const bySlug = new Map(existing.map((l) => [l.slug, l]));
  for (const link of suggested) {
    if (bySlug.size >= max) break;
    if (bySlug.has(link.slug)) continue;
    bySlug.set(link.slug, link);
  }
  return [...bySlug.values()].slice(0, max);
}

export function sortUpsellLinks(links: UpsellLinkConfig[]): UpsellLinkConfig[] {
  return [...links].sort((a, b) => b.priority - a.priority);
}
