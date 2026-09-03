"use client";

import Image from "next/image";
import type { ReactNode, RefObject } from "react";
import { Icon } from "@/components/ui/Icon";
import { currencyDisplayCode, type MerchantCurrency } from "@/lib/merchant/currency";

function EditorCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border border-surface-container-highest bg-surface-container-lowest ${className}`}
    >
      <div className="border-b border-surface-container-highest px-5 py-4">
        <p className="font-display text-[15px] font-semibold text-primary">{title}</p>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export type ProductEditorShellProps = {
  isNewItem: boolean;
  productName: string;
  categoryLabel: string | null;
  currency: MerchantCurrency;
  active: boolean;
  onActiveChange: (active: boolean) => void;
  completing: boolean;
  completeHint: string | null;
  onCompleteWithAi: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  onPreview?: () => void;
  onDuplicate?: () => void;
  /** Essential details */
  name: string;
  onNameChange: (value: string) => void;
  priceInput: string;
  onPriceChange: (value: string) => void;
  onPriceBlur: () => void;
  categorySlug: string;
  categories: Array<{ slug: string; label: string }>;
  onCategoryChange: (slug: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionLocaleTabs?: ReactNode;
  /** Photo */
  imageUrl: string | null;
  uploadingPhoto: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPickPhoto: () => void;
  onPhotoSelected: (file: File) => void;
  onRemovePhoto: () => void;
  /** Service */
  availableDineIn: boolean;
  availableTakeaway: boolean;
  onToggleDineIn: () => void;
  onToggleTakeaway: () => void;
  takeawayChargeSlot: ReactNode;
  availabilitySlot: ReactNode;
  /** Product detail page template slots (eyebrow, hero caption, stats, note prompt) */
  detailSlot?: ReactNode;
  /** Nested editors */
  modifiersSlot: ReactNode;
  mainIngredientsSlot?: ReactNode;
  dietarySlot: ReactNode;
  badgesSlot?: ReactNode;
  upsellsSlot: ReactNode;
};

export function ProductEditorShell({
  isNewItem,
  productName,
  categoryLabel,
  currency,
  active,
  onActiveChange,
  completing,
  completeHint,
  onCompleteWithAi,
  onCancel,
  onSubmit,
  onPreview,
  onDuplicate,
  name,
  onNameChange,
  priceInput,
  onPriceChange,
  onPriceBlur,
  categorySlug,
  categories,
  onCategoryChange,
  description,
  onDescriptionChange,
  descriptionLocaleTabs,
  imageUrl,
  uploadingPhoto,
  fileInputRef,
  onPickPhoto,
  onPhotoSelected,
  onRemovePhoto,
  availableDineIn,
  availableTakeaway,
  onToggleDineIn,
  onToggleTakeaway,
  takeawayChargeSlot,
  availabilitySlot,
  detailSlot,
  modifiersSlot,
  mainIngredientsSlot,
  dietarySlot,
  badgesSlot,
  upsellsSlot,
}: ProductEditorShellProps) {
  const title = productName.trim() || (isNewItem ? "New product" : "Untitled product");
  const descLen = description.length;
  const currencyCode = currencyDisplayCode(currency);

  return (
    <div className="mb-8 flex flex-col gap-5">
      {/* Header */}
      <header className="flex flex-col gap-4 border border-surface-container-highest bg-surface-container-lowest px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            Catalog <span className="mx-1 text-outline-variant">›</span> Menu
            {categoryLabel ? (
              <>
                <span className="mx-1 text-outline-variant">›</span>
                {categoryLabel}
              </>
            ) : null}
            {productName.trim() ? (
              <>
                <span className="mx-1 text-outline-variant">›</span>
                <span className="text-primary">{productName.trim()}</span>
              </>
            ) : null}
          </p>
          <h1 className="mt-2 font-display text-[26px] font-bold leading-tight tracking-tight text-primary">
            {title}
          </h1>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            Enter product title (and optional short description), then Complete with AI fills
            details, nutrition, translations, and upsells.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCompleteWithAi}
              disabled={completing}
              className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-on-primary transition-colors hover:bg-surface-tint disabled:opacity-50"
              title="AI fills description, ingredients, nutrition, translations, and upsells from the product title (+ short description if set)"
            >
              <Icon name="auto_awesome" className="text-[18px]" />
              <span className="font-display text-[13px] font-semibold">
                {completing ? "Completing…" : "Complete with AI"}
              </span>
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 border border-surface-container-highest bg-surface-container-low px-3 py-2">
              <span
                role="switch"
                aria-checked={active}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  active ? "bg-primary" : "bg-outline-variant"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  onActiveChange(!active);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onActiveChange(!active);
                  }
                }}
                tabIndex={0}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    active ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
                Live on table QR
              </span>
            </label>
          </div>
          {completeHint ? (
            <p className="max-w-sm text-right text-[12px] text-on-surface-variant">
              {completeHint}
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <EditorCard
            title="Essential details"
            description="Name, category, price, and the short menu description diners see."
          >
            <div className="flex flex-col gap-4">
              <label>
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                  Product title
                </span>
                <input
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="e.g. Almond Croissant Au Beurre"
                  required
                  className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2.5 text-[15px] focus:border-primary focus:outline-none"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                    Menu category
                  </span>
                  <select
                    value={categorySlug}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2.5"
                  >
                    {categories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                    Selling price ({currencyCode})
                  </span>
                  <div className="flex items-center gap-2 border border-surface-container-highest bg-surface-container-lowest px-3 py-2.5 focus-within:border-primary">
                    <span className="shrink-0 font-mono text-[11px] text-on-surface-variant">
                      {currencyCode}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={priceInput}
                      onChange={(e) => onPriceChange(e.target.value)}
                      onBlur={onPriceBlur}
                      placeholder="0.00"
                      required
                      className="w-full border-0 bg-transparent font-mono text-[15px] focus:outline-none"
                    />
                  </div>
                </label>
              </div>

              <div>
                {descriptionLocaleTabs ?? (
                  <>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                        Item description
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        {descLen} / 250
                      </span>
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => onDescriptionChange(e.target.value.slice(0, 250))}
                      rows={4}
                      maxLength={250}
                      placeholder="Buttery laminated pastry finished with toasted almonds…"
                      className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2.5 text-[14px] leading-relaxed focus:border-primary focus:outline-none"
                    />
                  </>
                )}
              </div>
            </div>
          </EditorCard>

          <EditorCard
            title="Cafe modifiers & options"
            description="Serving styles and paid add-ons diners pick on the table QR menu."
          >
            {modifiersSlot}
          </EditorCard>

          <EditorCard
            title="Fulfillment & availability"
            description="Where this sells and when diners can order it."
          >
            <div className="flex flex-col gap-5">
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                  Enabled dining modes
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onToggleDineIn}
                    className={`inline-flex items-center gap-1.5 border px-3 py-2 text-[13px] transition-colors ${
                      availableDineIn
                        ? "border-primary bg-primary text-on-primary"
                        : "border-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    <Icon name="restaurant" className="text-base" />
                    Dine-in
                  </button>
                  <button
                    type="button"
                    onClick={onToggleTakeaway}
                    className={`inline-flex items-center gap-1.5 border px-3 py-2 text-[13px] transition-colors ${
                      availableTakeaway
                        ? "border-primary bg-primary text-on-primary"
                        : "border-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    <Icon name="shopping_bag" className="text-base" />
                    Takeaway
                  </button>
                </div>
              </div>

              {availableTakeaway ? (
                <div className="border border-dashed border-surface-container-highest bg-surface-container-low p-4">
                  {takeawayChargeSlot}
                </div>
              ) : null}

              <div className="border-t border-surface-container-highest pt-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                  Available time
                </p>
                {availabilitySlot}
              </div>
            </div>
          </EditorCard>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <EditorCard
            title="Product visual"
            description="Hero photo on the diner menu sheet."
          >
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onPickPhoto}
                className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden border border-surface-container-highest bg-surface-container-low"
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                    <Icon name="add_photo_alternate" className="text-3xl" />
                    <span className="font-mono text-[10px] uppercase tracking-wider">
                      Add photo
                    </span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPhotoSelected(file);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onPickPhoto}
                  disabled={uploadingPhoto}
                  className="border border-surface-container-highest px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-primary disabled:opacity-50"
                >
                  {uploadingPhoto ? "Uploading…" : "Change photo"}
                </button>
                {imageUrl ? (
                  <button
                    type="button"
                    onClick={onRemovePhoto}
                    className="border border-surface-container-highest px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <p className="text-[12px] leading-relaxed text-on-surface-variant">
                JPEG, PNG, or WebP · max 2 MB. Best:{" "}
                <span className="text-on-surface">1:1</span> (menu list) or{" "}
                <span className="text-on-surface">4:3</span> (detail sheet). Other ratios are
                cropped to fit.
              </p>
            </div>
          </EditorCard>

          {detailSlot ? (
            <EditorCard
              title="Product detail page"
              description="Editorial slots on the diner product page: category line, hero caption, spec stats and the kitchen-note prompt. Every product shares the same template."
            >
              {detailSlot}
            </EditorCard>
          ) : null}

          {mainIngredientsSlot ? (
            <EditorCard
              title="Main ingredients"
              description="Headline proteins / diet tags for the cafe legend."
            >
              {mainIngredientsSlot}
            </EditorCard>
          ) : null}

          <EditorCard
            title="Dietary & allergens"
            description="Disclosures shown on the diner menu. Complete with AI can fill these."
          >
            {dietarySlot}
          </EditorCard>

          {badgesSlot ? (
            <EditorCard title="Menu badges" description="Promo chips on the storefront list.">
              {badgesSlot}
            </EditorCard>
          ) : null}

          <EditorCard
            title="Pairing upsells"
            description="Automated 1-tap recommendations at QR checkout."
          >
            {upsellsSlot}
            <p className="mt-4 text-[11px] leading-relaxed text-on-surface-variant">
              Suggested at table QR checkout to increase pastry & beverage cross-sell.
            </p>
          </EditorCard>
        </div>
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border border-surface-container-highest bg-surface-container-lowest px-5 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-on-surface-variant">
          {isNewItem
            ? "Draft — save to publish this item to your table QR menu."
            : "Save to push updates live on table QR ordering."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-surface-container-highest px-4 py-2.5 text-[13px] text-on-surface-variant"
          >
            Cancel
          </button>
          {onDuplicate ? (
            <button
              type="button"
              onClick={onDuplicate}
              className="border border-surface-container-highest px-4 py-2.5 text-[13px] text-primary"
            >
              Duplicate item
            </button>
          ) : null}
          {onPreview ? (
            <button
              type="button"
              onClick={onPreview}
              className="inline-flex items-center gap-1.5 border border-primary px-4 py-2.5 text-[13px] text-primary"
            >
              <Icon name="visibility" className="text-[18px]" />
              Preview
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            className="bg-primary px-5 py-2.5 font-display text-[13px] font-semibold text-on-primary"
          >
            {isNewItem ? "Save & publish to menu" : "Save & publish"}
          </button>
        </div>
      </footer>
    </div>
  );
}
