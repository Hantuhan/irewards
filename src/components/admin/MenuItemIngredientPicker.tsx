"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  groupIngredientPresets,
  ingredientConflictHint,
  ingredientGroupOptionsForDrinkProduct,
  ingredientGroupOptionsForNonCoffeeProduct,
  isIngredientOptionDisabled,
  toggleIngredientId,
  type MenuIngredientPreset,
} from "@/lib/menu/menu-ingredients";

type MenuItemIngredientPickerProps = {
  presets: MenuIngredientPreset[];
  selectedIds: string[];
  customIngredients: string;
  kcal: string;
  sugarG: string;
  notes: string;
  /** Drink = Coffee/Kopi/Teh/cold drinks; food = brunch/pastries/mains. */
  productKind?: "drink" | "food";
  /** Suggested kcal / fill status from auto-generate. */
  kcalHint?: string | null;
  generating?: boolean;
  onAutoGenerate?: () => void;
  /** Hide outer title when wrapped in ProductEditorShell card. */
  compact?: boolean;
  onSelectedIdsChange: (ids: string[]) => void;
  onCustomIngredientsChange: (value: string) => void;
  onKcalChange: (value: string) => void;
  onSugarGChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onAddPreset?: (label: string, group: string) => Promise<string | null>;
};

export function MenuItemIngredientPicker({
  presets,
  selectedIds,
  customIngredients,
  kcal,
  sugarG,
  notes,
  productKind = "food",
  kcalHint = null,
  generating = false,
  onAutoGenerate,
  compact = false,
  onSelectedIdsChange,
  onCustomIngredientsChange,
  onKcalChange,
  onSugarGChange,
  onNotesChange,
  onAddPreset,
}: MenuItemIngredientPickerProps) {
  const grouped = groupIngredientPresets(presets);
  const isDrink = productKind === "drink";
  const groupOptions = isDrink
    ? ingredientGroupOptionsForDrinkProduct()
    : ingredientGroupOptionsForNonCoffeeProduct();
  const [newLabel, setNewLabel] = useState("");
  const [newGroup, setNewGroup] = useState(isDrink ? "Allergens" : "Allergens");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function submitNewPreset() {
    const label = newLabel.trim();
    if (!label || !onAddPreset) return;
    setAdding(true);
    setAddError(null);
    try {
      const presetId = await onAddPreset(label, newGroup);
      if (presetId) {
        onSelectedIdsChange([...selectedIds, presetId]);
        setNewLabel("");
      }
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setAdding(false);
    }
  }

  function toggle(id: string) {
    if (isIngredientOptionDisabled(id, selectedIds)) return;
    onSelectedIdsChange(toggleIngredientId(selectedIds, id));
  }

  return (
    <div className="flex flex-col gap-5">
      {!compact ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              {isDrink ? "Allergens & dietary" : "Allergens & notes"}
            </p>
            <p className="mt-0.5 text-[12px] text-on-surface-variant">
              {isDrink
                ? "Shown on the diner menu. Milk / syrup choices belong under Extra add-ons above, not here."
                : "Allergens, dietary tags, and kitchen notes. Headline protein is under Main ingredient above."}
            </p>
          </div>
          {onAutoGenerate && (
            <button
              type="button"
              onClick={onAutoGenerate}
              disabled={generating}
              className="inline-flex shrink-0 items-center justify-center gap-2 border border-primary bg-primary px-4 py-2.5 text-on-primary transition-colors hover:bg-surface-tint disabled:opacity-50"
            >
              <Icon name="auto_awesome" className="text-[18px]" />
              <span className="font-display text-[13px] font-semibold">
                {generating ? "Generating…" : "Auto generate with AI"}
              </span>
            </button>
          )}
        </div>
      ) : onAutoGenerate ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onAutoGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-primary underline disabled:opacity-50"
          >
            <Icon name="auto_awesome" className="text-[14px]" />
            {generating ? "Generating…" : "Auto generate"}
          </button>
        </div>
      ) : null}

      {kcalHint ? (
        <p className="text-[12px] text-on-surface-variant">{kcalHint}</p>
      ) : null}

      {presets.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          {isDrink
            ? "No allergen or dietary chips yet — add Contains dairy, Halal, Vegan, etc. below."
            : "Add ingredients in Settings → Ingredients first."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([group, items]) => (
            <div key={group}>
              <p className="mb-2 font-mono text-label-mono text-on-surface-variant">{group}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((preset) => {
                  const selected = selectedIds.includes(preset.id);
                  const disabled = isIngredientOptionDisabled(preset.id, selectedIds);
                  const hint = ingredientConflictHint(preset.id, selectedIds);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => toggle(preset.id)}
                      disabled={disabled}
                      title={hint ?? undefined}
                      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-body-md transition-colors ${
                        selected
                          ? "border-primary bg-surface-container-low text-primary"
                          : disabled
                            ? "cursor-not-allowed border-surface-container-highest/60 text-on-surface-variant/40"
                            : "border-surface-container-highest text-on-surface-variant hover:border-primary/40"
                      }`}
                    >
                      {selected && <Icon name="check" className="text-sm" />}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {onAddPreset && (
        <div className="border border-dashed border-surface-container-highest bg-surface-container-low p-4">
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Save to library
          </p>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {isDrink
              ? "Add a disclosure once — e.g. Contains dairy, Halal."
              : "Add a chip once — reuse it on other food items."}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="min-w-[160px] flex-1">
              <span className="mb-1 block font-mono text-label-mono text-on-surface-variant">
                Label
              </span>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={isDrink ? "e.g. Contains soy" : "e.g. Sesame"}
                className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
              />
            </label>
            <label className="w-36">
              <span className="mb-1 block font-mono text-label-mono text-on-surface-variant">
                Group
              </span>
              <select
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-2 py-2"
              >
                {groupOptions.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={submitNewPreset}
              disabled={adding || !newLabel.trim()}
              className="inline-flex items-center gap-1 border border-primary px-4 py-2 text-primary disabled:opacity-50"
            >
              <Icon name="add" className="text-lg" />
              {adding ? "Saving…" : "Add to library"}
            </button>
          </div>
          {addError && <p className="mt-2 text-body-md text-red-700">{addError}</p>}
        </div>
      )}

      <label>
        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
          Custom ingredients (optional)
        </span>
        <textarea
          value={customIngredients}
          onChange={(e) => onCustomIngredientsChange(e.target.value)}
          placeholder={
            isDrink
              ? "e.g. house-made syrup, condensed milk"
              : "e.g. house sauce, seasonal garnish"
          }
          rows={2}
          className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md focus:border-primary focus:outline-none"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Energy (kcal)
          </span>
          <input
            type="number"
            min={0}
            value={kcal}
            onChange={(e) => onKcalChange(e.target.value)}
            placeholder="Auto-filled by AI"
            className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 font-mono focus:border-primary focus:outline-none"
          />
        </label>
        <label>
          <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Sugar (g)
          </span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={sugarG}
            onChange={(e) => onSugarGChange(e.target.value)}
            placeholder="Optional"
            className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 font-mono focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      <label>
        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
          Item notes
        </span>
        <input
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={isDrink ? "e.g. Best served iced" : "e.g. Contains sesame"}
          className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
        />
      </label>
    </div>
  );
}
