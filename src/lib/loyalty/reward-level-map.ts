import type { RewardLevelRow } from "@/lib/db/types";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import { resolveLocalized } from "@/lib/i18n/program-locale";

export function mapRewardLevel(level: RewardLevelRow, lang?: ProgramLanguage) {
  const nameI18n = (level.name_i18n ?? {}) as Record<string, string>;
  const perkI18n = (level.perk_description_i18n ?? {}) as Record<string, string>;
  const name = lang
    ? resolveLocalized(nameI18n, lang, level.name)
    : level.name;
  const perkDescription = lang
    ? resolveLocalized(perkI18n, lang, level.perk_description ?? "")
    : level.perk_description;

  return {
    levelNumber: level.level_number,
    name,
    minLifetimePoints: level.min_lifetime_points,
    pointsMultiplier: Number(level.points_multiplier),
    perkDescription: perkDescription || null,
    nameI18n,
    perkDescriptionI18n: perkI18n,
    discountPercent: Number(level.discount_percent),
    tierActive: level.tier_active ?? true,
    pointExpiryDays: level.point_expiry_days,
    birthdayPoints: level.birthday_points ?? 0,
    welcomePoints: level.welcome_points ?? 0,
    welcomeRewards: level.welcome_rewards ?? 0,
    renewPoints: level.renew_points ?? 0,
    renewRewards: level.renew_rewards ?? 0,
    validityMonths: level.validity_months,
  };
}

/** Metal-themed gradients keyed by tier name (case-insensitive). */
const GRADIENT_BY_TIER_NAME: Record<string, string> = {
  starter: "linear-gradient(135deg, #5F7A61 0%, #9BB89E 100%)",
  bronze: "linear-gradient(135deg, #6B3E1E 0%, #CD7F32 100%)",
  silver: "linear-gradient(135deg, #8A9199 0%, #D1D5DB 100%)",
  gold: "linear-gradient(135deg, #B8860B 0%, #FFD700 100%)",
  platinum: "linear-gradient(135deg, #1A1A2E 0%, #4A5568 100%)",
  vip: "linear-gradient(135deg, #1A1A2E 0%, #4A5568 100%)",
};

/** Fallback by level 1–5 when tier name is custom. */
export const TIER_CARD_GRADIENTS = [
  GRADIENT_BY_TIER_NAME.starter,
  GRADIENT_BY_TIER_NAME.bronze,
  GRADIENT_BY_TIER_NAME.silver,
  GRADIENT_BY_TIER_NAME.gold,
  GRADIENT_BY_TIER_NAME.platinum,
];

export function tierCardGradient(levelNumber: number, name?: string | null): string {
  const key = name?.toLowerCase().trim() ?? "";
  if (key && GRADIENT_BY_TIER_NAME[key]) {
    return GRADIENT_BY_TIER_NAME[key];
  }
  const index = Math.min(Math.max(levelNumber - 1, 0), TIER_CARD_GRADIENTS.length - 1);
  return TIER_CARD_GRADIENTS[index];
}
