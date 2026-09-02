"use client";

import { Icon } from "@/components/ui/Icon";
import type { ModifierGroupInput } from "@/lib/db/modifiers-repository";
import { currencyDisplayCode, type MerchantCurrency } from "@/lib/merchant/currency";
import { formatPriceDelta } from "@/lib/menu/modifiers";

type MenuModifierEditorProps = {
  groups: ModifierGroupInput[];
  onChange: (groups: ModifierGroupInput[]) => void;
  hideHeader?: boolean;
  currency?: MerchantCurrency;
};

function newGroup(): ModifierGroupInput {
  return {
    name: "Add-on",
    required: false,
    minSelect: 0,
    maxSelect: 1,
    options: [
      { name: "Standard", priceDeltaCents: 0, maxQuantity: 1, isDefault: true },
      { name: "No onion", priceDeltaCents: 0, maxQuantity: 1 },
    ],
  };
}

export function MenuModifierEditor({
  groups,
  onChange,
  hideHeader,
  currency = "MYR",
}: MenuModifierEditorProps) {
  const currencyCode = currencyDisplayCode(currency);

  function updateGroup(index: number, patch: Partial<ModifierGroupInput>) {
    const next = groups.map((g, i) => (i === index ? { ...g, ...patch } : g));
    onChange(next);
  }

  function updateOption(
    groupIndex: number,
    optionIndex: number,
    patch: Partial<ModifierGroupInput["options"][number]>,
  ) {
    const next = groups.map((g, gi) => {
      if (gi !== groupIndex) return g;
      return {
        ...g,
        options: g.options.map((o, oi) => (oi === optionIndex ? { ...o, ...patch } : o)),
      };
    });
    onChange(next);
  }

  function addOption(groupIndex: number) {
    const next = groups.map((g, gi) =>
      gi === groupIndex
        ? {
            ...g,
            options: [...g.options, { name: "New option", priceDeltaCents: 0, maxQuantity: 1 }],
          }
        : g,
    );
    onChange(next);
  }

  function removeOption(groupIndex: number, optionIndex: number) {
    const next = groups.map((g, gi) => {
      if (gi !== groupIndex) return g;
      return { ...g, options: g.options.filter((_, oi) => oi !== optionIndex) };
    });
    onChange(next);
  }

  return (
    <div className={hideHeader ? "" : "sm:col-span-2"}>
      {!hideHeader && (
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Customisations & add-ons
          </p>
          <button
            type="button"
            onClick={() => onChange([...groups, newGroup()])}
            className="flex items-center gap-1 font-mono text-label-mono text-primary"
          >
            <Icon name="add" className="text-base" />
            Add group
          </button>
        </div>
      )}
      {hideHeader && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => onChange([...groups, newGroup()])}
            className="flex items-center gap-1 font-mono text-label-mono text-primary"
          >
            <Icon name="add" className="text-base" />
            Add group
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="border border-dashed border-surface-container-highest p-4 text-body-md text-on-surface-variant">
          Let diners customise this item — e.g. onion / no onion, extra cheese (+{currencyCode} 2.00).
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group, gi) => (
            <div key={gi} className="border border-surface-container-highest bg-surface-container-lowest p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-[11px] uppercase text-on-surface-variant">
                    Group name
                  </span>
                  <input
                    value={group.name}
                    onChange={(e) => updateGroup(gi, { name: e.target.value })}
                    placeholder="e.g. Onion, Size, Extras"
                    className="w-full border border-surface-container-highest px-3 py-2"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={group.required ?? false}
                    onChange={(e) =>
                      updateGroup(gi, {
                        required: e.target.checked,
                        minSelect: e.target.checked ? 1 : 0,
                      })
                    }
                  />
                  <span className="text-body-md">Required choice</span>
                </label>
                <label>
                  <span className="mb-1 block text-[11px] uppercase text-on-surface-variant">
                    Max selections
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={group.maxSelect ?? 1}
                    onChange={(e) => updateGroup(gi, { maxSelect: Number(e.target.value) })}
                    className="w-full border border-surface-container-highest px-3 py-2"
                  />
                </label>
              </div>

              <div className="mb-2 hidden gap-2 px-1 sm:grid sm:grid-cols-[1fr_80px_120px_72px_32px]">
                <span className="font-mono text-[10px] uppercase text-on-surface-variant">Option</span>
                <span className="font-mono text-[10px] uppercase text-on-surface-variant">Max qty</span>
                <span className="font-mono text-[10px] uppercase text-on-surface-variant">
                  Add-on price ({currencyCode})
                </span>
                <span className="font-mono text-[10px] uppercase text-on-surface-variant">Default</span>
                <span />
              </div>

              <div className="flex flex-col gap-2">
                {group.options.map((option, oi) => (
                  <div
                    key={oi}
                    className="grid gap-2 border border-surface-container-highest bg-surface-container-low p-2 sm:grid-cols-[1fr_80px_120px_72px_32px] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
                  >
                    <input
                      value={option.name}
                      onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                      placeholder="Option name"
                      className="border border-surface-container-highest px-3 py-2"
                    />
                    <label className="flex flex-col gap-1 sm:contents">
                      <span className="font-mono text-[10px] uppercase text-on-surface-variant sm:hidden">
                        Max qty
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={option.maxQuantity ?? 1}
                        onChange={(e) =>
                          updateOption(gi, oi, {
                            maxQuantity: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="border border-surface-container-highest px-3 py-2 font-mono"
                      />
                    </label>
                    <label className="flex flex-col gap-1 sm:contents">
                      <span className="font-mono text-[10px] uppercase text-on-surface-variant sm:hidden">
                        Add-on price ({currencyCode})
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={((option.priceDeltaCents ?? 0) / 100).toFixed(2)}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          if (!Number.isFinite(raw) || raw < 0) return;
                          updateOption(gi, oi, { priceDeltaCents: Math.round(raw * 100) });
                        }}
                        placeholder="0.00"
                        className="border border-surface-container-highest px-3 py-2 font-mono"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-body-md sm:justify-center">
                      <input
                        type="checkbox"
                        checked={option.isDefault ?? false}
                        onChange={(e) => updateOption(gi, oi, { isDefault: e.target.checked })}
                      />
                      <span className="sm:hidden">Default</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeOption(gi, oi)}
                      className="justify-self-end text-on-surface-variant hover:text-primary"
                      aria-label="Remove option"
                    >
                      <Icon name="delete" />
                    </button>
                    {(option.priceDeltaCents ?? 0) > 0 && (
                      <p className="col-span-full font-mono text-[10px] text-on-surface-variant sm:col-span-1 sm:col-start-3">
                        {formatPriceDelta(option.priceDeltaCents ?? 0, currencyCode)}
                        {(option.maxQuantity ?? 1) > 1
                          ? ` · up to ${option.maxQuantity} per order`
                          : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addOption(gi)}
                className="mt-2 font-mono text-label-mono text-primary"
              >
                + Add option
              </button>
              <button
                type="button"
                onClick={() => onChange(groups.filter((_, i) => i !== gi))}
                className="mt-3 block font-mono text-label-mono text-on-surface-variant underline"
              >
                Remove group
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
