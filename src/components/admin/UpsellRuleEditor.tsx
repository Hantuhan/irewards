"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  centsToPriceInput,
  currencyDisplayCode,
  parsePriceToCents,
  type MerchantCurrency,
} from "@/lib/merchant/currency";
import {
  defaultUpsellLink,
  type UpsellLinkConfig,
  type UpsellPromoMode,
  type UpsellRuleType,
  type SuggestType,
} from "@/lib/menu/upsell-rules";

export type UpsellProductOption = {
  slug: string;
  name: string;
  categoryLabel?: string;
  priceCents?: number;
};

type UpsellRuleEditorProps = {
  options: UpsellProductOption[];
  value: UpsellLinkConfig[];
  onChange: (links: UpsellLinkConfig[]) => void;
  currency?: MerchantCurrency;
  max?: number;
  showDownsell?: boolean;
};

function ruleSummary(link: UpsellLinkConfig, currency: MerchantCurrency): string {
  const code = currencyDisplayCode(currency);
  if (link.ruleType === "min_cart") {
    return `When cart ≥ ${code} ${((link.minCartCents ?? 0) / 100).toFixed(2)}`;
  }
  if (link.ruleType === "max_cart") {
    return `When cart ≤ ${code} ${((link.maxCartCents ?? 0) / 100).toFixed(2)}`;
  }
  return "Always show";
}

function promoSummary(link: UpsellLinkConfig, currency: MerchantCurrency): string {
  const code = currencyDisplayCode(currency);
  if (link.promoMode === "free") return "FREE";
  if (link.promoMode === "custom") {
    return `${code} ${((link.promoPriceCents ?? 0) / 100).toFixed(2)} promo`;
  }
  return "Regular price";
}

export function UpsellRuleEditor({
  options,
  value,
  onChange,
  currency = "MYR",
  max = 8,
  showDownsell = true,
}: UpsellRuleEditorProps) {
  const [search, setSearch] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [promoInputs, setPromoInputs] = useState<Record<string, string>>({});
  const [ruleInputs, setRuleInputs] = useState<Record<string, string>>({});

  const optionBySlug = useMemo(
    () => new Map(options.map((option) => [option.slug, option])),
    [options],
  );

  const filteredAvailable = useMemo(() => {
    const selected = new Set(value.map((l) => l.slug));
    const query = search.trim().toLowerCase();
    return options
      .filter((item) => !selected.has(item.slug))
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

  function updateLink(slug: string, patch: Partial<UpsellLinkConfig>) {
    onChange(value.map((link) => (link.slug === slug ? { ...link, ...patch } : link)));
  }

  function add(slug: string) {
    if (value.some((l) => l.slug === slug) || atMax) return;
    onChange([...value, defaultUpsellLink(slug)]);
    setExpandedSlug(slug);
  }

  function remove(slug: string) {
    onChange(value.filter((l) => l.slug !== slug));
    if (expandedSlug === slug) setExpandedSlug(null);
  }

  function promoInputFor(link: UpsellLinkConfig): string {
    if (promoInputs[link.slug] !== undefined) return promoInputs[link.slug];
    if (link.promoMode === "custom") return centsToPriceInput(link.promoPriceCents ?? 0);
    return "";
  }

  function ruleAmountInputFor(link: UpsellLinkConfig): string {
    if (ruleInputs[link.slug] !== undefined) return ruleInputs[link.slug];
    if (link.ruleType === "min_cart") return centsToPriceInput(link.minCartCents ?? 0);
    if (link.ruleType === "max_cart") return centsToPriceInput(link.maxCartCents ?? 0);
    return "";
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
        Search and add up to {max} products. Set rules (when to show) and promo pricing (e.g. RM2
        bread, free ice cream). {value.length}/{max} selected.
      </p>

      {value.length > 0 && (
        <div className="flex flex-col gap-3">
          {value.map((link) => {
            const product = optionBySlug.get(link.slug);
            const expanded = expandedSlug === link.slug;
            return (
              <div
                key={link.slug}
                className="border border-surface-container-highest bg-surface-container-lowest"
              >
                <div className="flex w-full items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedSlug(expanded ? null : link.slug)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Icon name="inventory_2" className="shrink-0 text-on-surface-variant" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-headline-sm text-on-surface">
                        {product?.name ?? link.slug}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-on-surface-variant">
                        {link.suggestType === "downsell" ? "Downsell" : "Upsell"} ·{" "}
                        {promoSummary(link, currency)} · {ruleSummary(link, currency)}
                      </span>
                    </span>
                    <Icon
                      name={expanded ? "expand_less" : "expand_more"}
                      className="shrink-0 text-on-surface-variant"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(link.slug)}
                    className="shrink-0 text-on-surface-variant hover:text-primary"
                    aria-label={`Remove ${product?.name ?? link.slug}`}
                  >
                    <Icon name="close" />
                  </button>
                </div>

                {expanded && (
                  <div className="grid gap-4 border-t border-surface-container-highest px-4 py-4 sm:grid-cols-2">
                    {showDownsell && (
                      <label>
                        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                          Type
                        </span>
                        <select
                          value={link.suggestType}
                          onChange={(e) =>
                            updateLink(link.slug, {
                              suggestType: e.target.value as SuggestType,
                            })
                          }
                          className="w-full border border-surface-container-highest bg-surface-container-low px-3 py-2"
                        >
                          <option value="upsell">Upsell — suggest add-on</option>
                          <option value="downsell">Downsell — lighter alternative</option>
                        </select>
                      </label>
                    )}

                    <label>
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        Promo price
                      </span>
                      <select
                        value={link.promoMode}
                        onChange={(e) => {
                          const promoMode = e.target.value as UpsellPromoMode;
                          updateLink(link.slug, {
                            promoMode,
                            promoPriceCents:
                              promoMode === "custom" ? (link.promoPriceCents ?? 200) : undefined,
                          });
                        }}
                        className="w-full border border-surface-container-highest bg-surface-container-low px-3 py-2"
                      >
                        <option value="regular">Regular menu price</option>
                        <option value="free">Free</option>
                        <option value="custom">Custom promo price</option>
                      </select>
                    </label>

                    {link.promoMode === "custom" && (
                      <label>
                        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                          Promo amount ({currencyDisplayCode(currency)})
                        </span>
                        <input
                          value={promoInputFor(link)}
                          onChange={(e) => {
                            setPromoInputs((prev) => ({ ...prev, [link.slug]: e.target.value }));
                            updateLink(link.slug, {
                              promoPriceCents: parsePriceToCents(e.target.value),
                            });
                          }}
                          placeholder="2.00"
                          className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
                        />
                      </label>
                    )}

                    <label>
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        Show when
                      </span>
                      <select
                        value={link.ruleType}
                        onChange={(e) => {
                          const ruleType = e.target.value as UpsellRuleType;
                          updateLink(link.slug, {
                            ruleType,
                            minCartCents: ruleType === "min_cart" ? (link.minCartCents ?? 0) : undefined,
                            maxCartCents: ruleType === "max_cart" ? (link.maxCartCents ?? 5000) : undefined,
                          });
                        }}
                        className="w-full border border-surface-container-highest bg-surface-container-low px-3 py-2"
                      >
                        <option value="always">Always</option>
                        <option value="min_cart">Cart total at least…</option>
                        <option value="max_cart">Cart total at most…</option>
                      </select>
                    </label>

                    {link.ruleType !== "always" && (
                      <label>
                        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                          Cart amount ({currencyDisplayCode(currency)})
                        </span>
                        <input
                          value={ruleAmountInputFor(link)}
                          onChange={(e) => {
                            setRuleInputs((prev) => ({ ...prev, [link.slug]: e.target.value }));
                            const cents = parsePriceToCents(e.target.value);
                            updateLink(link.slug, {
                              minCartCents: link.ruleType === "min_cart" ? cents : undefined,
                              maxCartCents: link.ruleType === "max_cart" ? cents : undefined,
                            });
                          }}
                          placeholder="25.00"
                          className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
                        />
                      </label>
                    )}

                    <label>
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        Priority
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={link.priority}
                        onChange={(e) =>
                          updateLink(link.slug, {
                            priority: Number.parseInt(e.target.value, 10) || 10,
                          })
                        }
                        className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
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
                ? "Maximum selected. Remove one above to add another."
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
    </div>
  );
}
