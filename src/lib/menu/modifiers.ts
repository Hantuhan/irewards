export type ModifierOption = {
  id: string;
  name: string;
  /** Helper copy under the option name on the product detail page. */
  description?: string | null;
  priceDeltaCents: number;
  maxQuantity?: number;
  isDefault?: boolean;
};

export type ModifierGroup = {
  id: string;
  name: string;
  /** Helper copy under the group title on the product detail page. */
  description?: string | null;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
};

export type CartModifierSelection = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDeltaCents: number;
  quantity: number;
};

export type CartLinePayload = {
  id: string;
  quantity: number;
  selections?: { groupId: string; optionId: string; quantity?: number }[];
  packedForTakeaway?: boolean;
  /** Diner's kitchen / barista note for this line. */
  note?: string;
};

export const MAX_LINE_NOTE_LENGTH = 160;

export function normalizeLineNote(note: string | null | undefined): string | undefined {
  const trimmed = (note ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LINE_NOTE_LENGTH);
  return trimmed || undefined;
}

export function defaultSelections(groups: ModifierGroup[]): CartModifierSelection[] {
  const selections: CartModifierSelection[] = [];
  for (const group of groups) {
    const defaults = group.options.filter((o) => o.isDefault);
    const picked =
      defaults.length > 0
        ? defaults.slice(0, group.maxSelect)
        : group.required && group.options[0]
          ? [group.options[0]]
          : [];
    for (const option of picked) {
      selections.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceDeltaCents: option.priceDeltaCents,
        quantity: 1,
      });
    }
  }
  return selections;
}

export function unitPriceWithModifiers(basePriceCents: number, selections: CartModifierSelection[]) {
  const delta = selections.reduce(
    (sum, s) => sum + s.priceDeltaCents * Math.max(1, s.quantity ?? 1),
    0,
  );
  return Math.max(0, basePriceCents + delta);
}

export function formatModifierLabel(selections: CartModifierSelection[]): string {
  if (selections.length === 0) return "";
  return selections
    .map((s) => {
      const qty = s.quantity ?? 1;
      return qty > 1 ? `${s.optionName} ×${qty}` : s.optionName;
    })
    .join(", ");
}

export function displayLineName(itemName: string, selections: CartModifierSelection[]): string {
  const mods = formatModifierLabel(selections);
  return mods ? `${itemName} (${mods})` : itemName;
}

export function cartLineKey(
  itemId: string,
  selections: CartModifierSelection[],
  note?: string | null,
): string {
  const part = selections
    .map((s) => `${s.optionId}:${s.quantity ?? 1}`)
    .sort()
    .join(",");
  const noteKey = normalizeLineNote(note);
  return noteKey ? `${itemId}::${part}::${noteKey}` : `${itemId}::${part}`;
}

export function validateSelections(
  groups: ModifierGroup[],
  raw: { groupId: string; optionId: string; quantity?: number }[],
): { ok: true; selections: CartModifierSelection[] } | { ok: false; error: string } {
  const byGroup = new Map<string, { groupId: string; optionId: string; quantity?: number }[]>();
  for (const sel of raw) {
    const list = byGroup.get(sel.groupId) ?? [];
    list.push(sel);
    byGroup.set(sel.groupId, list);
  }

  const selections: CartModifierSelection[] = [];

  for (const group of groups) {
    const picks = byGroup.get(group.id) ?? [];
    if (group.required && picks.length < Math.max(1, group.minSelect)) {
      return { ok: false, error: `Choose an option for ${group.name}` };
    }
    if (picks.length > group.maxSelect) {
      return { ok: false, error: `Too many options for ${group.name}` };
    }
    for (const pick of picks) {
      const option = group.options.find((o) => o.id === pick.optionId);
      if (!option) {
        return { ok: false, error: `Invalid option for ${group.name}` };
      }
      const maxQty = option.maxQuantity ?? 1;
      const quantity = Math.min(Math.max(1, pick.quantity ?? 1), maxQty);
      selections.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceDeltaCents: option.priceDeltaCents,
        quantity,
      });
    }
    byGroup.delete(group.id);
  }

  if (byGroup.size > 0) {
    return { ok: false, error: "Invalid modifier selection" };
  }

  return { ok: true, selections };
}

export function formatPriceDelta(cents: number, currency = "RM"): string {
  if (cents === 0) return "";
  const amount = Math.abs(cents / 100).toFixed(2);
  return cents > 0 ? `+${currency} ${amount}` : `−${currency} ${amount}`;
}
