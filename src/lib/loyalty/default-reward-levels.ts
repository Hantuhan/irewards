import type { RewardLevelInput } from "@/lib/loyalty/tiers";

import { DEFAULT_TIER_COPY } from "@/lib/i18n/program-locale";

export type RewardLevelConfig = RewardLevelInput & {
  tierActive: boolean;
  pointExpiryDays: number | null;
  birthdayPoints: number;
  welcomePoints: number;
  welcomeRewards: number;
  renewPoints: number;
  renewRewards: number;
  validityMonths: number | null;
};

/** Cafe / F&B industry typical: unused points expire after 12 months. */
export const INDUSTRY_POINT_EXPIRY_DAYS = 365;

export const DEFAULT_REWARD_LEVELS: RewardLevelConfig[] = [
  {
    levelNumber: 1,
    name: "Starter",
    minLifetimePoints: 0,
    pointsMultiplier: 1,
    perkDescription: "Welcome to iRewards",
    discountPercent: 0,
    tierActive: true,
    pointExpiryDays: INDUSTRY_POINT_EXPIRY_DAYS,
    birthdayPoints: 0,
    welcomePoints: 0,
    welcomeRewards: 0,
    renewPoints: 0,
    renewRewards: 0,
    validityMonths: null,
  },
  {
    levelNumber: 2,
    name: "Bronze",
    minLifetimePoints: 50,
    pointsMultiplier: 1.1,
    perkDescription: "Free coffee\nFree topping upgrade",
    discountPercent: 0,
    tierActive: true,
    pointExpiryDays: INDUSTRY_POINT_EXPIRY_DAYS,
    birthdayPoints: 0,
    welcomePoints: 0,
    welcomeRewards: 0,
    renewPoints: 0,
    renewRewards: 0,
    validityMonths: null,
  },
  {
    levelNumber: 3,
    name: "Silver",
    minLifetimePoints: 150,
    pointsMultiplier: 1.25,
    perkDescription: "Birthday drink\nFree pastry once a month",
    discountPercent: 0,
    tierActive: true,
    pointExpiryDays: INDUSTRY_POINT_EXPIRY_DAYS,
    birthdayPoints: 0,
    welcomePoints: 0,
    welcomeRewards: 0,
    renewPoints: 0,
    renewRewards: 0,
    validityMonths: null,
  },
  {
    levelNumber: 4,
    name: "Gold",
    minLifetimePoints: 400,
    pointsMultiplier: 1.5,
    perkDescription: "Priority queue\nFree size upgrade\nMystery gift monthly",
    discountPercent: 0,
    tierActive: true,
    pointExpiryDays: INDUSTRY_POINT_EXPIRY_DAYS,
    birthdayPoints: 0,
    welcomePoints: 0,
    welcomeRewards: 0,
    renewPoints: 0,
    renewRewards: 0,
    validityMonths: null,
  },
  {
    levelNumber: 5,
    name: "Platinum",
    minLifetimePoints: 1000,
    pointsMultiplier: 2,
    perkDescription: "Exclusive seasonal menu\nFree drink every month\nBring-a-friend free drink",
    discountPercent: 0,
    tierActive: true,
    pointExpiryDays: INDUSTRY_POINT_EXPIRY_DAYS,
    birthdayPoints: 0,
    welcomePoints: 0,
    welcomeRewards: 0,
    renewPoints: 0,
    renewRewards: 0,
    validityMonths: null,
  },
];

/** Merge API/DB rows with defaults so the admin always has all 5 tiers. */
export function normalizeRewardLevels(
  levels?: Partial<RewardLevelConfig>[] | null,
): RewardLevelConfig[] {
  const safe = levels ?? [];
  const byNumber = new Map(
    safe
      .filter((l) => l.levelNumber != null)
      .map((l) => [l.levelNumber as number, l]),
  );

  return DEFAULT_REWARD_LEVELS.map((defaults) => {
    const existing = byNumber.get(defaults.levelNumber);
    const tierDefaults = DEFAULT_TIER_COPY[defaults.levelNumber];
    if (!existing) {
      return {
        ...defaults,
        nameI18n: tierDefaults?.name ?? { en: defaults.name },
        perkDescriptionI18n: tierDefaults?.perk ?? { en: defaults.perkDescription ?? "" },
      };
    }
    const rawExpiry = existing.pointExpiryDays;
    // Blank/null or very short windows → industry 12 months (30 days is too aggressive for cafes).
    const pointExpiryDays =
      typeof rawExpiry === "number" && rawExpiry >= 90
        ? rawExpiry
        : defaults.pointExpiryDays;

    return {
      ...defaults,
      ...existing,
      levelNumber: defaults.levelNumber,
      name: existing.name?.trim() || defaults.name,
      perkDescription: existing.perkDescription?.trim() || defaults.perkDescription,
      pointExpiryDays,
      nameI18n: {
        en: existing.name?.trim() || defaults.name,
        ...tierDefaults?.name,
        ...existing.nameI18n,
      },
      perkDescriptionI18n: {
        en: existing.perkDescription?.trim() || defaults.perkDescription || "",
        ...tierDefaults?.perk,
        ...existing.perkDescriptionI18n,
      },
    };
  });
}
