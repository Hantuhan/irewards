import { createInsforgeAdmin } from "@/lib/insforge/client";
import type { PointsRule } from "@/lib/loyalty/points-rules";
import { parsePointsRuleRow } from "@/lib/loyalty/points-rules";

function db() {
  return createInsforgeAdmin().database;
}

export async function listPointsRules(merchantId: string): Promise<PointsRule[]> {
  const { data, error } = await db()
    .from("points_rules")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(parsePointsRuleRow);
}

export async function createPointsRule(
  merchantId: string,
  input: Omit<PointsRule, "id" | "sortOrder"> & { sortOrder?: number },
): Promise<PointsRule> {
  const { data, error } = await db()
    .from("points_rules")
    .insert({
      merchant_id: merchantId,
      name: input.name,
      status: input.status,
      points_multiplier: input.pointsMultiplier,
      main_conditions: input.mainConditions,
      item_conditions: input.itemConditions,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return parsePointsRuleRow(data);
}

export async function updatePointsRule(
  merchantId: string,
  ruleId: string,
  input: Partial<Omit<PointsRule, "id">>,
): Promise<PointsRule> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.status !== undefined) patch.status = input.status;
  if (input.pointsMultiplier !== undefined) patch.points_multiplier = input.pointsMultiplier;
  if (input.mainConditions !== undefined) patch.main_conditions = input.mainConditions;
  if (input.itemConditions !== undefined) patch.item_conditions = input.itemConditions;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  const { data, error } = await db()
    .from("points_rules")
    .update(patch)
    .eq("id", ruleId)
    .eq("merchant_id", merchantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return parsePointsRuleRow(data);
}

export async function deletePointsRule(merchantId: string, ruleId: string): Promise<void> {
  const { error } = await db()
    .from("points_rules")
    .delete()
    .eq("id", ruleId)
    .eq("merchant_id", merchantId);

  if (error) throw new Error(error.message);
}
