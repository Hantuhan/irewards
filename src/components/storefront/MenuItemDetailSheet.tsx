"use client";

import { Icon } from "@/components/ui/Icon";
import { MenuBadgeChip } from "@/components/storefront/MenuBadgeChip";
import { MenuCoffeeProfileDisplay } from "@/components/storefront/MenuCoffeeProfileDisplay";
import type { MenuBadge } from "@/lib/menu/menu-badges";
import type { StorefrontCopy } from "@/lib/i18n/storefront-locale";
import { coffeeProfileHasDisplay } from "@/lib/menu/coffee-profile";
import { isCoffeeMenuCategory } from "@/lib/menu/coffee-templates";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";

type MenuItemDetailSheetProps = {
  item: StorefrontMenuItem;
  quantity: number;
  currency?: string;
  hasModifiers?: boolean;
  loading?: boolean;
  error?: string | null;
  badgeCatalog?: MenuBadge[];
  copy?: StorefrontCopy;
  onClose: () => void;
  onAdd: () => void;
};

export function MenuItemDetailSheet({
  item,
  quantity,
  currency = "RM",
  hasModifiers = false,
  loading = false,
  error = null,
  badgeCatalog = [],
  copy,
  onClose,
  onAdd,
}: MenuItemDetailSheetProps) {
  const isCoffeeItem = isCoffeeMenuCategory(item.category);
  const hasCoffeeProfile =
    isCoffeeItem &&
    item.coffeeProfile != null &&
    coffeeProfileHasDisplay(item.coffeeProfile);
  const hasNutrition =
    !isCoffeeItem && (item.kcal != null || item.sugarG != null);
  const showIngredients = !isCoffeeItem && Boolean(item.ingredients);
  const showNotes = !isCoffeeItem && Boolean(item.notes);
  const hasDetails = showIngredients || showNotes || hasCoffeeProfile;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close menu item"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-[382px] flex-col overflow-hidden bg-surface shadow-2xl sm:max-h-[85vh] sm:rounded-lg">
        <div className="relative aspect-[4/3] w-full shrink-0 bg-surface-container-low">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <Icon name="local_cafe" className="text-6xl opacity-30" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-on-surface shadow-sm backdrop-blur"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
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
          <div className="flex flex-wrap gap-1.5">
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

          <h2 className="mt-3 font-display text-headline-md text-primary">{item.name}</h2>
          <p className="mt-1 font-mono text-label-mono text-primary">
            {currency} {(item.priceCents / 100).toFixed(2)}
          </p>

          {item.description && (
            <p className="mt-4 text-body-md leading-relaxed text-on-surface">{item.description}</p>
          )}

          {hasCoffeeProfile && item.coffeeProfile && (
            <MenuCoffeeProfileDisplay profile={item.coffeeProfile} />
          )}

          {hasNutrition && (
            <div className="mt-5 grid grid-cols-2 gap-3 border border-surface-container-highest bg-surface-container-lowest p-4">
              {item.kcal != null && (
                <div>
                  <p className="font-mono text-[10px] uppercase text-on-surface-variant">
                {copy?.energy ?? "Energy"}
              </p>
                  <p className="mt-0.5 font-display text-headline-sm text-primary">{item.kcal} kcal</p>
                </div>
              )}
              {item.sugarG != null && (
                <div>
                  <p className="font-mono text-[10px] uppercase text-on-surface-variant">
                {copy?.sugar ?? "Sugar"}
              </p>
                  <p className="mt-0.5 font-display text-headline-sm text-primary">{item.sugarG}g</p>
                </div>
              )}
            </div>
          )}

          {showIngredients && (
            <div className="mt-5">
              <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                {copy?.ingredients ?? "Ingredients"}
              </p>
              <p className="mt-2 text-body-md leading-relaxed text-on-surface">{item.ingredients}</p>
            </div>
          )}

          {showNotes && (
            <div className="mt-5 border-l-2 border-primary/30 pl-3">
              <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                {copy?.notes ?? "Notes"}
              </p>
              <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">{item.notes}</p>
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

        <div className="shrink-0 border-t border-surface-container-highest bg-surface-container-lowest p-4">
          <button
            type="button"
            onClick={onAdd}
            disabled={loading || Boolean(error)}
            className="flex w-full items-center justify-center gap-2 bg-primary py-3.5 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
          >
            <Icon name={hasModifiers ? "tune" : "add"} />
            {hasModifiers
              ? copy?.chooseOptions ?? "Choose options"
              : quantity > 0
                ? `${copy?.addAnother ?? "Add another"} · ${quantity} ${copy?.inCart ?? "in cart"}`
                : copy?.addToOrder ?? "Add to order"}
          </button>
        </div>
      </div>
    </div>
  );
}
