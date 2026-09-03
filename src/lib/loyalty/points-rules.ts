import type { RewardLevelRow } from "@/lib/db/types";
import { formatMultiplier } from "@/lib/format/number";

export type PointsRuleConditionField = "member_tier" | "day_of_week";
export type PointsRuleOperator = "is" | "is_not";

export type PointsRuleCondition = {
  field: PointsRuleConditionField;
  operator: PointsRuleOperator;
  value: string;
};

export type PointsRuleItemCondition = {
  menuItemId: string;
  name: string;
};

export type PointsRule = {
  id: string;
  name: string;
  status: "active" | "inactive";
  pointsMultiplier: number;
  mainConditions: PointsRuleCondition[];
  itemConditions: PointsRuleItemCondition[];
  sortOrder: number;
};

export const CONDITION_FIELDS: {
  id: PointsRuleConditionField;
  label: string;
}[] = [
  { id: "member_tier", label: "Member tier" },
  { id: "day_of_week", label: "Day of week" },
];

export const CONDITION_OPERATORS: { id: PointsRuleOperator; label: string }[] = [
  { id: "is", label: "is" },
  { id: "is_not", label: "is not" },
];

export const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

export type BonusDayTemplate = {
  id: string;
  name: string;
  hint: string;
  pointsMultiplier: number;
  dayId: string;
};

/** Ready-made Bonus Days for cafe owners (popup picker). */
export const BONUS_DAY_TEMPLATES: BonusDayTemplate[] = [
  {
    id: "monday-double",
    name: "Monday double points",
    hint: "Quiet weekday boost — most cafes start here",
    pointsMultiplier: 2,
    dayId: "monday",
  },
  {
    id: "tuesday-double",
    name: "Tuesday double points",
    hint: "Fill midweek seats",
    pointsMultiplier: 2,
    dayId: "tuesday",
  },
  {
    id: "wednesday-double",
    name: "Wednesday double points",
    hint: "Hump-day incentive",
    pointsMultiplier: 2,
    dayId: "wednesday",
  },
  {
    id: "thursday-double",
    name: "Thursday double points",
    hint: "Warm up for the weekend",
    pointsMultiplier: 2,
    dayId: "thursday",
  },
  {
    id: "friday-15",
    name: "Friday 1.5× points",
    hint: "Gentle Friday treat without over-spending",
    pointsMultiplier: 1.5,
    dayId: "friday",
  },
  {
    id: "saturday-15",
    name: "Saturday 1.5× points",
    hint: "Reward weekend regulars a bit more",
    pointsMultiplier: 1.5,
    dayId: "saturday",
  },
  {
    id: "sunday-double",
    name: "Sunday double points",
    hint: "Family brunch / quiet Sunday lift",
    pointsMultiplier: 2,
    dayId: "sunday",
  },
  {
    id: "weekend-triple",
    name: "Sunday triple points",
    hint: "Big push for a slow Sunday",
    pointsMultiplier: 3,
    dayId: "sunday",
  },
];

export function bonusDayTemplatePayload(template: BonusDayTemplate): Omit<
  PointsRule,
  "id" | "sortOrder"
> {
  return {
    name: template.name,
    status: "active",
    pointsMultiplier: template.pointsMultiplier,
    mainConditions: [{ field: "day_of_week", operator: "is", value: template.dayId }],
    itemConditions: [],
  };
}

export function conditionValueOptions(
  field: PointsRuleConditionField,
  tiers: { name: string }[],
): { id: string; label: string }[] {
  if (field === "member_tier") {
    return tiers.map((t) => ({ id: t.name.toLowerCase(), label: t.name }));
  }
  return DAYS_OF_WEEK;
}

function matchesCondition(
  condition: PointsRuleCondition,
  context: {
    tierName: string;
    dayOfWeek: string;
  },
): boolean {
  const tierKey = context.tierName.toLowerCase();
  let actual = "";
  if (condition.field === "member_tier") actual = tierKey;
  if (condition.field === "day_of_week") actual = context.dayOfWeek;

  const expected = condition.value.toLowerCase();
  const hit = actual === expected;
  return condition.operator === "is" ? hit : !hit;
}

export function ruleMatchesOrder(
  rule: Pick<PointsRule, "status" | "mainConditions" | "itemConditions">,
  context: {
    tierName: string;
    dayOfWeek: string;
    orderMenuItemIds: string[];
  },
): boolean {
  if (rule.status !== "active") return false;

  if (rule.mainConditions.length > 0) {
    const allMain = rule.mainConditions.every((c) => matchesCondition(c, context));
    if (!allMain) return false;
  }

  if (rule.itemConditions.length > 0) {
    const ids = new Set(rule.itemConditions.map((i) => i.menuItemId));
    const hasItem = context.orderMenuItemIds.some((id) => ids.has(id));
    if (!hasItem) return false;
  }

  return true;
}

export function bestPointsMultiplier(
  rules: PointsRule[],
  context: {
    tierName: string;
    dayOfWeek: string;
    orderMenuItemIds: string[];
  },
  baseMultiplier: number,
): number {
  let best = baseMultiplier;
  for (const rule of rules) {
    if (!ruleMatchesOrder(rule, context)) continue;
    best = Math.max(best, rule.pointsMultiplier);
  }
  return best;
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * Weekday id for Bonus Days rules, in the merchant's calendar (not the server's).
 * Default Asia/Kuala_Lumpur — MY/SG cafes; Monday 1am MY must not read as Sunday UTC.
 */
export function dayOfWeekId(
  date: Date = new Date(),
  timeZone = "Asia/Kuala_Lumpur",
): string {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
    })
      .format(date)
      .toLowerCase();
    if ((WEEKDAYS as readonly string[]).includes(weekday)) return weekday;
  } catch {
    // Invalid IANA zone — fall through.
  }
  return WEEKDAYS[date.getDay()];
}

export function parsePointsRuleRow(row: {
  id: string;
  name: string;
  status: string;
  points_multiplier: number;
  main_conditions: unknown;
  item_conditions: unknown;
  sort_order: number;
}): PointsRule {
  return {
    id: row.id,
    name: row.name,
    status: row.status as "active" | "inactive",
    pointsMultiplier: Number(row.points_multiplier),
    mainConditions: (row.main_conditions ?? []) as PointsRuleCondition[],
    itemConditions: (row.item_conditions ?? []) as PointsRuleItemCondition[],
    sortOrder: row.sort_order,
  };
}

export function formatConditionDisplay(
  condition: PointsRuleCondition,
  tiers: { name: string }[] = [],
): string {
  const field = CONDITION_FIELDS.find((f) => f.id === condition.field)?.label ?? condition.field;
  const op =
    CONDITION_OPERATORS.find((o) => o.id === condition.operator)?.label ?? condition.operator;
  const valueLabel =
    conditionValueOptions(condition.field, tiers).find(
      (o) => o.id === condition.value.toLowerCase(),
    )?.label ?? condition.value;
  return `${field} ${op} ${valueLabel}`;
}

export function summarizePointsRule(
  rule: Pick<
    PointsRule,
    "pointsMultiplier" | "mainConditions" | "itemConditions" | "status"
  >,
  tiers: { name: string }[] = [],
): string {
  if (rule.status !== "active") return "Off — not giving bonus points";

  const bits: string[] = [`${formatMultiplier(rule.pointsMultiplier)}× points`];

  if (rule.mainConditions.length === 0 && rule.itemConditions.length === 0) {
    bits.push("every day");
  } else {
    for (const c of rule.mainConditions) {
      bits.push(formatConditionDisplay(c, tiers));
    }
    if (rule.itemConditions.length > 0) {
      bits.push(`includes ${rule.itemConditions.map((i) => i.name).join(", ")}`);
    }
  }

  return bits.join(" · ");
}

/** Cafe-owner story: "On Mondays, members collect double points (2×)." */
export function bonusDayPlainStory(
  rule: Pick<PointsRule, "pointsMultiplier" | "mainConditions" | "itemConditions" | "status" | "name">,
): string {
  if (rule.status !== "active") {
    return `“${rule.name}” is off — members only get their normal collecting speed.`;
  }

  const day = rule.mainConditions.find((c) => c.field === "day_of_week" && c.operator === "is");
  const dayLabel = day
    ? DAYS_OF_WEEK.find((d) => d.id === day.value.toLowerCase())?.label ?? day.value
    : null;
  const mult = formatMultiplier(rule.pointsMultiplier);
  const howFast =
    Math.abs(rule.pointsMultiplier - 2) < 0.001
      ? "double points"
      : Math.abs(rule.pointsMultiplier - 3) < 0.001
        ? "triple points"
        : `${mult}× points`;

  if (dayLabel) {
    return `On ${dayLabel}s, members collect ${howFast} (${mult}×).`;
  }
  if (rule.mainConditions.length === 0 && rule.itemConditions.length === 0) {
    return `Members collect ${howFast} (${mult}×) on every order while this is on.`;
  }
  return `When the conditions match, members collect ${howFast} (${mult}×).`;
}

export function getBonusDayId(
  rule: Pick<PointsRule, "mainConditions">,
): string | null {
  const day = rule.mainConditions.find((c) => c.field === "day_of_week" && c.operator === "is");
  return day?.value.toLowerCase() ?? null;
}

/** Set or replace the primary “day of week is X” condition; keep other conditions. */
export function withBonusDay(
  rule: Pick<PointsRule, "mainConditions">,
  dayId: string,
): PointsRuleCondition[] {
  const others = rule.mainConditions.filter((c) => c.field !== "day_of_week");
  return [...others, { field: "day_of_week", operator: "is", value: dayId }];
}

export function tierNameFromLevels(
  lifetimePoints: number,
  levels: RewardLevelRow[],
): string {
  const sorted = [...levels].sort(
    (a, b) => b.min_lifetime_points - a.min_lifetime_points,
  );
  const match = sorted.find((l) => lifetimePoints >= l.min_lifetime_points);
  return match?.name ?? levels[0]?.name ?? "Starter";
}
