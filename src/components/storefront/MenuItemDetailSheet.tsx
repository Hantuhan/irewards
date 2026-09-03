"use client";

import { useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { MenuBadgeChip } from "@/components/storefront/MenuBadgeChip";
import { MenuCoffeeProfileDisplay } from "@/components/storefront/MenuCoffeeProfileDisplay";
import type { MenuBadge } from "@/lib/menu/menu-badges";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import type { StorefrontCopy } from "@/lib/i18n/storefront-locale";
import { coffeeProfileHasDisplay } from "@/lib/menu/coffee-profile";
import { isCoffeeMenuCategory } from "@/lib/menu/coffee-templates";
import { mainIngredientDef } from "@/lib/menu/main-ingredients";
import {
  disclosurePresetsFromIds,
  ingredientLabel,
  parseMenuIngredientPresets,
} from "@/lib/menu/menu-ingredients";
import { resolveSimpleCategory } from "@/lib/menu/simple-category-options";
import { simpleCategoryProfileHasDisplay } from "@/lib/menu/simple-category-profile";
import { MenuSimpleCategoryDisplay } from "@/components/storefront/MenuSimpleCategoryDisplay";
import { formatMerchantPrice, type MerchantCurrency } from "@/lib/merchant/currency";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";

type MenuItemDetailSheetProps = {
  item: StorefrontMenuItem;
  quantity: number;
  currency?: MerchantCurrency;
  hasModifiers?: boolean;
  loading?: boolean;
  error?: string | null;
  badgeCatalog?: MenuBadge[];
  /** Optional merchant ingredient library for localized disclosure labels. */
  ingredientCatalog?: ReturnType<typeof parseMenuIngredientPresets>;
  lang?: ProgramLanguage;
  copy?: StorefrontCopy;
  onClose: () => void;
  onAdd: () => void;
};

export function MenuItemDetailSheet({
  item,
  quantity,
  currency = "MYR",
  hasModifiers = false,
  loading = false,
  error = null,
  badgeCatalog = [],
  ingredientCatalog,
  lang = "en",
  copy,
  onClose,
  onAdd,
}: MenuItemDetailSheetProps) {
  const isCoffeeItem = isCoffeeMenuCategory(item.category);
  const simpleKind = resolveSimpleCategory(item.category);
  const hasCoffeeProfile =
    isCoffeeItem &&
    item.coffeeProfile != null &&
    coffeeProfileHasDisplay(item.coffeeProfile);
  const hasSimpleProfile =
    Boolean(simpleKind) &&
    item.simpleCategoryProfile != null &&
    simpleCategoryProfileHasDisplay(item.simpleCategoryProfile);
  const hasNutrition = item.kcal != null || item.sugarG != null;
  const showIngredients = Boolean(item.ingredients?.trim());
  const showNotes = Boolean(item.notes?.trim());
  const mainIngredients = (item.mainIngredientIds ?? [])
    .map((id) => mainIngredientDef(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const catalog = useMemo(
    () => ingredientCatalog ?? parseMenuIngredientPresets(null),
    [ingredientCatalog],
  );
  const disclosures = useMemo(
    () => disclosurePresetsFromIds(item.ingredientIds ?? [], catalog),
    [item.ingredientIds, catalog],
  );

  const hasDetails =
    showIngredients || showNotes || hasCoffeeProfile || hasSimpleProfile || disclosures.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close menu item"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-[382px] flex-col overflow-hidden bg-surface shadow-2xl sm:max-h-[85vh] sm:rounded-lg">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-on-surface shadow-sm backdrop-blur"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="relative h-[min(220px,30vh)] w-full shrink-0 overflow-hidden bg-surface-container-low">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                <Icon name="local_cafe" className="text-5xl opacity-30" />
              </div>
            )}
          </div>

          <div className="px-6 py-5 pb-6">
            {loading && (
              <p className="py-8 text-center text-body-md text-on-surface-variant">
                Loading from menu…
              </p>
            )}

            {error && (
              <p className="mb-4 text-body-md text-red-700" role="alert">
                {error}
              </p>
            )}

            {!loading && (
              <>
                {/* 1. Legend: main protein / diet marks */}
                {(mainIngredients.length > 0 ||
                  (item.specialTags?.length ?? 0) > 0 ||
                  (item.tags?.length ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {mainIngredients.map((main) => (
                      <span
                        key={main.id}
                        className="inline-flex items-center gap-1 border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[10px] uppercase text-primary"
                      >
                        <Icon name={main.icon} className="text-sm" />
                        {main.label}
                      </span>
                    ))}
                    {item.specialTags?.map((tag) => (
                      <MenuBadgeChip key={tag} badgeId={tag} catalog={badgeCatalog} />
                    ))}
                    {item.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="border border-surface-container-highest px-2 py-0.5 font-mono text-[10px] uppercase text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 2. Title + price */}
                <h2
                  className={`font-display text-headline-md text-primary ${
                    mainIngredients.length > 0 ||
                    (item.specialTags?.length ?? 0) > 0 ||
                    (item.tags?.length ?? 0) > 0
                      ? "mt-3"
                      : ""
                  }`}
                >
                  {item.name}
                </h2>
                <p className="mt-1 font-mono text-label-mono text-primary">
                  {formatMerchantPrice(item.priceCents, currency)}
                </p>

                {/* 3. Short description */}
                {item.description && (
                  <p className="mt-4 text-body-md leading-relaxed text-on-surface">
                    {item.description}
                  </p>
                )}

                {hasCoffeeProfile && item.coffeeProfile && (
                  <MenuCoffeeProfileDisplay profile={item.coffeeProfile} />
                )}

                {hasSimpleProfile && item.simpleCategoryProfile && (
                  <MenuSimpleCategoryDisplay profile={item.simpleCategoryProfile} />
                )}

                {/* 4. Allergens & diet disclosures */}
                {disclosures.length > 0 && (
                  <div className="mt-5">
                    <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                      {copy?.allergens ?? "Allergens & diet"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {disclosures.map((preset) => (
                        <span
                          key={preset.id}
                          className="border border-surface-container-highest bg-surface-container-lowest px-2.5 py-1 text-[12px] text-on-surface"
                        >
                          {ingredientLabel(preset.id, catalog, lang)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Nutrition */}
                {hasNutrition && (
                  <div className="mt-5 grid grid-cols-2 gap-3 border border-surface-container-highest bg-surface-container-lowest p-4">
                    {item.kcal != null && (
                      <div>
                        <p className="font-mono text-[10px] uppercase text-on-surface-variant">
                          {copy?.energy ?? "Energy"}
                        </p>
                        <p className="mt-0.5 font-display text-headline-sm text-primary">
                          {item.kcal} kcal
                        </p>
                      </div>
                    )}
                    {item.sugarG != null && (
                      <div>
                        <p className="font-mono text-[10px] uppercase text-on-surface-variant">
                          {copy?.sugar ?? "Sugar"}
                        </p>
                        <p className="mt-0.5 font-display text-headline-sm text-primary">
                          {item.sugarG}g
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Recipe ingredients (not allergen labels) */}
                {showIngredients && (
                  <div className="mt-5">
                    <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                      {copy?.ingredients ?? "What's in it"}
                    </p>
                    <p className="mt-2 text-body-md leading-relaxed text-on-surface">
                      {item.ingredients}
                    </p>
                  </div>
                )}

                {showNotes && (
                  <div className="mt-5 border-l-2 border-primary/30 pl-3">
                    <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                      {copy?.notes ?? "Notes"}
                    </p>
                    <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">
                      {item.notes}
                    </p>
                  </div>
                )}

                {!item.description && !hasNutrition && !hasDetails && (
                  <p className="mt-4 text-body-md text-on-surface-variant">
                    {copy?.tapAddHint ?? "Tap add below to include this in your order."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-surface-container-highest bg-surface-container-lowest p-4">
          <button
            type="button"
            onClick={onAdd}
            disabled={loading || Boolean(error)}
            className="flex w-full items-center justify-center gap-2 bg-primary py-3.5 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
          >
            <Icon name={hasModifiers ? "tune" : "add"} />
            {hasModifiers
              ? (copy?.chooseOptions ?? "Choose options")
              : quantity > 0
                ? `${copy?.addAnother ?? "Add another"} · ${quantity} ${copy?.inCart ?? "in cart"}`
                : (copy?.addToOrder ?? "Add to order")}
          </button>
        </div>
      </div>
    </div>
  );
}
