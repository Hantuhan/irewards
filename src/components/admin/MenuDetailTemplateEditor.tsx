"use client";

import { Icon } from "@/components/ui/Icon";
import { MAX_DETAIL_STATS, type MenuItemDetail } from "@/lib/menu/detail";

type MenuDetailTemplateEditorProps = {
  value: MenuItemDetail;
  onChange: (next: MenuItemDetail) => void;
  /** Category label used as the eyebrow fallback. */
  categoryLabel?: string | null;
  /** Current kcal input — shown as the auto-filled Energy stat. */
  kcal?: string;
};

const LABEL = "mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant";
const INPUT =
  "w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-[13px] focus:border-primary focus:outline-none";

/** Merchant editor for the storefront product-detail template slots. */
export function MenuDetailTemplateEditor({
  value,
  onChange,
  categoryLabel,
  kcal,
}: MenuDetailTemplateEditorProps) {
  function patch(next: Partial<MenuItemDetail>) {
    onChange({ ...value, ...next });
  }

  function updateStat(index: number, field: "label" | "value", text: string) {
    const stats = value.stats.map((s, i) => (i === index ? { ...s, [field]: text } : s));
    patch({ stats });
  }

  function addStat() {
    if (value.stats.length >= MAX_DETAIL_STATS) return;
    patch({ stats: [...value.stats, { label: "", value: "" }] });
  }

  function removeStat(index: number) {
    patch({ stats: value.stats.filter((_, i) => i !== index) });
  }

  const energyAuto = kcal?.trim() ? `${kcal.trim()} kcal` : null;
  const showEnergyHint =
    energyAuto &&
    value.stats.length < MAX_DETAIL_STATS &&
    !value.stats.some((s) => /kcal|energy|calories/i.test(`${s.label} ${s.value}`));

  return (
    <div className="flex flex-col gap-4">
      <label>
        <span className={LABEL}>Category line (eyebrow)</span>
        <input
          value={value.eyebrow}
          maxLength={60}
          onChange={(e) => patch({ eyebrow: e.target.value })}
          placeholder={categoryLabel ? `Defaults to “${categoryLabel}”` : "e.g. Viennoiserie Classique"}
          className={INPUT}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <label>
          <span className={LABEL}>Hero caption</span>
          <input
            value={value.heroNote}
            maxLength={80}
            onChange={(e) => patch({ heroNote: e.target.value })}
            placeholder="e.g. Baked fresh daily at 07:30"
            className={INPUT}
          />
        </label>
        <label>
          <span className={LABEL}>Caption right</span>
          <input
            value={value.heroNoteRight}
            maxLength={40}
            onChange={(e) => patch({ heroNoteRight: e.target.value })}
            placeholder="e.g. Batch No. #042"
            className={INPUT}
          />
        </label>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className={`${LABEL} mb-0`}>
            Spec stats <span className="normal-case text-outline">(max {MAX_DETAIL_STATS})</span>
          </span>
          <button
            type="button"
            onClick={addStat}
            disabled={value.stats.length >= MAX_DETAIL_STATS}
            className="flex items-center gap-1 font-mono text-[11px] text-primary disabled:opacity-40"
          >
            <Icon name="add" className="text-base" />
            Add stat
          </button>
        </div>
        {value.stats.length === 0 ? (
          <p className="border border-dashed border-surface-container-highest p-3 text-[12px] text-on-surface-variant">
            e.g. Prep time · 10–12 mins, Serving · 8 oz, Origin · Basque Country.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {value.stats.map((stat, index) => (
              <div key={index} className="grid grid-cols-[1fr_1.3fr_32px] items-center gap-2">
                <input
                  value={stat.label}
                  maxLength={40}
                  onChange={(e) => updateStat(index, "label", e.target.value)}
                  placeholder="Label (e.g. Prep time)"
                  className={INPUT}
                />
                <input
                  value={stat.value}
                  maxLength={60}
                  onChange={(e) => updateStat(index, "value", e.target.value)}
                  placeholder="Value (e.g. 10–12 mins)"
                  className={`${INPUT} font-mono`}
                />
                <button
                  type="button"
                  onClick={() => removeStat(index)}
                  aria-label="Remove stat"
                  className="justify-self-end text-on-surface-variant hover:text-primary"
                >
                  <Icon name="delete" />
                </button>
              </div>
            ))}
          </div>
        )}
        {showEnergyHint ? (
          <p className="mt-1.5 font-mono text-[10px] text-on-surface-variant">
            Energy · {energyAuto} is added automatically from the nutrition field.
          </p>
        ) : null}
      </div>

      <label>
        <span className={LABEL}>Kitchen-note prompt</span>
        <input
          value={value.notesPlaceholder}
          maxLength={160}
          onChange={(e) => patch({ notesPlaceholder: e.target.value })}
          placeholder="e.g. Special request (cut in half, separate bag, allergy alert)…"
          className={INPUT}
        />
      </label>
    </div>
  );
}
