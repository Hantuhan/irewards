/**
 * Local kcal estimates from trusted cafe presets + keyword fallbacks.
 * Used to auto-fill when a merchant adds a product by name/description.
 */

import { CAFE_PRODUCT_PRESETS } from "@/lib/menu/cafe-product-presets";

export type KcalEstimate = {
  kcal: number;
  sugarG?: number;
  /** What we matched — shown under the field */
  label: string;
  confidence: "high" | "medium" | "low";
  source: "preset" | "keyword";
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s&+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreNameMatch(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (query === candidate) return 100;
  if (query.includes(candidate) || candidate.includes(query)) return 80;
  const qTokens = new Set(query.split(" ").filter((t) => t.length > 2));
  const cTokens = candidate.split(" ").filter((t) => t.length > 2);
  if (qTokens.size === 0 || cTokens.length === 0) return 0;
  let hit = 0;
  for (const t of cTokens) {
    if (qTokens.has(t)) hit += 1;
  }
  return Math.round((hit / cTokens.length) * 70);
}

/** Keyword → typical serving (USDA / HPB-aligned), when preset name match fails. */
const KEYWORD_ESTIMATES: Array<{
  pattern: RegExp;
  kcal: number;
  sugarG?: number;
  label: string;
}> = [
  { pattern: /\bespresso\b/, kcal: 5, sugarG: 0, label: "Espresso (USDA)" },
  { pattern: /\bamericano\b/, kcal: 10, sugarG: 0, label: "Americano (USDA)" },
  { pattern: /\bcappuccino\b/, kcal: 65, sugarG: 6, label: "Cappuccino (USDA)" },
  { pattern: /\bflat\s*white\b/, kcal: 120, sugarG: 11, label: "Flat white (USDA)" },
  { pattern: /\bmocha\b/, kcal: 290, label: "Mocha (cafe typical)" },
  { pattern: /\b(latte|café\s*latte|cafe\s*latte)\b/, kcal: 155, sugarG: 15, label: "Latte (USDA 12 oz)" },
  { pattern: /\b(pour[\s-]?over|filter\s*coffee|black\s*coffee)\b/, kcal: 5, sugarG: 0, label: "Black coffee (USDA)" },
  { pattern: /\bkopi[\s-]?o\b/, kcal: 66, label: "Kopi-O (HPB)" },
  { pattern: /\bkopi\b/, kcal: 135, sugarG: 17.5, label: "Kopi (HPB/SHF)" },
  { pattern: /\bteh\s*tarik\b/, kcal: 229, sugarG: 41, label: "Teh Tarik (HPB/SHF)" },
  { pattern: /\b(yuan\s*yang|yuenyeung)\b/, kcal: 150, label: "Yuan Yang (HPB range)" },
  { pattern: /\bmatcha\b/, kcal: 170, sugarG: 16, label: "Matcha latte (milk drink)" },
  { pattern: /\b(hot\s*chocolate|cocoa)\b/, kcal: 240, label: "Hot chocolate (milk + cocoa)" },
  { pattern: /\bchai\b/, kcal: 180, label: "Chai latte (milk drink)" },
  { pattern: /\borange\b.*\bjuice\b|\bjuice\b.*\borange\b/, kcal: 120, sugarG: 21, label: "Orange juice (USDA)" },
  { pattern: /\bwatermelon\b/, kcal: 75, sugarG: 16, label: "Watermelon juice (USDA)" },
  { pattern: /\blemonade\b|\blemon\s*juice\b/, kcal: 115, sugarG: 29, label: "Lemonade (USDA)" },
  { pattern: /\bapple\b.*\bjuice\b/, kcal: 115, sugarG: 24, label: "Apple juice (USDA)" },
  { pattern: /\bcarrot\b.*\bjuice\b/, kcal: 95, sugarG: 16, label: "Carrot juice (USDA)" },
  { pattern: /\bcroissant\b/, kcal: 230, sugarG: 6, label: "Croissant (USDA)" },
  { pattern: /\b(pain\s*au\s*chocolat|chocolate\s*croissant)\b/, kcal: 295, sugarG: 14, label: "Pain au chocolat (USDA)" },
  { pattern: /\bnasi\s*lemak\b/, kcal: 550, label: "Nasi lemak (SHF)" },
  { pattern: /\bchicken\s*rice\b/, kcal: 525, label: "Chicken rice (SHF)" },
  { pattern: /\b(mee|mie)\s*goreng\b/, kcal: 520, label: "Mee goreng (SHF)" },
  { pattern: /\b(french\s*)?fries\b|\bchips\b/, kcal: 320, label: "Fries (USDA)" },
  { pattern: /\begg\b/, kcal: 90, label: "Egg (USDA)" },
  { pattern: /\btoast\b/, kcal: 150, label: "Toast (USDA)" },
  { pattern: /\bwaffle\b/, kcal: 310, label: "Waffle (typical)" },
  { pattern: /\bbrownie\b/, kcal: 350, label: "Brownie (typical)" },
  { pattern: /\bcheesecake\b/, kcal: 400, label: "Cheesecake slice (typical)" },
  { pattern: /\btiramisu\b/, kcal: 380, label: "Tiramisu (typical)" },
];

export function estimateKcalFromProduct(input: {
  name: string;
  description?: string | null;
  categorySlug?: string;
  categoryLabel?: string;
}): KcalEstimate | null {
  const name = normalize(input.name);
  const description = normalize(input.description ?? "");
  const haystack = `${name} ${description}`.trim();
  if (!haystack) return null;

  const categorySlug = (input.categorySlug ?? "").toLowerCase();

  let best: { score: number; estimate: KcalEstimate } | null = null;
  for (const preset of CAFE_PRODUCT_PRESETS) {
    if (preset.kcal == null) continue;
    const presetName = normalize(preset.name);
    let score = scoreNameMatch(name, presetName);
    if (score < 40) {
      score = Math.max(score, scoreNameMatch(haystack, presetName) - 15);
    }
    if (categorySlug && preset.categorySlug === categorySlug) score += 15;
    if (score < 50) continue;
    const estimate: KcalEstimate = {
      kcal: preset.kcal,
      sugarG: preset.sugarG,
      label: `${preset.name} · trusted preset`,
      confidence: score >= 90 ? "high" : score >= 70 ? "medium" : "low",
      source: "preset",
    };
    if (!best || score > best.score) best = { score, estimate };
  }
  if (best && best.score >= 55) return best.estimate;

  for (const row of KEYWORD_ESTIMATES) {
    if (!row.pattern.test(haystack)) continue;
    return {
      kcal: row.kcal,
      sugarG: row.sugarG,
      label: row.label,
      confidence: "medium",
      source: "keyword",
    };
  }

  return null;
}
