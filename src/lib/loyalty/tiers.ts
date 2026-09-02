import type { RewardLevelRow } from "@/lib/db/types";
import type { LocalizedMap } from "@/lib/i18n/program-locale";

export type CustomerTierSnapshot = {
  current: RewardLevelRow;
  next: RewardLevelRow | null;
  lifetimePointsEarned: number;
  pointsToNextLevel: number | null;
};

export function resolveCustomerLevel(
  lifetimePoints: number,
  levels: RewardLevelRow[],
): RewardLevelRow {
  const sorted = [...levels].sort((a, b) => b.min_lifetime_points - a.min_lifetime_points);
  const match = sorted.find((level) => lifetimePoints >= level.min_lifetime_points);
  if (!match) {
    const fallback = levels.find((l) => l.level_number === 1);
    if (!fallback) throw new Error("Merchant has no reward levels configured");
    return fallback;
  }
  return match;
}

export function getNextLevel(
  current: RewardLevelRow,
  levels: RewardLevelRow[],
): RewardLevelRow | null {
  return (
    levels
      .filter((level) => level.level_number > current.level_number)
      .sort((a, b) => a.level_number - b.level_number)[0] ?? null
  );
}

export function buildCustomerTierSnapshot(
  lifetimePoints: number,
  levels: RewardLevelRow[],
): CustomerTierSnapshot {
  const current = resolveCustomerLevel(lifetimePoints, levels);
  const next = getNextLevel(current, levels);
  const pointsToNextLevel = next
    ? Math.max(0, next.min_lifetime_points - lifetimePoints)
    : null;

  return {
    current,
    next,
    lifetimePointsEarned: lifetimePoints,
    pointsToNextLevel,
  };
}

export function applyLevelMultiplier(basePoints: number, multiplier: number): number {
  return Math.max(1, Math.round(basePoints * multiplier));
}

export function applyLevelDiscount(subtotalCents: number, discountPercent: number): {
  discountCents: number;
  totalCents: number;
} {
  const discountCents = Math.round(subtotalCents * (discountPercent / 100));
  return {
    discountCents,
    totalCents: Math.max(0, subtotalCents - discountCents),
  };
}

export type RewardLevelInput = {
  levelNumber: number;
  name: string;
  minLifetimePoints: number;
  pointsMultiplier: number;
  perkDescription: string | null;
  nameI18n?: LocalizedMap;
  perkDescriptionI18n?: LocalizedMap;
  discountPercent: number;
  tierActive?: boolean;
  pointExpiryDays?: number | null;
  birthdayPoints?: number;
  welcomePoints?: number;
  welcomeRewards?: number;
  renewPoints?: number;
  renewRewards?: number;
  validityMonths?: number | null;
};

export function validateRewardLevels(levels: RewardLevelInput[]): string | null {
  if (levels.length !== 5) {
    return "Exactly 5 iRewards levels are required";
  }

  const sorted = [...levels].sort((a, b) => a.levelNumber - b.levelNumber);
  for (let i = 0; i < sorted.length; i++) {
    const level = sorted[i];
    if (level.levelNumber !== i + 1) {
      return "Levels must be numbered 1 through 5";
    }
    if (i === 0 && level.minLifetimePoints !== 0) {
      return "Level 1 threshold must be 0 points";
    }
    if (i > 0 && level.minLifetimePoints <= sorted[i - 1].minLifetimePoints) {
      return "Point thresholds must increase for each level";
    }
    if (level.pointsMultiplier <= 0) {
      return "Points multiplier must be greater than 0";
    }
    if (level.discountPercent < 0 || level.discountPercent > 100) {
      return "Discount must be between 0 and 100";
    }
    if (!level.name.trim()) {
      return "Each level needs a name";
    }
  }

  return null;
}
