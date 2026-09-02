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

export function dayOfWeekId(date = new Date()): string {
  return [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][date.getDay()];
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
  if (rule.status !== "active") return "Inactive";

  const bits: string[] = [`${formatMultiplier(rule.pointsMultiplier)}× points`];

  if (rule.mainConditions.length === 0 && rule.itemConditions.length === 0) {
    bits.push("all orders");
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
