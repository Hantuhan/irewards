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
  categorySlug?: string;
  priceCents?: number;
  tags?: string[];
  specialTags?: string[];
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
        Use Complete with AI to seed pairings, or search and add manually. Set rules and promo
        pricing as needed. {value.length}/{max} selected.
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
                    className="shrink-0 font-mono text-label-mono text-on-surface-variant underline"
                  >
                    Remove
                  </button>
                </div>

                {expanded && (
                  <div className="grid gap-4 border-t border-surface-container-highest px-4 py-4 sm:grid-cols-2">
                    {showDownsell && (
                      <label>
                        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                          Suggest as
                        </span>
                        <select
                          value={link.suggestType ?? "upsell"}
                          onChange={(e) =>
                            updateLink(link.slug, {
                              suggestType: e.target.value as SuggestType,
                            })
                          }
                          className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                        >
                          <option value="upsell">Upsell</option>
                          <option value="downsell">Downsell</option>
                        </select>
                      </label>
                    )}
                    <label>
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        Promo
                      </span>
                      <select
                        value={link.promoMode}
                        onChange={(e) => {
                          const promoMode = e.target.value as UpsellPromoMode;
                          updateLink(link.slug, {
                            promoMode,
                            promoPriceCents:
                              promoMode === "custom" ? (link.promoPriceCents ?? 0) : undefined,
                          });
                        }}
                        className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                      >
                        <option value="regular">Regular price</option>
                        <option value="custom">Custom promo price</option>
                        <option value="free">FREE</option>
                      </select>
                    </label>
                    {link.promoMode === "custom" && (
                      <label>
                        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                          Promo price ({currencyDisplayCode(currency)})
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={promoInputFor(link)}
                          onChange={(e) =>
                            setPromoInputs((prev) => ({ ...prev, [link.slug]: e.target.value }))
                          }
                          onBlur={() => {
                            const cents = parsePriceToCents(promoInputFor(link));
                            updateLink(link.slug, { promoPriceCents: cents });
                            setPromoInputs((prev) => ({
                              ...prev,
                              [link.slug]: centsToPriceInput(cents),
                            }));
                          }}
                          className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 font-mono"
                        />
                      </label>
                    )}
                    <label>
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        When to show
                      </span>
                      <select
                        value={link.ruleType}
                        onChange={(e) => {
                          const ruleType = e.target.value as UpsellRuleType;
                          updateLink(link.slug, {
                            ruleType,
                            minCartCents:
                              ruleType === "min_cart" ? (link.minCartCents ?? 0) : undefined,
                            maxCartCents:
                              ruleType === "max_cart" ? (link.maxCartCents ?? 0) : undefined,
                          });
                        }}
                        className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                      >
                        <option value="always">Always</option>
                        <option value="min_cart">Cart at least…</option>
                        <option value="max_cart">Cart at most…</option>
                      </select>
                    </label>
                    {(link.ruleType === "min_cart" || link.ruleType === "max_cart") && (
                      <label>
                        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                          Cart amount ({currencyDisplayCode(currency)})
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ruleAmountInputFor(link)}
                          onChange={(e) =>
                            setRuleInputs((prev) => ({ ...prev, [link.slug]: e.target.value }))
                          }
                          onBlur={() => {
                            const cents = parsePriceToCents(ruleAmountInputFor(link));
                            updateLink(link.slug, {
                              minCartCents: link.ruleType === "min_cart" ? cents : undefined,
                              maxCartCents: link.ruleType === "max_cart" ? cents : undefined,
                            });
                            setRuleInputs((prev) => ({
                              ...prev,
                              [link.slug]: centsToPriceInput(cents),
                            }));
                          }}
                          className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 font-mono"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!atMax && (
        <div className="flex flex-col gap-3 border border-dashed border-surface-container-highest bg-surface-container-low p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products to add…"
            className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
          />
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {filteredAvailable.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">No matching products.</p>
            ) : (
              filteredAvailable.slice(0, 20).map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => add(item.slug)}
                  className="flex items-center justify-between gap-2 px-2 py-2 text-left transition-colors hover:bg-surface-container-lowest"
                >
                  <span>
                    <span className="block font-display text-headline-sm text-on-surface">
                      {item.name}
                    </span>
                    {item.categoryLabel ? (
                      <span className="font-mono text-[11px] text-on-surface-variant">
                        {item.categoryLabel}
                      </span>
                    ) : null}
                  </span>
                  <Icon name="add" className="text-primary" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
