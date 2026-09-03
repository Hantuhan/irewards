"use client";

import { HorizontalScrollCue } from "@/components/ui/HorizontalScrollCue";
import { formatMerchantPrice } from "@/lib/merchant/currency";
import type { MenuBadge } from "@/lib/menu/menu-badges";
import type { StorefrontCategory, StorefrontMenuItem } from "@/lib/menu/storefront";
import { MenuBadgeChip } from "@/components/storefront/MenuBadgeChip";
import { StorefrontLanguagePicker } from "@/components/storefront/StorefrontLanguagePicker";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import type { StorefrontCopy } from "@/lib/i18n/storefront-locale";
import { Icon } from "@/components/ui/Icon";

export type StorefrontBannerData = {
  title: string;
  text: string | null;
  imageUrl: string | null;
};

export function StorefrontBannerVisual({ banner }: { banner: StorefrontBannerData }) {
  if (banner.imageUrl) {
    return (
      <div className="relative aspect-[3.2/1] w-full bg-surface-container-low">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
        {(banner.title || banner.text) && (
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
            <p className="font-display text-eyebrow uppercase text-white">{banner.title}</p>
            {banner.text && <p className="mt-1 text-body-md text-white/90">{banner.text}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low p-4">
      <p className="font-display text-eyebrow uppercase text-on-surface">{banner.title}</p>
      {banner.text && <p className="mt-1 text-body-md text-on-surface-variant">{banner.text}</p>}
    </div>
  );
}

type StorefrontMenuHeaderProps = {
  storeName: string;
  tableId: string;
  /** e.g. "DINE-IN · ALEX" or "Guest" */
  serviceGuestLine: string;
  languages?: ProgramLanguage[];
  language?: ProgramLanguage;
  onLanguageChange?: (lang: ProgramLanguage) => void;
  copy?: StorefrontCopy;
};

export function StorefrontMenuHeader({
  storeName,
  tableId,
  serviceGuestLine,
  languages = [],
  language,
  onLanguageChange,
  copy,
}: StorefrontMenuHeaderProps) {
  const tableLabel = copy?.table ?? "Table";
  return (
    <header className="sticky top-0 z-30 bg-surface-container-lowest/95 px-5 pb-1 pt-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-[17px] font-bold leading-tight tracking-tight text-on-surface">
              {storeName}
            </h1>
            <span className="shrink-0 rounded bg-surface-container px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-on-surface">
              {tableLabel} {tableId}
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            {serviceGuestLine}
          </p>
        </div>
        {language && onLanguageChange && languages.length > 1 && (
          <StorefrontLanguagePicker
            languages={languages}
            value={language}
            onChange={onLanguageChange}
            variant="pill"
          />
        )}
      </div>
    </header>
  );
}

type StorefrontStampProgressProps = {
  filled: number;
  size: number;
};

/** Compact circular stamp row — cafe storefront mock. */
export function StorefrontStampProgress({ filled, size }: StorefrontStampProgressProps) {
  const holes = Math.max(2, Math.min(12, size));
  const stamped = Math.max(0, Math.min(holes, filled));

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
          Rewards progress
        </p>
        <p className="font-mono text-[11px] font-medium text-on-surface">
          {stamped}/{holes}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: holes }, (_, i) => {
          const on = i < stamped;
          const isGoal = i === holes - 1;
          return (
            <span
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                on
                  ? "bg-primary text-on-primary"
                  : isGoal
                    ? "border border-on-surface/30 text-on-surface-variant"
                    : "border border-on-surface/15 bg-surface-container-lowest"
              }`}
              aria-hidden
            >
              {on ? (
                <Icon name="star" className="text-[14px]" filled />
              ) : isGoal ? (
                <Icon name="local_cafe" className="text-[14px]" />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type StorefrontCategoryPillsProps = {
  categories: StorefrontCategory[];
  activeCategory: string;
  onSelect: (categoryId: string) => void;
};

export function StorefrontCategoryPills({
  categories,
  activeCategory,
  onSelect,
}: StorefrontCategoryPillsProps) {
  return (
    <HorizontalScrollCue
      className="border-b border-surface-container-highest px-5 pt-1"
      contentClassName="gap-5"
      fadeFromClass="from-surface-container-lowest"
      controlClassName="border-surface-container-highest bg-surface-container-lowest"
      ariaLabel="Menu categories"
    >
      {categories.map((cat) => {
        const active = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`relative shrink-0 pb-3 pt-2 font-display text-[15px] transition-colors ${
              active
                ? "font-semibold text-on-surface"
                : "font-normal text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {cat.label}
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-[2.5px] bg-primary" />
            )}
          </button>
        );
      })}
    </HorizontalScrollCue>
  );
}

type StorefrontUsualCardProps = {
  item: StorefrontMenuItem;
  subtitle?: string | null;
  currency?: "MYR" | "SGD";
  onAdd: () => void;
  onOpen: () => void;
};

/** Compact vertical card for the Your usual carousel. */
export function StorefrontUsualCard({
  item,
  subtitle,
  currency = "MYR",
  onAdd,
  onOpen,
}: StorefrontUsualCardProps) {
  return (
    <article className="flex w-[148px] shrink-0 flex-col border border-surface-container-highest bg-surface-container-lowest">
      <button type="button" onClick={onOpen} className="text-left">
        <div className="flex h-24 items-center justify-center overflow-hidden border-b border-surface-container-highest bg-surface-container-low">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="local_cafe" className="text-2xl text-on-surface-variant opacity-50" />
          )}
        </div>
        <div className="px-3 pb-1 pt-2.5">
          <p className="line-clamp-2 min-h-[2.4em] font-display text-[14px] font-semibold leading-snug text-on-surface">
            {item.name}
          </p>
          {subtitle && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-on-surface-variant">{subtitle}</p>
          )}
          <p className="mt-1.5 font-mono text-[12px] text-on-surface">
            {formatMerchantPrice(item.priceCents, currency)}
          </p>
        </div>
      </button>
      <div className="mt-auto p-2.5 pt-1">
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${item.name}`}
          className="flex w-full items-center justify-center gap-1 border border-primary py-2 font-display text-[11px] uppercase text-primary"
        >
          <Icon name="add" className="text-sm" />
          Add
        </button>
      </div>
    </article>
  );
}

type StorefrontMenuItemRowProps = {
  item: StorefrontMenuItem;
  quantityInCart: number;
  currency?: "MYR" | "SGD";
  badgeCatalog?: MenuBadge[];
  onOpen: () => void;
  onAdd: (event: React.MouseEvent) => void;
};

export function StorefrontMenuItemRow({
  item,
  quantityInCart,
  currency = "MYR",
  badgeCatalog = [],
  onOpen,
  onAdd,
}: StorefrontMenuItemRowProps) {
  return (
    <article className="border-b border-surface-container-highest py-4 last:border-b-0">
      <div className="flex items-start gap-4">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          {item.specialTags && item.specialTags.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {item.specialTags.map((tag) => (
                <MenuBadgeChip key={tag} badgeId={tag} catalog={badgeCatalog} />
              ))}
            </div>
          )}
          <p className="font-display text-[16px] font-semibold leading-snug text-on-surface">
            {item.name}
          </p>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-on-surface-variant">
              {item.description}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="font-display text-[14px] font-medium text-on-surface">
              {formatMerchantPrice(item.priceCents, currency)}
            </span>
            {quantityInCart > 0 && (
              <span className="font-mono text-[10px] text-on-surface">×{quantityInCart}</span>
            )}
          </div>
        </button>

        <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden bg-surface-container-low">
          <button type="button" onClick={onOpen} className="absolute inset-0" aria-label={item.name}>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-on-surface-variant/35">
                <Icon name="restaurant" className="text-3xl" />
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${item.name}`}
            className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center border border-on-surface/10 bg-white text-on-surface shadow-sm transition-transform active:scale-95"
          >
            <Icon name="add" className="text-lg" />
          </button>
        </div>
      </div>
    </article>
  );
}
