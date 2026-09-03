import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
import { CART_LARGE_CENTS, LIGHT_ITEM_MAX_CENTS } from "@/lib/ai/store-intelligence";
import { POPULAR_CAFE_PRODUCT_KEYS } from "@/lib/menu/cafe-product-presets";
import type { UpsellLinkConfig } from "@/lib/menu/upsell-rules";

export type MaxProfitCandidate = {
  slug: string;
  name: string;
  categoryLabel?: string;
  categorySlug?: string;
  priceCents?: number;
  tags?: string[];
  specialTags?: string[];
};

export type MaxProfitContext = {
  name?: string;
  categoryLabel?: string;
  categorySlug?: string;
  priceCents?: number;
  tags?: string[];
};

export type MaxProfitSuggestion = {
  slug: string;
  suggestType: "upsell" | "downsell";
  priority: number;
};

export type MaxProfitResult = {
  suggestions: MaxProfitSuggestion[];
  rationale: string;
  source: "ai" | "local";
};

type Course = "drink" | "food" | "dessert" | "side";

function textOf(item: { name: string; categoryLabel?: string; categorySlug?: string; tags?: string[] }) {
  return `${item.name} ${item.categoryLabel ?? ""} ${item.categorySlug ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase();
}

function coursesOf(item: MaxProfitCandidate | MaxProfitContext): Set<Course> {
  const text = textOf({
    name: item.name ?? "",
    categoryLabel: item.categoryLabel,
    categorySlug: item.categorySlug,
    tags: item.tags,
  });
  const out = new Set<Course>();
  if (
    /\b(coffee|kopi|tea|teh|latte|espresso|americano|cappuccino|matcha|juice|drink|beverage|soda|milk)\b/.test(
      text,
    )
  ) {
    out.add("drink");
  }
  if (/\b(dessert|cake|brownie|waffle|cookie|tart|ice\s*cream|sweet)\b/.test(text)) {
    out.add("dessert");
  }
  if (/\b(side|fries|extra|add[\s-]?on|egg|toast)\b/.test(text)) {
    out.add("side");
  }
  if (
    /\b(pastr|croissant|sandwich|brunch|main|salad|bowl|wrap|rice|noodle|food|meal|bakery)\b/.test(
      text,
    )
  ) {
    out.add("food");
  }
  if (out.size === 0) {
    const price = item.priceCents ?? 0;
    if (price > 0 && price <= LIGHT_ITEM_MAX_CENTS) out.add("side");
    else out.add("food");
  }
  return out;
}

function isPopularSlug(slug: string, categorySlug?: string): boolean {
  if (categorySlug && POPULAR_CAFE_PRODUCT_KEYS.has(`${categorySlug}:${slug}`)) return true;
  for (const key of POPULAR_CAFE_PRODUCT_KEYS) {
    if (key.endsWith(`:${slug}`)) return true;
  }
  return false;
}

function isBestSeller(item: MaxProfitCandidate): boolean {
  const tags = new Set((item.specialTags ?? []).map((t) => t.toLowerCase()));
  return tags.has("best_selling") || tags.has("bestseller") || isPopularSlug(item.slug, item.categorySlug);
}

function isLight(item: MaxProfitCandidate): boolean {
  const price = item.priceCents ?? Number.POSITIVE_INFINITY;
  const courses = coursesOf(item);
  return (
    price <= LIGHT_ITEM_MAX_CENTS ||
    courses.has("side") ||
    courses.has("dessert") ||
    courses.has("drink")
  );
}

function complementaryScore(source: MaxProfitContext | undefined, candidate: MaxProfitCandidate): number {
  if (!source?.name) return 0;
  const src = coursesOf(source);
  const cand = coursesOf(candidate);
  let score = 0;
  // Classic cafe attach: food → drink, drink → pastry/food, either → light side/dessert.
  if (src.has("food") && cand.has("drink")) score += 4;
  if (src.has("drink") && (cand.has("food") || cand.has("dessert"))) score += 4;
  if (src.has("food") && (cand.has("side") || cand.has("dessert"))) score += 3;
  if (src.has("dessert") && cand.has("drink")) score += 2;
  // Avoid suggesting the same course as the hero item when pairing.
  if ([...src].some((c) => cand.has(c)) && score === 0) score -= 1;
  return score;
}

function upsellScore(source: MaxProfitContext | undefined, item: MaxProfitCandidate): number {
  const price = item.priceCents ?? 800;
  let score = complementaryScore(source, item);
  if (isBestSeller(item)) score += 5;
  if (isPopularSlug(item.slug, item.categorySlug)) score += 2;
  // Mid attach prices convert better than very expensive mains.
  if (price >= 300 && price <= 1800) score += 3;
  else if (price > 1800 && price <= 2800) score += 1;
  else if (price > 3500) score -= 2;
  return score;
}

function downsellScore(item: MaxProfitCandidate): number {
  const price = item.priceCents ?? 500;
  let score = 0;
  if (isLight(item)) score += 4;
  if (isBestSeller(item)) score += 3;
  if (price > 0 && price <= LIGHT_ITEM_MAX_CENTS) score += 3;
  if (price > LIGHT_ITEM_MAX_CENTS && price <= 2000) score += 1;
  if (price > 2500) score -= 3;
  const courses = coursesOf(item);
  if (courses.has("side") || courses.has("dessert") || courses.has("drink")) score += 2;
  return score;
}

function localSuggest(
  candidates: MaxProfitCandidate[],
  context: MaxProfitContext | undefined,
  max: number,
): MaxProfitSuggestion[] {
  if (candidates.length === 0 || max <= 0) return [];

  const upsellTarget = Math.max(1, Math.ceil(max * 0.65));
  const downsellTarget = Math.max(1, max - upsellTarget);

  const rankedUpsell = [...candidates]
    .map((item) => ({ item, score: upsellScore(context, item) }))
    .sort((a, b) => b.score - a.score || (b.item.priceCents ?? 0) - (a.item.priceCents ?? 0));

  const rankedDownsell = [...candidates]
    .map((item) => ({ item, score: downsellScore(item) }))
    .filter((row) => isLight(row.item) || row.score >= 4)
    .sort((a, b) => b.score - a.score || (a.item.priceCents ?? 0) - (b.item.priceCents ?? 0));

  const picked = new Set<string>();
  const out: MaxProfitSuggestion[] = [];

  for (const row of rankedUpsell) {
    if (out.filter((s) => s.suggestType === "upsell").length >= upsellTarget) break;
    if (picked.has(row.item.slug)) continue;
    picked.add(row.item.slug);
    out.push({
      slug: row.item.slug,
      suggestType: "upsell",
      priority: 20 - out.length,
    });
  }

  for (const row of rankedDownsell) {
    if (out.filter((s) => s.suggestType === "downsell").length >= downsellTarget) break;
    if (picked.has(row.item.slug)) continue;
    if (out.length >= max) break;
    picked.add(row.item.slug);
    out.push({
      slug: row.item.slug,
      suggestType: "downsell",
      priority: 15 - out.length,
    });
  }

  // Fill remaining slots with next-best upsells.
  for (const row of rankedUpsell) {
    if (out.length >= max) break;
    if (picked.has(row.item.slug)) continue;
    picked.add(row.item.slug);
    out.push({
      slug: row.item.slug,
      suggestType: "upsell",
      priority: 10 - out.length,
    });
  }

  return out.slice(0, max);
}

function toLinks(suggestions: MaxProfitSuggestion[]): UpsellLinkConfig[] {
  return suggestions.map((s) => ({
    slug: s.slug,
    suggestType: s.suggestType,
    promoMode: "regular" as const,
    ruleType: s.suggestType === "downsell" ? ("max_cart" as const) : ("always" as const),
    maxCartCents: s.suggestType === "downsell" ? CART_LARGE_CENTS : undefined,
    priority: Math.max(1, Math.min(100, s.priority)),
  }));
}

type AiPayload = {
  picks?: Array<{ slug?: string; suggestType?: string; priority?: number }>;
  rationale?: string;
};

async function aiRefine(
  candidates: MaxProfitCandidate[],
  context: MaxProfitContext | undefined,
  local: MaxProfitSuggestion[],
  max: number,
): Promise<MaxProfitResult | null> {
  if (!isDeepseekConfigured() || candidates.length === 0) return null;

  const catalog = candidates.slice(0, 40).map((c) => ({
    slug: c.slug,
    name: c.name,
    category: c.categoryLabel ?? c.categorySlug ?? "",
    priceCents: c.priceCents ?? null,
    bestSeller: isBestSeller(c),
    light: isLight(c),
  }));

  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `You pick checkout upsells/downsells for a cafe to maximize profit.
Return JSON only: {"picks":[{"slug":"...","suggestType":"upsell"|"downsell","priority":1-100}],"rationale":"short"}.
Rules:
- Upsells: best-selling / complementary add-ons that raise AOV.
- Downsells: lighter/cheaper alternatives for large carts.
- Only use slugs from the catalog. Max ${max} picks. Prefer a mix (~65% upsell, ~35% downsell).
- Never invent products.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          contextProduct: context ?? null,
          catalog,
          localSeed: local,
          max,
        }),
      },
    ],
    { temperature: 0.3, json: true },
  );

  if (!content) return null;
  const parsed = parseJsonFromModel<AiPayload>(content);
  if (!parsed?.picks?.length) return null;

  const allowed = new Set(candidates.map((c) => c.slug));
  const suggestions: MaxProfitSuggestion[] = [];
  const seen = new Set<string>();
  for (const pick of parsed.picks) {
    const slug = typeof pick.slug === "string" ? pick.slug.trim() : "";
    if (!slug || !allowed.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    suggestions.push({
      slug,
      suggestType: pick.suggestType === "downsell" ? "downsell" : "upsell",
      priority: typeof pick.priority === "number" ? pick.priority : 20 - suggestions.length,
    });
    if (suggestions.length >= max) break;
  }

  if (suggestions.length === 0) return null;

  // Fill gaps from local seed if AI returned too few.
  for (const seed of local) {
    if (suggestions.length >= max) break;
    if (seen.has(seed.slug)) continue;
    seen.add(seed.slug);
    suggestions.push(seed);
  }

  return {
    suggestions: suggestions.slice(0, max),
    rationale:
      typeof parsed.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim().slice(0, 160)
        : "AI ranked bestsellers to upsell and lighter items to downsell.",
    source: "ai",
  };
}

export async function suggestMaxProfitUpsells(input: {
  candidates: MaxProfitCandidate[];
  context?: MaxProfitContext;
  max?: number;
  excludeSlugs?: string[];
}): Promise<MaxProfitResult & { links: UpsellLinkConfig[] }> {
  const max = Math.max(1, Math.min(8, input.max ?? 8));
  const excluded = new Set(input.excludeSlugs ?? []);
  const candidates = input.candidates.filter((c) => c.slug && !excluded.has(c.slug));

  const local = localSuggest(candidates, input.context, max);
  const ai = await aiRefine(candidates, input.context, local, max).catch(() => null);
  const result = ai ?? {
    suggestions: local,
    rationale:
      local.length > 0
        ? "Picked bestsellers to upsell and lighter items to downsell. Review rules below."
        : "No suitable products found.",
    source: "local" as const,
  };

  return { ...result, links: toLinks(result.suggestions) };
}
