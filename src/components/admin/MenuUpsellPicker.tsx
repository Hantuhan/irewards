"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type UpsellProductOption = {
  slug: string;
  name: string;
  categoryLabel?: string;
};

type MenuUpsellPickerProps = {
  options: UpsellProductOption[];
  value: string[];
  onChange: (slugs: string[]) => void;
  max?: number;
};

export function MenuUpsellPicker({
  options,
  value,
  onChange,
  max = 8,
}: MenuUpsellPickerProps) {
  const [search, setSearch] = useState("");

  const optionBySlug = useMemo(
    () => new Map(options.map((option) => [option.slug, option])),
    [options],
  );

  const selected = useMemo(
    () =>
      value
        .map((slug) => optionBySlug.get(slug))
        .filter((item): item is UpsellProductOption => item != null),
    [value, optionBySlug],
  );

  const filteredAvailable = useMemo(() => {
    const query = search.trim().toLowerCase();
    return options
      .filter((item) => !value.includes(item.slug))
      .filter((item) => {
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query) ||
          item.categoryLabel?.toLowerCase().includes(query) ||
          item.slug.toLowerCase().includes(query)
        );
      });
  }, [options, value, search]);

  const atMax = value.length >= max;

  function add(slug: string) {
    if (value.includes(slug) || atMax) return;
    onChange([...value, slug]);
  }

  function remove(slug: string) {
    onChange(value.filter((s) => s !== slug));
  }

  if (options.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant">
        Add more products to configure upsells.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-md text-on-surface-variant">
        Search and add up to {max} products. {value.length}/{max} selected.
      </p>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item.slug}
              className="inline-flex items-center gap-1.5 border border-primary bg-primary px-2.5 py-1 font-display text-headline-sm text-on-primary"
            >
              {item.name}
              <button
                type="button"
                onClick={() => remove(item.slug)}
                className="text-on-primary/80 hover:text-on-primary"
                aria-label={`Remove ${item.name}`}
              >
                <Icon name="close" className="text-base" />
              </button>
            </span>
          ))}
        </div>
      )}

      <label>
        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
          Search products
        </span>
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category"
            className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 pl-7 focus:border-primary focus:outline-none"
          />
        </div>
      </label>

      <div className="max-h-64 overflow-y-auto border border-surface-container-highest bg-surface-container-lowest">
        {filteredAvailable.length === 0 ? (
          <p className="px-4 py-6 text-center text-body-md text-on-surface-variant">
            {search.trim()
              ? "No products match your search."
              : atMax
                ? "Maximum upsells selected. Remove one to add another."
                : "All products are already selected."}
          </p>
        ) : (
          <ul>
            {filteredAvailable.map((item) => (
              <li key={item.slug} className="border-b border-surface-container-highest last:border-b-0">
                <button
                  type="button"
                  disabled={atMax}
                  onClick={() => add(item.slug)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="inventory_2" className="shrink-0 text-on-surface-variant" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-headline-sm text-on-surface">
                      {item.name}
                    </span>
                    {item.categoryLabel && (
                      <span className="mt-0.5 block font-mono text-label-mono text-on-surface-variant">
                        {item.categoryLabel}
                      </span>
                    )}
                  </span>
                  <Icon name="add" className="shrink-0 text-primary" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {atMax && (
        <p className="text-body-md text-on-surface-variant">
          Maximum of {max} upsells reached. Remove one above to add another.
        </p>
      )}
    </div>
  );
}
