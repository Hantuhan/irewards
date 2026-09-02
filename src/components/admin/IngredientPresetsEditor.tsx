"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  DEFAULT_MENU_INGREDIENT_PRESETS,
  INGREDIENT_GROUP_OPTIONS,
  slugifyIngredientId,
  type MenuIngredientPreset,
} from "@/lib/menu/menu-ingredients";

type IngredientPresetsEditorProps = {
  presets: MenuIngredientPreset[];
  onChange: (presets: MenuIngredientPreset[]) => void;
};

export function IngredientPresetsEditor({ presets, onChange }: IngredientPresetsEditorProps) {
  const [newLabel, setNewLabel] = useState("");
  const [newGroup, setNewGroup] = useState<string>("Other");

  function updatePreset(id: string, patch: Partial<MenuIngredientPreset>) {
    onChange(presets.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePreset(id: string) {
    onChange(presets.filter((p) => p.id !== id));
  }

  function addPreset() {
    const label = newLabel.trim();
    if (!label) return;
    onChange([
      ...presets,
      { id: slugifyIngredientId(label), label, group: newGroup || "Other" },
    ]);
    setNewLabel("");
  }

  return (
    <section>
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/20 bg-surface-container-low">
          <Icon name="grocery" className="text-xl text-primary" />
        </div>
        <div>
          <h2 className="font-display text-headline-sm text-primary">Ingredient library</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Build your ingredient list once, then pick from it on each product. Diners see
            ingredients on the menu item detail sheet.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {presets.map((preset) => (
          <li
            key={preset.id}
            className="grid gap-3 border border-surface-container-highest p-4 sm:grid-cols-[1fr_160px_auto]"
          >
            <label className="block">
              <span className="mb-1 block font-mono text-label-mono text-on-surface-variant">
                Ingredient
              </span>
              <input
                value={preset.label}
                onChange={(e) => updatePreset(preset.id, { label: e.target.value })}
                className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-label-mono text-on-surface-variant">
                Group
              </span>
              <select
                value={preset.group}
                onChange={(e) => updatePreset(preset.id, { group: e.target.value })}
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-2 py-2"
              >
                {INGREDIENT_GROUP_OPTIONS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={() => removePreset(preset.id)}
                className="inline-flex items-center gap-1 border border-red-200 px-3 py-2 text-body-md text-red-700 hover:bg-red-50"
              >
                <Icon name="delete" className="text-[18px]" />
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-surface-container-highest pt-4">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block font-mono text-label-mono text-on-surface-variant">
            New ingredient
          </span>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Almond milk"
            className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
          />
        </label>
        <label className="w-40">
          <span className="mb-1 block font-mono text-label-mono text-on-surface-variant">
            Group
          </span>
          <select
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            className="w-full border border-surface-container-highest bg-surface-container-lowest px-2 py-2"
          >
            {INGREDIENT_GROUP_OPTIONS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={addPreset}
          disabled={!newLabel.trim()}
          className="border border-primary px-4 py-2 text-primary disabled:opacity-50"
        >
          Add ingredient
        </button>
        <button
          type="button"
          onClick={() => onChange([...DEFAULT_MENU_INGREDIENT_PRESETS])}
          className="border border-surface-container-highest px-4 py-2 text-on-surface-variant"
        >
          Reset defaults
        </button>
      </div>
    </section>
  );
}
