"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  CAFE_CATEGORY_PRESET_GROUPS,
  CAFE_CATEGORY_PRESETS,
  CAFE_CATEGORY_STARTER_SLUGS,
  type CafeCategoryPreset,
} from "@/lib/menu/cafe-category-presets";

type Category = { slug: string; label: string };

type MenuCategoryManagerProps = {
  categories: Category[];
  itemCountByCategory: Map<string, number>;
  saving: boolean;
  deletingSlug: string | null;
  onClose: () => void;
  onCreate: (categories: Array<{ slug?: string; label: string }>) => Promise<void>;
  onRemove: (category: Category) => void;
};

export function MenuCategoryManager({
  categories,
  itemCountByCategory,
  saving,
  deletingSlug,
  onClose,
  onCreate,
  onRemove,
}: MenuCategoryManagerProps) {
  const existingSlugs = useMemo(
    () => new Set(categories.map((c) => c.slug.toLowerCase())),
    [categories],
  );
  const existingLabels = useMemo(
    () => new Set(categories.map((c) => c.label.toLowerCase())),
    [categories],
  );

  const availablePresets = useMemo(
    () =>
      CAFE_CATEGORY_PRESETS.filter(
        (p) =>
          !existingSlugs.has(p.slug) && !existingLabels.has(p.label.toLowerCase()),
      ),
    [existingSlugs, existingLabels],
  );

  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(
    () => new Set(),
  );
  const [customLabel, setCustomLabel] = useState("");

  const selectedCategories = useMemo(
    () => availablePresets.filter((p) => selectedCategorySlugs.has(p.slug)),
    [availablePresets, selectedCategorySlugs],
  );

  function toggleCategory(preset: CafeCategoryPreset) {
    setSelectedCategorySlugs((prev) => {
      const next = new Set(prev);
      if (next.has(preset.slug)) next.delete(preset.slug);
      else next.add(preset.slug);
      return next;
    });
  }

  function applyStarterSections() {
    const starter = new Set<string>();
    for (const slug of CAFE_CATEGORY_STARTER_SLUGS) {
      if (availablePresets.some((p) => p.slug === slug)) starter.add(slug);
    }
    setSelectedCategorySlugs(starter);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const categoriesToCreate: Array<{ slug?: string; label: string }> = selectedCategories.map(
      (c) => ({ slug: c.slug, label: c.label }),
    );
    const custom = customLabel.trim();
    if (custom) categoriesToCreate.push({ label: custom });
    if (categoriesToCreate.length === 0) return;

    await onCreate(categoriesToCreate);
    setCustomLabel("");
    setSelectedCategorySlugs(new Set());
  }

  const sectionCount = selectedCategories.length + (customLabel.trim() ? 1 : 0);
  const canSubmit = sectionCount > 0 && !saving;

  return (
    <div className="mb-6 border border-surface-container-highest bg-surface-container-lowest p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-headline-sm text-primary">Categories</p>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Add or remove tabs. Then go back to the menu to add products.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex shrink-0 items-center gap-2 border border-[#1a3d2e] bg-[#1a3d2e] px-4 py-2.5 font-body-md text-white"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Back to menu
        </button>
      </div>

      {categories.length > 0 && (
        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            On your menu
          </p>
          <ul className="mt-3 divide-y divide-surface-container-highest border border-surface-container-highest">
            {categories.map((cat) => {
              const itemCount = itemCountByCategory.get(cat.slug) ?? 0;
              return (
                <li
                  key={cat.slug}
                  className="flex items-center justify-between gap-3 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-display text-headline-sm text-primary">{cat.label}</p>
                    <p className="font-mono text-label-mono text-on-surface-variant">
                      {itemCount} product{itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(cat)}
                    disabled={deletingSlug === cat.slug}
                    className="font-mono text-[11px] uppercase tracking-wider text-red-700 underline disabled:opacity-60"
                  >
                    {deletingSlug === cat.slug ? "…" : "Remove"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5 border-t border-surface-container-highest pt-6">
        {availablePresets.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                Add category
              </p>
              <button
                type="button"
                className="font-mono text-[11px] uppercase tracking-wider text-[#1a3d2e] underline"
                onClick={applyStarterSections}
              >
                Typical cafe set
              </button>
            </div>
            {CAFE_CATEGORY_PRESET_GROUPS.map((group) => {
              const presets = availablePresets.filter((p) => p.group === group.id);
              if (presets.length === 0) return null;
              return (
                <div key={group.id} className="mt-3">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => {
                      const selected = selectedCategorySlugs.has(preset.slug);
                      return (
                        <button
                          key={preset.slug}
                          type="button"
                          onClick={() => toggleCategory(preset)}
                          aria-pressed={selected}
                          className={`border px-3 py-2 text-body-md transition-colors ${
                            selected
                              ? "border-[#1a3d2e] bg-[#1a3d2e] text-white"
                              : "border-surface-container-highest bg-white hover:border-[#1a3d2e]/40"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <label className="block max-w-sm">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            Or type a name
          </span>
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Weekend specials"
            className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-[#1a3d2e] px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-white disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : sectionCount === 0
                ? "Pick or type a category"
                : `Add ${sectionCount} categor${sectionCount === 1 ? "y" : "ies"}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-surface-container-highest px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-on-surface"
          >
            Back to menu
          </button>
        </div>
      </form>
    </div>
  );
}
