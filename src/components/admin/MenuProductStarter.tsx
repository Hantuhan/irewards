"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  cafeProductPresetPrice,
  cafeProductPresetsForCategory,
  isPopularCafeProduct,
  popularSlugsInPresets,
  type CafeProductPreset,
} from "@/lib/menu/cafe-product-presets";
import { formatMerchantPrice, type MerchantCurrency } from "@/lib/merchant/currency";

type Category = { slug: string; label: string };

type MenuProductStarterProps = {
  categories: Category[];
  existingItemSlugs: Set<string>;
  categorySlug: string;
  currency: MerchantCurrency;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onAddPresets: (presets: CafeProductPreset[], categorySlug: string) => Promise<void>;
  onCustom: (categorySlug: string) => void;
};

function defaultSelection(presets: CafeProductPreset[]): Set<string> {
  const popular = popularSlugsInPresets(presets);
  // When popular picks are already on the menu, still pre-select what's left
  // so Add is immediately usable (cafe owner shouldn't have to hunt for checkboxes).
  return new Set(popular.length > 0 ? popular : presets.map((p) => p.slug));
}

export function MenuProductStarter({
  categories,
  existingItemSlugs,
  categorySlug,
  currency,
  saving,
  error = null,
  onClose,
  onAddPresets,
  onCustom,
}: MenuProductStarterProps) {
  const category = categories.find((c) => c.slug === categorySlug);
  const categoryLabel = category?.label ?? "this category";
  const presets = useMemo(() => {
    return cafeProductPresetsForCategory(categorySlug).filter(
      (p) => !existingItemSlugs.has(p.slug),
    );
  }, [categorySlug, existingItemSlugs]);

  const [selected, setSelected] = useState<Set<string>>(() => defaultSelection(presets));

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function selectPopular() {
    const popular = popularSlugsInPresets(presets);
    setSelected(new Set(popular.length > 0 ? popular : presets.map((p) => p.slug)));
  }

  async function handleAddSelected() {
    const picked = presets.filter((p) => selected.has(p.slug));
    if (picked.length === 0) return;
    await onAddPresets(picked, categorySlug);
  }

  const canAdd = selected.size > 0 && presets.length > 0;

  return (
    <div className="mb-6 border border-surface-container-highest bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-headline-sm text-primary">
            Add to {categoryLabel}
          </p>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Two ways: pick cafe templates below, or start a blank product (then Complete with AI).
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-on-surface-variant hover:text-primary"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>
      </div>

      {error ? (
        <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-body-md text-red-800">
          {error}
        </p>
      ) : null}

      {/* Path A — templates */}
      <div className="mt-5 border border-surface-container-highest bg-surface-container-lowest p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              From template
            </p>
            <p className="mt-0.5 text-[12px] text-on-surface-variant">
              Ready-made {categoryLabel.toLowerCase()} with kcal where known. Tick and add in bulk.
            </p>
          </div>
          {presets.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="font-mono text-[11px] uppercase tracking-wider text-primary underline"
                onClick={selectPopular}
              >
                Popular
              </button>
              <button
                type="button"
                className="font-mono text-[11px] uppercase tracking-wider text-primary underline"
                onClick={() => setSelected(new Set(presets.map((p) => p.slug)))}
              >
                All
              </button>
              <button
                type="button"
                className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant underline"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>

        {presets.length > 0 ? (
          <>
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto border border-surface-container-highest bg-white">
              {presets.map((product) => {
                const checked = selected.has(product.slug);
                const price = cafeProductPresetPrice(product, currency);
                return (
                  <label
                    key={product.slug}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                      checked ? "bg-primary/5" : "hover:bg-surface-container-low"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(product.slug)}
                    />
                    <span className="min-w-0 flex-1 text-body-md font-medium">
                      {product.name}
                      {isPopularCafeProduct(product) ? (
                        <span className="ml-2 font-mono text-[10px] uppercase text-primary">
                          Popular
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right font-mono text-label-mono text-on-surface-variant">
                      {product.kcal != null ? (
                        <span className="mr-3">{product.kcal} kcal</span>
                      ) : null}
                      {formatMerchantPrice(price, currency)}
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              disabled={saving || !canAdd}
              onClick={() => void handleAddSelected()}
              className="mt-3 inline-flex items-center gap-1.5 bg-primary px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="playlist_add" className="text-sm" />
              {saving
                ? "Adding…"
                : canAdd
                  ? `Add ${selected.size} from template`
                  : "Tick templates first"}
            </button>
          </>
        ) : (
          <p className="mt-3 text-body-md text-on-surface-variant">
            All templates for {categoryLabel.toLowerCase()} are already on your menu.
          </p>
        )}
      </div>

      {/* Path B — blank product */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-surface-container-highest px-4 py-3">
        <div className="min-w-0">
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Add new product
          </p>
          <p className="mt-0.5 text-[12px] text-on-surface-variant">
            Blank item — enter product title (+ optional short description), then Complete with
            AI fills the rest.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => onCustom(categorySlug)}
          className="inline-flex shrink-0 items-center gap-1.5 border border-primary px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-primary disabled:opacity-60"
        >
          <Icon name="add" className="text-sm" />
          Add new product
        </button>
      </div>
    </div>
  );
}
