import { adminDb } from "@/lib/db/admin";
import type { ModifierGroup, ModifierOption } from "@/lib/menu/modifiers";

function db() {
  return adminDb();
}

type GroupRow = {
  id: string;
  menu_item_id: string;
  name: string;
  description?: string | null;
  required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
};

type OptionRow = {
  id: string;
  group_id: string;
  name: string;
  description?: string | null;
  price_delta_cents: number;
  is_default: boolean;
  sort_order: number;
  max_quantity?: number;
};

export type ModifierGroupInput = {
  id?: string;
  name: string;
  description?: string | null;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  sortOrder?: number;
  options: {
    id?: string;
    name: string;
    description?: string | null;
    priceDeltaCents?: number;
    maxQuantity?: number;
    isDefault?: boolean;
    sortOrder?: number;
  }[];
};

function mapGroup(group: GroupRow, options: OptionRow[]): ModifierGroup {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    required: group.required,
    minSelect: group.min_select,
    maxSelect: group.max_select,
    options: options
      .filter((o) => o.group_id === group.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(
        (o): ModifierOption => ({
          id: o.id,
          name: o.name,
          description: o.description ?? null,
          priceDeltaCents: o.price_delta_cents,
          maxQuantity: o.max_quantity ?? 1,
          isDefault: o.is_default,
        }),
      ),
  };
}

export async function listModifierGroupsByItemIds(
  itemIds: string[],
): Promise<Map<string, ModifierGroup[]>> {
  const result = new Map<string, ModifierGroup[]>();
  if (itemIds.length === 0) return result;

  const { data: groups, error: groupError } = await db()
    .from("menu_modifier_groups")
    .select("*")
    .in("menu_item_id", itemIds)
    .order("sort_order", { ascending: true });

  if (groupError) throw new Error(groupError.message);
  const groupRows = (groups ?? []) as GroupRow[];
  if (groupRows.length === 0) return result;

  const groupIds = groupRows.map((g) => g.id);
  const { data: options, error: optionError } = await db()
    .from("menu_modifier_options")
    .select("*")
    .in("group_id", groupIds)
    .order("sort_order", { ascending: true });

  if (optionError) throw new Error(optionError.message);
  const optionRows = (options ?? []) as OptionRow[];

  for (const group of groupRows) {
    const mapped = mapGroup(group, optionRows);
    const list = result.get(group.menu_item_id) ?? [];
    list.push(mapped);
    result.set(group.menu_item_id, list);
  }

  return result;
}

export async function replaceModifierGroups(
  menuItemId: string,
  groups: ModifierGroupInput[],
): Promise<void> {
  const { data: existing, error: listError } = await db()
    .from("menu_modifier_groups")
    .select("id")
    .eq("menu_item_id", menuItemId);

  if (listError) throw new Error(listError.message);

  const existingIds = ((existing ?? []) as { id: string }[]).map((g) => g.id);
  if (existingIds.length > 0) {
    const { error: deleteOptionsError } = await db()
      .from("menu_modifier_options")
      .delete()
      .in("group_id", existingIds);
    if (deleteOptionsError) throw new Error(deleteOptionsError.message);

    const { error: deleteGroupsError } = await db()
      .from("menu_modifier_groups")
      .delete()
      .eq("menu_item_id", menuItemId);
    if (deleteGroupsError) throw new Error(deleteGroupsError.message);
  }

  for (const [gi, group] of groups.entries()) {
    const { data: insertedGroup, error: groupError } = await db()
      .from("menu_modifier_groups")
      .insert([
        {
          menu_item_id: menuItemId,
          name: group.name,
          description: group.description?.trim() || null,
          required: group.required ?? false,
          min_select: group.minSelect ?? (group.required ? 1 : 0),
          max_select: group.maxSelect ?? 1,
          sort_order: group.sortOrder ?? gi,
        },
      ])
      .select("*")
      .single();

    if (groupError) throw new Error(groupError.message);
    const groupId = (insertedGroup as GroupRow).id;

    if (group.options.length > 0) {
      const { error: optionError } = await db()
        .from("menu_modifier_options")
        .insert(
          group.options.map((option, oi) => ({
            group_id: groupId,
            name: option.name,
            description: option.description?.trim() || null,
            price_delta_cents: option.priceDeltaCents ?? 0,
            max_quantity: option.maxQuantity ?? 1,
            is_default: option.isDefault ?? false,
            sort_order: option.sortOrder ?? oi,
          })),
        );
      if (optionError) throw new Error(optionError.message);
    }
  }
}
