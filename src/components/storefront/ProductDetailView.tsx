"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MenuCoffeeProfileDisplay } from "@/components/storefront/MenuCoffeeProfileDisplay";
import { MenuSimpleCategoryDisplay } from "@/components/storefront/MenuSimpleCategoryDisplay";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import { storefrontCopy, type StorefrontCopy } from "@/lib/i18n/storefront-locale";
import { coffeeProfileHasDisplay } from "@/lib/menu/coffee-profile";
import { isCoffeeMenuCategory } from "@/lib/menu/coffee-templates";
import { detailStatsForDisplay, disclosureLevelForPreset } from "@/lib/menu/detail";
import { badgeLabel, type MenuBadge } from "@/lib/menu/menu-badges";
import {
  disclosurePresetsFromIds,
  ingredientLabel,
  parseMenuIngredientPresets,
  type MenuIngredientPreset,
} from "@/lib/menu/menu-ingredients";
import {
  defaultSelections,
  formatPriceDelta,
  MAX_LINE_NOTE_LENGTH,
  type CartModifierSelection,
  type ModifierGroup,
  unitPriceWithModifiers,
} from "@/lib/menu/modifiers";
import { resolveSimpleCategory } from "@/lib/menu/simple-category-options";
import { simpleCategoryProfileHasDisplay } from "@/lib/menu/simple-category-profile";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";
import {
  currencyDisplayCode,
  formatMerchantPrice,
  type MerchantCurrency,
} from "@/lib/merchant/currency";

export type ProductDetailAddPayload = {
  selections: CartModifierSelection[];
  quantity: number;
  note?: string;
};

export type ProductDetailPairing = {
  item: StorefrontMenuItem;
  href?: string;
  quantityInCart: number;
};

export type ProductDetailViewProps = {
  item: StorefrontMenuItem;
  currency?: MerchantCurrency;
  /** Category label for the eyebrow fallback. */
  categoryLabel?: string | null;
  badgeCatalog?: MenuBadge[];
  ingredientCatalog?: MenuIngredientPreset[];
  lang?: ProgramLanguage;
  copy?: StorefrontCopy;
  /** e.g. "Table 04 · Dine-in" — rendered under the page title. */
  contextLabel?: string | null;
  pointsProgramEnabled?: boolean;
  pointsPerRinggit?: number;
  pairings?: ProductDetailPairing[];
  quantityInCart?: number;
  loading?: boolean;
  error?: string | null;
  /** Admin preview: no navigation, add is a no-op. */
  preview?: boolean;
  onBack?: () => void;
  onAdd?: (payload: ProductDetailAddPayload) => void;
  onAddPairing?: (item: StorefrontMenuItem) => void;
  onShare?: () => void;
};

type OptionQuantities = Record<string, Record<string, number>>;

function buildInitialQuantities(groups: ModifierGroup[]): OptionQuantities {
  const initial: OptionQuantities = {};
  for (const sel of defaultSelections(groups)) {
    const groupMap = initial[sel.groupId] ?? {};
    groupMap[sel.optionId] = sel.quantity;
    initial[sel.groupId] = groupMap;
  }
  return initial;
}

function earnPoints(cents: number, pointsPerRinggit: number): number {
  if (!Number.isFinite(pointsPerRinggit) || pointsPerRinggit <= 0) return 0;
  return Math.floor((cents / 100) * pointsPerRinggit);
}

const CARD = "border border-surface-container-highest bg-surface-container-lowest";
const EYEBROW = "font-display text-eyebrow uppercase tracking-widest";

/**
 * Storefront product detail template.
 *
 * One layout for every product: hero + badges, essentials (eyebrow, name,
 * price, spec stats, description, allergen chips), customisation groups,
 * pairings, kitchen notes and a sticky add-to-order bar. Content is driven
 * entirely by `StorefrontMenuItem`, so new products render without code.
 */
export function ProductDetailView({
  item,
  currency = "MYR",
  categoryLabel,
  badgeCatalog = [],
  ingredientCatalog,
  lang = "en",
  copy: copyProp,
  contextLabel,
  pointsProgramEnabled = true,
  pointsPerRinggit = 0,
  pairings = [],
  quantityInCart = 0,
  loading = false,
  error = null,
  preview = false,
  onBack,
  onAdd,
  onAddPairing,
  onShare,
}: ProductDetailViewProps) {
  const copy = copyProp ?? storefrontCopy(lang);
  const currencyCode = currencyDisplayCode(currency);
  const groups = useMemo(() => item.modifierGroups ?? [], [item.modifierGroups]);

  const [optionQty, setOptionQty] = useState<OptionQuantities>(() =>
    buildInitialQuantities(groups),
  );
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);

  // Reset selections when a different product (or a fresh copy) is loaded.
  useEffect(() => {
    setOptionQty(buildInitialQuantities(groups));
    setAttempted(false);
  }, [groups, item.id]);

  const selections = useMemo(() => {
    const result: CartModifierSelection[] = [];
    for (const group of groups) {
      const qtyByOption = optionQty[group.id] ?? {};
      for (const option of group.options) {
        const qty = qtyByOption[option.id] ?? 0;
        if (qty <= 0) continue;
        result.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDeltaCents: option.priceDeltaCents,
          quantity: Math.min(qty, option.maxQuantity ?? 1),
        });
      }
    }
    return result;
  }, [groups, optionQty]);

  const unitPrice = unitPriceWithModifiers(item.priceCents, selections);
  const totalPrice = unitPrice * quantity;
  const basePoints = pointsProgramEnabled ? earnPoints(item.priceCents, pointsPerRinggit) : 0;
  const totalPoints = pointsProgramEnabled ? earnPoints(totalPrice, pointsPerRinggit) : 0;

  const missingGroup = useMemo(() => {
    for (const group of groups) {
      const active = Object.values(optionQty[group.id] ?? {}).filter((q) => q > 0).length;
      if (group.required && active < Math.max(1, group.minSelect)) return group;
    }
    return null;
  }, [groups, optionQty]);

  const catalog = useMemo(
    () =>
      ingredientCatalog && ingredientCatalog.length > 0
        ? ingredientCatalog
        : parseMenuIngredientPresets(null),
    [ingredientCatalog],
  );
  const disclosures = useMemo(
    () => disclosurePresetsFromIds(item.ingredientIds ?? [], catalog),
    [item.ingredientIds, catalog],
  );

  const stats = detailStatsForDisplay(item.detail, { kcal: item.kcal, energyLabel: copy.energy });
  const eyebrow = item.detail?.eyebrow || categoryLabel || "";
  const heroNote = item.detail?.heroNote ?? "";
  const heroNoteRight = item.detail?.heroNoteRight ?? "";
  const badges = item.specialTags ?? [];

  const isCoffeeItem = isCoffeeMenuCategory(item.category);
  const hasCoffeeProfile =
    isCoffeeItem && item.coffeeProfile != null && coffeeProfileHasDisplay(item.coffeeProfile);
  const simpleKind = resolveSimpleCategory(item.category);
  const hasSimpleProfile =
    Boolean(simpleKind) &&
    item.simpleCategoryProfile != null &&
    simpleCategoryProfileHasDisplay(item.simpleCategoryProfile);

  function setOptionQuantity(group: ModifierGroup, optionId: string, next: number) {
    setOptionQty((prev) => {
      const current = { ...(prev[group.id] ?? {}) };
      if (group.maxSelect === 1) {
        const cleared: Record<string, number> = {};
        if (next > 0) cleared[optionId] = next;
        return { ...prev, [group.id]: cleared };
      }
      if (next <= 0) delete current[optionId];
      else current[optionId] = next;
      const activeCount = Object.values(current).filter((q) => q > 0).length;
      if (activeCount > group.maxSelect) return prev;
      return { ...prev, [group.id]: current };
    });
  }

  function toggleOption(group: ModifierGroup, optionId: string) {
    const current = optionQty[group.id]?.[optionId] ?? 0;
    if (group.maxSelect === 1 && group.required && current > 0) return;
    setOptionQuantity(group, optionId, current > 0 ? 0 : 1);
  }

  function handleAdd() {
    if (loading || error || preview) return;
    if (missingGroup) {
      setAttempted(true);
      const el = document.getElementById(`pdp-group-${missingGroup.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onAdd?.({ selections, quantity, note: note.trim() || undefined });
  }

  const singleSelectHint = (group: ModifierGroup) =>
    group.maxSelect > 1
      ? group.required && group.minSelect === group.maxSelect
        ? `${copy.pickExactly} ${group.maxSelect}`
        : `${copy.upTo} ${group.maxSelect}`
      : null;

  return (
    <div className={`relative flex min-h-full flex-col bg-surface ${preview ? "" : "pb-28"}`}>
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-surface-container-highest bg-surface-container-lowest">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            type="button"
            onClick={onBack}
            aria-label={copy.backToMenu}
            className="flex h-9 w-9 items-center justify-center border border-surface-container-highest text-primary transition-colors hover:bg-surface-container"
          >
            <Icon name="arrow_back" className="text-[18px]" />
          </button>
          <div className="flex flex-col items-center text-center">
            <h1 className="font-display text-headline-sm text-primary">{copy.productDetails}</h1>
            {contextLabel ? (
              <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-on-surface-variant">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-manus" />
                {contextLabel}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onShare}
            aria-label="Share product"
            disabled={!onShare}
            className="flex h-9 w-9 items-center justify-center border border-surface-container-highest text-primary transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <Icon name="share" className="text-[18px]" />
          </button>
        </div>
      </header>

      <main className="flex flex-col gap-4 px-4 pt-4">
        {error ? (
          <p className={`${CARD} p-4 text-body-md text-red-700`} role="alert">
            {error}
          </p>
        ) : null}

        {/* Hero */}
        <section className={`relative overflow-hidden ${CARD}`}>
          {badges.length > 0 ? (
            <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
              {badges.map((badgeId, index) => (
                <span
                  key={badgeId}
                  className={`inline-flex items-center px-2 py-1 ${EYEBROW} ${
                    index === 0
                      ? "border border-surface-container-highest bg-surface-container-lowest/90 text-primary backdrop-blur-sm"
                      : "bg-manus text-white"
                  }`}
                >
                  {badgeLabel(badgeId, badgeCatalog)}
                </span>
              ))}
            </div>
          ) : null}
          {basePoints > 0 ? (
            <div className="absolute right-3 top-3 z-10">
              <span className="inline-flex items-center gap-1 border border-surface-container-highest bg-surface-container-lowest/95 px-2.5 py-1 font-mono text-[11px] font-medium text-primary">
                <Icon name="award_star" filled className="text-[14px] text-manus" />+{basePoints}{" "}
                {copy.loyaltyPts}
              </span>
            </div>
          ) : null}
          <div className="aspect-[4/3] w-full bg-surface-container">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                <Icon name="restaurant" className="text-5xl opacity-30" />
              </div>
            )}
          </div>
          {heroNote || heroNoteRight ? (
            <div className="flex items-center justify-between gap-3 border-t border-surface-container-highest bg-surface-container-low px-3 py-2.5 font-mono text-[11px] text-on-surface-variant">
              <span className="flex min-w-0 items-center gap-1.5">
                {heroNote ? (
                  <>
                    <Icon name="schedule" className="text-[14px]" />
                    <span className="truncate">{heroNote}</span>
                  </>
                ) : null}
              </span>
              {heroNoteRight ? (
                <span className="shrink-0 font-medium text-primary">{heroNoteRight}</span>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Essentials */}
        <section className={`${CARD} p-5`}>
          {loading ? (
            <p className="py-6 text-center text-body-md text-on-surface-variant">
              {copy.loadingMenu}
            </p>
          ) : (
            <>
              {eyebrow ? (
                <p className={`${EYEBROW} mb-1 text-on-surface-variant`}>{eyebrow}</p>
              ) : null}
              <h2 className="font-display text-headline-mobile text-primary">{item.name}</h2>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-headline-lg font-bold tracking-tight text-primary">
                  {formatMerchantPrice(item.priceCents, currency)}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-on-surface-variant">{copy.nettPrice}</p>

              {stats.length > 0 ? (
                <div
                  className="my-4 grid border-y border-surface-container-highest py-3 text-center"
                  style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
                >
                  {stats.map((stat, index) => (
                    <div
                      key={`${stat.label}-${index}`}
                      className={`px-2 ${
                        index > 0 ? "border-l border-surface-container-highest" : ""
                      }`}
                    >
                      <span className={`${EYEBROW} block text-secondary`}>{stat.label}</span>
                      <span className="mt-1 block font-mono text-[12px] font-medium text-primary">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {item.description ? (
                <p className={`text-body-md leading-relaxed text-on-surface ${stats.length > 0 ? "" : "mt-4"}`}>
                  {item.description}
                </p>
              ) : null}

              {hasCoffeeProfile && item.coffeeProfile ? (
                <MenuCoffeeProfileDisplay profile={item.coffeeProfile} />
              ) : null}
              {hasSimpleProfile && item.simpleCategoryProfile ? (
                <MenuSimpleCategoryDisplay profile={item.simpleCategoryProfile} />
              ) : null}

              {disclosures.length > 0 ? (
                <div className="mt-5 border-t border-surface-container-highest pt-4">
                  <p className={`${EYEBROW} mb-2.5 text-secondary`}>{copy.allergens}</p>
                  <div className="flex flex-wrap gap-2">
                    {disclosures.map((preset) => {
                      const level = disclosureLevelForPreset(preset);
                      return (
                        <span
                          key={preset.id}
                          className={`inline-flex items-center gap-1.5 border border-surface-container-highest bg-surface-container-low px-2.5 py-1 font-mono text-[11px] ${
                            level === "positive" ? "font-medium text-manus" : "text-on-surface"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              level === "alert"
                                ? "bg-red-700"
                                : level === "positive"
                                  ? "bg-manus"
                                  : "bg-outline"
                            }`}
                          />
                          {ingredientLabel(preset.id, catalog, lang)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {item.ingredients?.trim() ? (
                <div className="mt-5 border-t border-surface-container-highest pt-4">
                  <p className={`${EYEBROW} mb-2 text-secondary`}>{copy.ingredients}</p>
                  <p className="text-body-md leading-relaxed text-on-surface">{item.ingredients}</p>
                </div>
              ) : null}

              {item.notes?.trim() ? (
                <div className="mt-4 border-l-2 border-primary/30 pl-3">
                  <p className={`${EYEBROW} text-secondary`}>{copy.notes}</p>
                  <p className="mt-1.5 text-body-md leading-relaxed text-on-surface-variant">
                    {item.notes}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </section>

        {/* Customisation groups */}
        {!loading &&
          groups.map((group) => {
            const qtyByOption = optionQty[group.id] ?? {};
            const activeCount = Object.values(qtyByOption).filter((q) => q > 0).length;
            const unmet = group.required && activeCount < Math.max(1, group.minSelect);
            const hint = singleSelectHint(group);
            return (
              <section
                key={group.id}
                id={`pdp-group-${group.id}`}
                className={`${CARD} p-5 ${attempted && unmet ? "border-red-700" : ""}`}
              >
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-surface-container-highest pb-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-headline-sm text-primary">{group.name}</h3>
                    {group.description ? (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-secondary">
                        {group.description}
                      </p>
                    ) : null}
                    {hint ? (
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                        {hint}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 ${EYEBROW} ${
                      group.required
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {group.required ? copy.required : copy.optional}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {group.options.map((option) => {
                    const qty = qtyByOption[option.id] ?? 0;
                    const selected = qty > 0;
                    const maxQty = option.maxQuantity ?? 1;
                    const isSingle = group.maxSelect === 1;
                    const priceLabel =
                      option.priceDeltaCents === 0
                        ? option.isDefault
                          ? copy.standard
                          : `+${currencyCode} 0.00`
                        : formatPriceDelta(
                            option.priceDeltaCents * Math.max(1, qty),
                            currencyCode,
                          );
                    return (
                      <div
                        key={option.id}
                        className={`border transition-colors ${
                          selected
                            ? "border-primary bg-surface-container-low"
                            : "border-surface-container-highest hover:border-outline"
                        }`}
                      >
                        <label className="flex cursor-pointer items-center justify-between gap-3 p-3.5">
                          <span className="flex min-w-0 items-center gap-3">
                            <input
                              type={isSingle ? "radio" : "checkbox"}
                              name={`pdp-${group.id}`}
                              checked={selected}
                              onChange={() => toggleOption(group, option.id)}
                              className="h-4 w-4 shrink-0 rounded-none"
                            />
                            <span className="min-w-0">
                              <span className="block text-body-md font-medium text-primary">
                                {option.name}
                              </span>
                              {option.description ? (
                                <span className="block font-mono text-[11px] text-secondary">
                                  {option.description}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 font-mono text-[12px] ${
                              option.priceDeltaCents === 0 && option.isDefault
                                ? "font-medium text-manus"
                                : option.priceDeltaCents === 0
                                  ? "text-secondary"
                                  : "font-medium text-primary"
                            }`}
                          >
                            {priceLabel}
                          </span>
                        </label>
                        {selected && maxQty > 1 ? (
                          <div className="flex items-center justify-between border-t border-surface-container-highest px-3.5 py-2">
                            <span className="text-body-md text-on-surface-variant">Qty</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setOptionQuantity(group, option.id, qty - 1)}
                                className="flex h-8 w-8 items-center justify-center border border-surface-container-highest"
                                aria-label="Decrease"
                              >
                                <Icon name="remove" className="text-base" />
                              </button>
                              <span className="w-6 text-center font-mono text-label-mono">{qty}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setOptionQuantity(group, option.id, Math.min(maxQty, qty + 1))
                                }
                                disabled={qty >= maxQty}
                                className="flex h-8 w-8 items-center justify-center border border-surface-container-highest disabled:opacity-40"
                                aria-label="Increase"
                              >
                                <Icon name="add" className="text-base" />
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

        {/* Pairings */}
        {!loading && pairings.length > 0 ? (
          <section className={`${CARD} p-5`}>
            <div className="mb-4 flex items-center gap-2">
              <Icon name="local_cafe" className="text-[18px] text-manus" />
              <h3 className="font-display text-headline-sm text-primary">
                {copy.frequentlyPairedWith}
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              {pairings.map(({ item: pairing, href, quantityInCart: pairQty }) => {
                const pairPoints = pointsProgramEnabled
                  ? earnPoints(pairing.priceCents, pointsPerRinggit)
                  : 0;
                const thumb = (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-surface-container-highest bg-surface-container">
                    {pairing.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pairing.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon name="coffee" className="text-xl text-secondary" />
                    )}
                  </span>
                );
                const body = (
                  <span className="min-w-0">
                    <span className="block text-body-md font-semibold text-primary">
                      {pairing.name}
                    </span>
                    {pairing.description ? (
                      <span className="mt-0.5 line-clamp-1 block text-[12px] text-secondary">
                        {pairing.description}
                      </span>
                    ) : null}
                    <span className="mt-1 flex items-center gap-2 font-mono text-[12px]">
                      <span className="font-medium text-primary">
                        {formatMerchantPrice(pairing.priceCents, currency)}
                      </span>
                      {pairPoints > 0 ? (
                        <span className="text-[11px] text-manus">(+{pairPoints} {copy.pts})</span>
                      ) : null}
                    </span>
                  </span>
                );
                return (
                  <div
                    key={pairing.id}
                    className="flex items-center justify-between gap-3 border border-surface-container-highest bg-surface p-3 transition-colors hover:border-outline"
                  >
                    {href && !preview ? (
                      <Link href={href} className="flex min-w-0 items-center gap-3">
                        {thumb}
                        {body}
                      </Link>
                    ) : (
                      <span className="flex min-w-0 items-center gap-3">
                        {thumb}
                        {body}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onAddPairing?.(pairing)}
                      disabled={preview}
                      className={`flex shrink-0 items-center gap-1 border border-primary px-3 py-1.5 font-mono text-[12px] font-medium transition-colors ${
                        pairQty > 0
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest text-primary hover:bg-primary hover:text-on-primary"
                      }`}
                    >
                      <Icon name={pairQty > 0 ? "check" : "add"} className="text-[14px]" />
                      {pairQty > 0 ? `${copy.added}${pairQty > 1 ? ` ×${pairQty}` : ""}` : copy.add}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Kitchen notes */}
        {!loading ? (
          <section className={`${CARD} p-5`}>
            <label htmlFor="pdp-kitchen-notes" className={`${EYEBROW} mb-2 block text-secondary`}>
              {copy.kitchenNotes}
            </label>
            <textarea
              id="pdp-kitchen-notes"
              rows={2}
              maxLength={MAX_LINE_NOTE_LENGTH}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={item.detail?.notesPlaceholder || copy.kitchenNotesPlaceholder}
              className="w-full rounded-none border border-surface-container-highest bg-surface-container-lowest p-3 text-body-md text-primary placeholder:text-outline-variant focus:border-primary focus:outline-none"
            />
            <p className="mt-1.5 flex items-center gap-1 font-mono text-[11px] text-secondary">
              <Icon name="info" className="text-[13px]" />
              {copy.kitchenNotesHint}
            </p>
          </section>
        ) : null}
      </main>

      {/* Sticky order bar */}
      <footer
        className={`z-50 w-full border-t border-surface-container-highest bg-surface-container-lowest px-4 py-3 ${
          preview
            ? "sticky bottom-0"
            : "fixed bottom-0 left-1/2 max-w-mobile -translate-x-1/2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {attempted && missingGroup ? (
          <p className="mb-2 font-mono text-[11px] text-red-700">
            {copy.chooseOptions}: {missingGroup.name}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <div className="flex h-12 items-center border border-surface-container-highest bg-surface">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="flex h-full w-10 items-center justify-center text-primary hover:bg-surface-container"
            >
              <Icon name="remove" className="text-base" />
            </button>
            <span className="w-8 text-center font-mono text-[15px] font-semibold text-primary">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              aria-label="Increase quantity"
              className="flex h-full w-10 items-center justify-center text-primary hover:bg-surface-container"
            >
              <Icon name="add" className="text-base" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading || Boolean(error)}
            className="flex h-12 flex-1 flex-col justify-center rounded-none bg-manus px-4 text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            <span className="flex w-full items-center justify-between">
              <span className="font-display text-[15px] font-semibold">
                {quantityInCart > 0 ? copy.addAnother : copy.addToOrder}
              </span>
              <span className="font-display text-[15px] font-semibold">
                {formatMerchantPrice(totalPrice, currency)}
              </span>
            </span>
            {totalPoints > 0 ? (
              <span className="w-full text-left font-mono text-[9px] uppercase tracking-wider text-white/80">
                {copy.earnsPoints} +{totalPoints} iRewards {copy.pts}
                {quantityInCart > 0 ? ` · ${quantityInCart} ${copy.inCart}` : ""}
              </span>
            ) : quantityInCart > 0 ? (
              <span className="w-full text-left font-mono text-[9px] uppercase tracking-wider text-white/80">
                {quantityInCart} {copy.inCart}
              </span>
            ) : null}
          </button>
        </div>
      </footer>
    </div>
  );
}
