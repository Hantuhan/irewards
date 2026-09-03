import { DEFAULT_REWARD_LEVELS, type RewardLevelConfig } from "@/lib/loyalty/default-reward-levels";
import { calculatePointsRoi, DEFAULT_ROI_SCENARIO } from "@/lib/loyalty/points-roi";
import { effectiveEarnBackPercent } from "@/lib/loyalty/points-calculator";
import type { MerchantCurrency } from "@/lib/merchant/currency";

export type MembershipEarnPreset = {
  id: string;
  label: string;
  hint: string;
  pointsPerRinggit: number;
};

export type MembershipRedeemPreset = {
  id: string;
  label: string;
  hint: string;
  centsPerPoint: number;
};

/** MY/SG cafe starting earn rates (pts per RM or SGD). */
export const MEMBERSHIP_EARN_PRESETS: MembershipEarnPreset[] = [
  {
    id: "gentle",
    label: "Fewer points",
    hint: "Cheaper for you · takes more visits to a free drink",
    pointsPerRinggit: 0.08,
  },
  {
    id: "typical",
    label: "Normal cafe",
    hint: "What most cafes start with — a good middle",
    pointsPerRinggit: 0.1,
  },
  {
    id: "generous",
    label: "More points",
    hint: "Customers feel it sooner · costs you a bit more",
    pointsPerRinggit: 0.15,
  },
];

export const MEMBERSHIP_REDEEM_PRESETS: MembershipRedeemPreset[] = [
  {
    id: "tight",
    label: "5 sen / pt",
    hint: "Each point is worth less money off",
    centsPerPoint: 5,
  },
  {
    id: "typical",
    label: "10 sen / pt",
    hint: "Most cafes start here",
    centsPerPoint: 10,
  },
  {
    id: "rich",
    label: "20 sen / pt",
    hint: "Each point is worth more money off",
    centsPerPoint: 20,
  },
];

/** Default earn card: Normal cafe (0.1 pts / RM). */
export const MEMBERSHIP_DEFAULT_EARN =
  MEMBERSHIP_EARN_PRESETS.find((p) => p.id === "typical") ?? MEMBERSHIP_EARN_PRESETS[1]!;

/** Default redeem card: 10 sen / pt. */
export const MEMBERSHIP_DEFAULT_REDEEM =
  MEMBERSHIP_REDEEM_PRESETS.find((p) => p.id === "typical") ?? MEMBERSHIP_REDEEM_PRESETS[1]!;

export function isMembershipEarnPreset(pointsPerRinggit: number): boolean {
  return MEMBERSHIP_EARN_PRESETS.some(
    (p) => Math.abs(p.pointsPerRinggit - pointsPerRinggit) < 0.0005,
  );
}

export function isMembershipRedeemPreset(centsPerPoint: number): boolean {
  return MEMBERSHIP_REDEEM_PRESETS.some((p) => p.centsPerPoint === centsPerPoint);
}

/** Nearest wizard earn preset — Program assistant / tabs must stay on this ladder. */
export function nearestMembershipEarnPreset(pointsPerRinggit: number): MembershipEarnPreset {
  let best = MEMBERSHIP_DEFAULT_EARN;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const preset of MEMBERSHIP_EARN_PRESETS) {
    const dist = Math.abs(preset.pointsPerRinggit - pointsPerRinggit);
    if (dist < bestDist) {
      best = preset;
      bestDist = dist;
    }
  }
  return best;
}

export function nearestMembershipRedeemPreset(centsPerPoint: number): MembershipRedeemPreset {
  let best = MEMBERSHIP_DEFAULT_REDEEM;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const preset of MEMBERSHIP_REDEEM_PRESETS) {
    const dist = Math.abs(preset.centsPerPoint - centsPerPoint);
    if (dist < bestDist) {
      best = preset;
      bestDist = dist;
    }
  }
  return best;
}

/** Step along the wizard earn cards (Fewer / Normal / More). */
export function stepMembershipEarnPreset(
  pointsPerRinggit: number,
  direction: 1 | -1,
): MembershipEarnPreset {
  const sorted = [...MEMBERSHIP_EARN_PRESETS].sort(
    (a, b) => a.pointsPerRinggit - b.pointsPerRinggit,
  );
  let idx = sorted.findIndex(
    (p) => Math.abs(p.pointsPerRinggit - pointsPerRinggit) < 0.0005,
  );
  // Off-card rates start from Normal cafe (wizard default), then step.
  if (idx < 0) {
    idx = sorted.findIndex((p) => p.id === MEMBERSHIP_DEFAULT_EARN.id);
  }
  const next = Math.min(sorted.length - 1, Math.max(0, idx + direction));
  return sorted[next] ?? MEMBERSHIP_DEFAULT_EARN;
}

/** Step along the wizard redeem cards (5 / 10 / 20 sen). */
export function stepMembershipRedeemPreset(
  centsPerPoint: number,
  direction: 1 | -1,
): MembershipRedeemPreset {
  const sorted = [...MEMBERSHIP_REDEEM_PRESETS].sort(
    (a, b) => a.centsPerPoint - b.centsPerPoint,
  );
  let idx = sorted.findIndex((p) => p.centsPerPoint === centsPerPoint);
  if (idx < 0) {
    idx = sorted.findIndex((p) => p.id === MEMBERSHIP_DEFAULT_REDEEM.id);
  }
  const next = Math.min(sorted.length - 1, Math.max(0, idx + direction));
  return sorted[next] ?? MEMBERSHIP_DEFAULT_REDEEM;
}

/** Force Collecting & using onto wizard cards (Normal cafe + 10 sen when off-card). */
export function normalizeMembershipRates(input: {
  pointsPerRinggit: number;
  centsPerPoint: number;
}): { pointsPerRinggit: number; centsPerPoint: number } {
  return {
    pointsPerRinggit: isMembershipEarnPreset(input.pointsPerRinggit)
      ? input.pointsPerRinggit
      : MEMBERSHIP_DEFAULT_EARN.pointsPerRinggit,
    centsPerPoint: isMembershipRedeemPreset(input.centsPerPoint)
      ? input.centsPerPoint
      : MEMBERSHIP_DEFAULT_REDEEM.centsPerPoint,
  };
}

export function countMembershipPerks(levels: RewardLevelConfig[]): {
  tiers: number;
  activeTiers: number;
  perks: number;
  discountTiers: number;
} {
  const active = levels.filter((l) => l.tierActive !== false);
  const perks = active.filter((l) => {
    const hasCopy = Boolean(l.perkDescription?.trim());
    const hasDiscount = Number(l.discountPercent ?? 0) > 0;
    const hasWelcome =
      Number(l.welcomePoints ?? 0) > 0 || Number(l.welcomeRewards ?? 0) > 0;
    const hasBirthday = Number(l.birthdayPoints ?? 0) > 0;
    return hasCopy || hasDiscount || hasWelcome || hasBirthday;
  }).length;
  const discountTiers = active.filter((l) => Number(l.discountPercent ?? 0) > 0).length;
  return {
    tiers: levels.length,
    activeTiers: active.length,
    perks,
    discountTiers,
  };
}

export function pointsForSpend(spendRm: number, pointsPerRinggit: number, multiplier = 1): number {
  return Math.round(spendRm * pointsPerRinggit * multiplier);
}

/** Exact product before rounding — for showing the maths to merchants. */
export function pointsRawForSpend(
  spendRm: number,
  pointsPerRinggit: number,
  multiplier = 1,
): number {
  return spendRm * pointsPerRinggit * multiplier;
}

export function moneyForPoints(points: number, centsPerPoint: number): number {
  return (points * centsPerPoint) / 100;
}

/** Human-readable earn formula, e.g. "RM 10 × 0.08 = 0.8 → round to 1 pt". */
export function formatEarnCalculation(
  symbol: string,
  spendRm: number,
  pointsPerRinggit: number,
  multiplier = 1,
  /** When set, names the level in the speed bit — e.g. "× 2 (Platinum speed)". */
  levelName?: string,
): string {
  const raw = pointsRawForSpend(spendRm, pointsPerRinggit, multiplier);
  const rounded = pointsForSpend(spendRm, pointsPerRinggit, multiplier);
  const rate = formatRate(pointsPerRinggit);
  const rawStr = formatRate(raw);
  const speedLabel = levelName ? `${levelName} speed` : "level speed";
  const multBit =
    multiplier !== 1 ? ` × ${formatRate(multiplier)} (${speedLabel})` : "";
  if (Math.abs(raw - rounded) < 1e-9) {
    return `${symbol} ${spendRm} × ${rate} pts${multBit} = ${rounded} pt${rounded === 1 ? "" : "s"}`;
  }
  return `${symbol} ${spendRm} × ${rate} pts${multBit} = ${rawStr} → round to ${rounded} pt${rounded === 1 ? "" : "s"}`;
}

/** Levels the merchant turned on (wizard count / Levels & gifts toggle). */
export function activeMembershipLevels(levels: RewardLevelConfig[]): RewardLevelConfig[] {
  return levels
    .filter((l) => l.tierActive !== false)
    .sort((a, b) => a.levelNumber - b.levelNumber);
}

/** Highest active level — used for ROI “top of ladder” examples. */
export function topActiveMembershipLevel(
  levels: RewardLevelConfig[],
): RewardLevelConfig | undefined {
  const active = activeMembershipLevels(levels);
  return active[active.length - 1];
}

/**
 * Keep all 5 DB rows, but only the first `count` levels are On.
 * Count is clamped to 2–5 (Starter alone is not a ladder).
 */
export function applyMembershipLevelCount(
  levels: RewardLevelConfig[],
  count: number,
): RewardLevelConfig[] {
  const n = Math.min(5, Math.max(2, Math.round(count)));
  const byNumber = new Map(levels.map((l) => [l.levelNumber, l]));
  return DEFAULT_REWARD_LEVELS.map((defaults) => {
    const existing = byNumber.get(defaults.levelNumber) ?? defaults;
    return {
      ...existing,
      tierActive: existing.levelNumber <= n,
    };
  });
}

export function membershipLevelCount(levels: RewardLevelConfig[]): number {
  const active = activeMembershipLevels(levels);
  return Math.min(5, Math.max(2, active.length || 5));
}

export const MEMBERSHIP_LEVEL_COUNT_OPTIONS = [
  {
    count: 2,
    label: "2 levels",
    hint: "Starter → Bronze — smallest ladder",
  },
  {
    count: 3,
    label: "3 levels",
    hint: "Starter → Bronze → Silver — simple cafe ladder",
  },
  {
    count: 4,
    label: "4 levels",
    hint: "Up to Gold — room to grow without Platinum",
  },
  {
    count: 5,
    label: "5 levels",
    hint: "Full ladder through Platinum — most cafes",
  },
] as const;

/** Human-readable spend formula, e.g. "1 pt × 10 sen = RM 0.10 off". */
export function formatSpendCalculation(
  symbol: string,
  points: number,
  centsPerPoint: number,
  unitNamePlural: string,
): string {
  const money = moneyForPoints(points, centsPerPoint);
  return `${points} pt${points === 1 ? "" : "s"} × ${centsPerPoint} ${unitNamePlural} = ${symbol} ${money.toFixed(2)} off`;
}

function formatRate(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(4).replace(/\.?0+$/, "");
  return s;
}

export function membershipRoiPreview(input: {
  pointsPerRinggit: number;
  centsPerPoint: number;
  currency: MerchantCurrency;
  levels: RewardLevelConfig[];
  /** Walkthrough uses RM/S$ 10 so cafe owners can follow the maths. */
  avgOrderRm?: number;
}) {
  const top = topActiveMembershipLevel(input.levels);
  return calculatePointsRoi(
    {
      pointsPerRinggit: input.pointsPerRinggit,
      centsPerPoint: input.centsPerPoint,
      currency: input.currency,
      topTierName: top?.name ?? "Platinum",
      topTierMultiplier: top?.pointsMultiplier ?? 2,
      rules: [],
    },
    {
      ...DEFAULT_ROI_SCENARIO,
      avgOrderRm: input.avgOrderRm ?? DEFAULT_ROI_SCENARIO.avgOrderRm,
    },
  );
}

export function membershipEarnBackPercent(
  pointsPerRinggit: number,
  centsPerPoint: number,
): number {
  return effectiveEarnBackPercent(pointsPerRinggit, centsPerPoint);
}

export function starterMembershipLevels(): RewardLevelConfig[] {
  return DEFAULT_REWARD_LEVELS.map((level) => ({ ...level }));
}
