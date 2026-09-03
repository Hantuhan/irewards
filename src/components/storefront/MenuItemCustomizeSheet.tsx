"use client";

import { useMemo, useState } from "react";
import {
  defaultSelections,
  formatPriceDelta,
  type CartModifierSelection,
  unitPriceWithModifiers,
} from "@/lib/menu/modifiers";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";
import { Icon } from "@/components/ui/Icon";

type MenuItemCustomizeSheetProps = {
  item: StorefrontMenuItem;
  currency?: string;
  onClose: () => void;
  onConfirm: (selections: CartModifierSelection[]) => void;
};

type OptionQuantities = Record<string, Record<string, number>>;

function buildInitialQuantities(groups: StorefrontMenuItem["modifierGroups"]): OptionQuantities {
  const initial: OptionQuantities = {};
  for (const sel of defaultSelections(groups ?? [])) {
    const groupMap = initial[sel.groupId] ?? {};
    groupMap[sel.optionId] = sel.quantity;
    initial[sel.groupId] = groupMap;
  }
  return initial;
}

export function MenuItemCustomizeSheet({
  item,
  currency = "RM",
  onClose,
  onConfirm,
}: MenuItemCustomizeSheetProps) {
  const groups = useMemo(() => item.modifierGroups ?? [], [item.modifierGroups]);
  const [optionQty, setOptionQty] = useState<OptionQuantities>(() =>
    buildInitialQuantities(groups),
  );

  const selections = useMemo(() => {
    const result: CartModifierSelection[] = [];
    for (const group of groups) {
      const qtyByOption = optionQty[group.id] ?? {};
      for (const [optionId, quantity] of Object.entries(qtyByOption)) {
        if (quantity <= 0) continue;
        const option = group.options.find((o) => o.id === optionId);
        if (!option) continue;
        const maxQty = option.maxQuantity ?? 1;
        result.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDeltaCents: option.priceDeltaCents,
          quantity: Math.min(quantity, maxQty),
        });
      }
    }
    return result;
  }, [groups, optionQty]);

  const unitPrice = unitPriceWithModifiers(item.priceCents, selections);

  function setOptionQuantity(groupId: string, optionId: string, quantity: number, maxSelect: number) {
    setOptionQty((prev) => {
      const groupMap = { ...(prev[groupId] ?? {}) };
      if (maxSelect === 1) {
        const cleared: Record<string, number> = {};
        if (quantity > 0) cleared[optionId] = quantity;
        return { ...prev, [groupId]: cleared };
      }
      if (quantity <= 0) {
        delete groupMap[optionId];
      } else {
        groupMap[optionId] = quantity;
      }
      const activeCount = Object.values(groupMap).filter((q) => q > 0).length;
      if (activeCount > maxSelect) return prev;
      return { ...prev, [groupId]: groupMap };
    });
  }

  function toggleOption(
    groupId: string,
    optionId: string,
    maxSelect: number,
    maxQuantity: number,
  ) {
    const current = optionQty[groupId]?.[optionId] ?? 0;
    if (current > 0) {
      setOptionQuantity(groupId, optionId, 0, maxSelect);
    } else {
      setOptionQuantity(groupId, optionId, 1, maxSelect);
    }
    void maxQuantity;
  }

  function adjustOptionQty(
    groupId: string,
    optionId: string,
    delta: number,
    maxSelect: number,
    maxQuantity: number,
  ) {
    const current = optionQty[groupId]?.[optionId] ?? 0;
    setOptionQuantity(groupId, optionId, Math.min(maxQuantity, Math.max(0, current + delta)), maxSelect);
  }

  function handleConfirm() {
    for (const group of groups) {
      const active = Object.values(optionQty[group.id] ?? {}).filter((q) => q > 0).length;
      if (group.required && active < Math.max(1, group.minSelect)) return;
      if (active > group.maxSelect) return;
    }
    onConfirm(selections);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-[382px] flex-col overflow-hidden bg-surface shadow-2xl sm:rounded-lg">
        <div className="relative h-[min(140px,20vh)] w-full shrink-0 overflow-hidden bg-surface-container-low">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Icon name="restaurant" className="text-4xl text-on-surface-variant opacity-30" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 shadow-sm"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <h2 className="font-display text-headline-md text-primary">{item.name}</h2>
          {item.description && (
            <p className="mt-1.5 text-body-md text-on-surface-variant">{item.description}</p>
          )}
          <p className="mt-2 font-mono text-label-mono text-primary">
            {currency} {(unitPrice / 100).toFixed(2)}
          </p>

          {groups.map((group) => (
            <div key={group.id} className="mt-6">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                  {group.name}
                  {group.required && <span className="text-primary"> *</span>}
                </p>
                {group.maxSelect > 1 && (
                  <span className="font-mono text-[10px] text-on-surface-variant">
                    Up to {group.maxSelect}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {group.options.map((option) => {
                  const qty = optionQty[group.id]?.[option.id] ?? 0;
                  const selected = qty > 0;
                  const maxQty = option.maxQuantity ?? 1;
                  const unitDelta = formatPriceDelta(option.priceDeltaCents, currency);
                  const lineDelta =
                    qty > 1 && option.priceDeltaCents > 0
                      ? formatPriceDelta(option.priceDeltaCents * qty, currency)
                      : unitDelta;

                  return (
                    <div
                      key={option.id}
                      className={`border transition-colors ${
                        selected
                          ? "border-primary bg-primary text-on-primary"
                          : "border-surface-container-highest"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleOption(group.id, option.id, group.maxSelect, maxQty)
                        }
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-body-md text-on-surface">{option.name}</span>
                        <span className="shrink-0 font-mono text-label-mono text-on-surface-variant">
                          {lineDelta || (selected ? "✓" : "")}
                        </span>
                      </button>
                      {selected && maxQty > 1 && (
                        <div className="flex items-center justify-between border-t border-surface-container-highest px-4 py-2">
                          <span className="text-body-md text-on-surface-variant">Qty</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                adjustOptionQty(group.id, option.id, -1, group.maxSelect, maxQty)
                              }
                              className="flex h-8 w-8 items-center justify-center border border-surface-container-highest"
                            >
                              <Icon name="remove" />
                            </button>
                            <span className="w-6 text-center font-mono text-label-mono">{qty}</span>
                            <button
                              type="button"
                              onClick={() =>
                                adjustOptionQty(group.id, option.id, 1, group.maxSelect, maxQty)
                              }
                              disabled={qty >= maxQty}
                              className="flex h-8 w-8 items-center justify-center border border-surface-container-highest disabled:opacity-40"
                            >
                              <Icon name="add" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-surface-container-highest p-4">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex w-full items-center justify-center gap-2 bg-primary py-3.5 font-display text-eyebrow uppercase text-on-primary"
          >
            <Icon name="add" />
            Add to order · {currency} {(unitPrice / 100).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
