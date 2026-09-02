"use client";

import { formatMerchantPrice } from "@/lib/merchant/currency";
import type { MenuBadge } from "@/lib/menu/menu-badges";
import type { StorefrontCategory, StorefrontMenuItem } from "@/lib/menu/storefront";
import { MenuBadgeChip } from "@/components/storefront/MenuBadgeChip";
import { StorefrontLanguagePicker } from "@/components/storefront/StorefrontLanguagePicker";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import type { StorefrontCopy } from "@/lib/i18n/storefront-locale";
import { Icon } from "@/components/ui/Icon";

type StorefrontMenuHeaderProps = {
  storeName: string;
  tableId: string;
  guestLabel: string;
  languages?: ProgramLanguage[];
  language?: ProgramLanguage;
  onLanguageChange?: (lang: ProgramLanguage) => void;
  copy?: StorefrontCopy;
};

export function StorefrontMenuHeader({
  storeName,
  tableId,
  guestLabel,
  languages = [],
  language,
  onLanguageChange,
  copy,
}: StorefrontMenuHeaderProps) {
  const tableLabel = copy?.table ?? "Table";
  return (
    <header className="border-b border-surface-container-highest px-6 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-headline-sm font-bold text-primary">{storeName}</h1>
          <p className="mt-0.5 text-body-md text-on-surface-variant">
            {tableLabel} {tableId} · {guestLabel}
          </p>
        </div>
        {language && onLanguageChange && languages.length > 1 && (
          <StorefrontLanguagePicker
            languages={languages}
            value={language}
            onChange={onLanguageChange}
          />
        )}
      </div>
    </header>
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
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-6 py-4">
      {categories.map((cat) => {
        const active = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`shrink-0 px-3 py-1.5 font-mono text-label-mono transition-colors ${
              active
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:text-primary"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
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
    <div className="flex items-center justify-between gap-3 border border-surface-container-highest p-4">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        {item.specialTags && item.specialTags.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {item.specialTags.map((tag) => (
              <MenuBadgeChip key={tag} badgeId={tag} catalog={badgeCatalog} />
            ))}
          </div>
        )}
        <p className="font-display text-headline-sm text-primary">{item.name}</p>
        <p className="mt-0.5 font-mono text-label-mono text-on-surface-variant">
          {formatMerchantPrice(item.priceCents, currency)}
        </p>
        {quantityInCart > 0 && (
          <p className="mt-1 font-mono text-[10px] text-primary">×{quantityInCart} in cart</p>
        )}
      </button>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add ${item.name}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center text-primary"
      >
        <Icon name="add" className="text-2xl" />
      </button>
    </div>
  );
}
