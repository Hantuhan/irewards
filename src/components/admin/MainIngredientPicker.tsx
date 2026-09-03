"use client";

import { Icon } from "@/components/ui/Icon";
import {
  MAIN_INGREDIENTS,
  MAIN_INGREDIENT_MAX,
  toggleMainIngredientId,
  type MainIngredientId,
} from "@/lib/menu/main-ingredients";

type MainIngredientPickerProps = {
  selected: MainIngredientId[];
  onChange: (ids: MainIngredientId[]) => void;
  suggesting?: boolean;
  hint?: string | null;
  onSuggest?: () => void;
  /** Hide AI button (e.g. drinks) */
  showSuggest?: boolean;
  /** Hide title when wrapped in an EditorCard. */
  compact?: boolean;
};

export function MainIngredientPicker({
  selected,
  onChange,
  suggesting = false,
  hint = null,
  onSuggest,
  showSuggest = true,
  compact = false,
}: MainIngredientPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      {!compact ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              Main ingredient
            </p>
            <p className="mt-0.5 text-[12px] text-on-surface-variant">
              Cafe-menu style — chicken, fish, veggie. Pick up to {MAIN_INGREDIENT_MAX}, or let AI
              suggest from the name.
            </p>
          </div>
          {showSuggest && onSuggest ? (
            <button
              type="button"
              onClick={onSuggest}
              disabled={suggesting}
              className="inline-flex items-center gap-1 border border-primary px-3 py-1.5 font-mono text-label-mono text-primary disabled:opacity-50"
            >
              <Icon name="auto_awesome" className="text-sm" />
              {suggesting ? "Suggesting…" : "AI suggest"}
            </button>
          ) : null}
        </div>
      ) : showSuggest && onSuggest ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSuggest}
            disabled={suggesting}
            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-primary underline disabled:opacity-50"
          >
            <Icon name="auto_awesome" className="text-sm" />
            {suggesting ? "Suggesting…" : "AI suggest"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {MAIN_INGREDIENTS.map((item) => {
          const on = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(toggleMainIngredientId(selected, item.id))}
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-body-md transition-colors ${
                on
                  ? "border-primary bg-surface-container-low text-primary"
                  : "border-surface-container-highest text-on-surface-variant hover:border-primary/40"
              }`}
            >
              <Icon name={item.icon} className="text-base" filled={on} />
              {item.label}
              {on ? <Icon name="close" className="text-sm opacity-70" /> : null}
            </button>
          );
        })}
      </div>

      {hint ? (
        <p className="text-[12px] text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
}
