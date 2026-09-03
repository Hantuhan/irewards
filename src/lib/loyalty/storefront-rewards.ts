import { parseLevelGifts } from "@/lib/loyalty/level-gifts";

/** Minimal level shape for storefront reward listings. */
export type StorefrontLevelBonuses = {
  levelNumber: number;
  name: string;
  perkDescription?: string | null;
  birthdayPoints?: number;
  welcomePoints?: number;
  welcomeRewards?: number;
  renewPoints?: number;
  renewRewards?: number;
  tierActive?: boolean;
};

export type StorefrontRewardItem = {
  id: string;
  title: string;
  subtitle: string;
  points: number | null;
  kind: "gift" | "birthday" | "welcome" | "renewal";
  emoji: string;
  levelName: string;
  levelNumber: number;
};

/**
 * Build the customer-facing rewards list from admin level gifts + more-bonuses.
 * Skips inactive levels and zero/empty values.
 */
export function buildStorefrontRewardCatalog(
  levels: StorefrontLevelBonuses[],
): StorefrontRewardItem[] {
  const items: StorefrontRewardItem[] = [];

  for (const level of levels) {
    if (level.tierActive === false) continue;

    for (const [i, gift] of parseLevelGifts(level.perkDescription).entries()) {
      items.push({
        id: `gift-${level.levelNumber}-${i}`,
        title: gift,
        subtitle: `Gift at ${level.name}`,
        points: null,
        kind: "gift",
        emoji: "🎁",
        levelName: level.name,
        levelNumber: level.levelNumber,
      });
    }

    const birthday = Number(level.birthdayPoints ?? 0);
    if (birthday > 0) {
      items.push({
        id: `birthday-${level.levelNumber}`,
        title: "Birthday bonus",
        subtitle: `Extra points on your birthday · ${level.name}`,
        points: birthday,
        kind: "birthday",
        emoji: "🎂",
        levelName: level.name,
        levelNumber: level.levelNumber,
      });
    }

    const welcomePts = Number(level.welcomePoints ?? 0);
    const welcomeFreebies = Number(level.welcomeRewards ?? 0);
    if (welcomePts > 0 || welcomeFreebies > 0) {
      const bits: string[] = [];
      if (welcomeFreebies > 0) {
        bits.push(
          `${welcomeFreebies} freebie${welcomeFreebies === 1 ? "" : "s"}`,
        );
      }
      if (welcomePts > 0) bits.push(`${welcomePts} pts`);
      items.push({
        id: `welcome-${level.levelNumber}`,
        title: "Welcome bonus",
        subtitle: `When you reach ${level.name} · ${bits.join(" + ")}`,
        points: welcomePts > 0 ? welcomePts : null,
        kind: "welcome",
        emoji: "☕",
        levelName: level.name,
        levelNumber: level.levelNumber,
      });
    }

    const renewPts = Number(level.renewPoints ?? 0);
    const renewFreebies = Number(level.renewRewards ?? 0);
    if (renewPts > 0 || renewFreebies > 0) {
      const bits: string[] = [];
      if (renewFreebies > 0) {
        bits.push(
          `${renewFreebies} freebie${renewFreebies === 1 ? "" : "s"}`,
        );
      }
      if (renewPts > 0) bits.push(`${renewPts} pts`);
      items.push({
        id: `renewal-${level.levelNumber}`,
        title: "Renewal bonus",
        subtitle: `When ${level.name} renews · ${bits.join(" + ")}`,
        points: renewPts > 0 ? renewPts : null,
        kind: "renewal",
        emoji: "🔄",
        levelName: level.name,
        levelNumber: level.levelNumber,
      });
    }
  }

  return items;
}

/** Short perk lines for a tier card (gifts first, then bonus blurbs). */
export function formatLevelPerkLines(level: StorefrontLevelBonuses): string[] {
  const lines = [...parseLevelGifts(level.perkDescription)];

  const birthday = Number(level.birthdayPoints ?? 0);
  if (birthday > 0) lines.push(`Birthday +${birthday} pts`);

  const welcomePts = Number(level.welcomePoints ?? 0);
  const welcomeFreebies = Number(level.welcomeRewards ?? 0);
  if (welcomeFreebies > 0 || welcomePts > 0) {
    const bits: string[] = [];
    if (welcomeFreebies > 0) bits.push(`${welcomeFreebies} welcome freebie${welcomeFreebies === 1 ? "" : "s"}`);
    if (welcomePts > 0) bits.push(`+${welcomePts} welcome pts`);
    lines.push(bits.join(" · "));
  }

  const renewPts = Number(level.renewPoints ?? 0);
  const renewFreebies = Number(level.renewRewards ?? 0);
  if (renewFreebies > 0 || renewPts > 0) {
    const bits: string[] = [];
    if (renewFreebies > 0) bits.push(`${renewFreebies} renewal freebie${renewFreebies === 1 ? "" : "s"}`);
    if (renewPts > 0) bits.push(`+${renewPts} renewal pts`);
    lines.push(bits.join(" · "));
  }

  return lines;
}
