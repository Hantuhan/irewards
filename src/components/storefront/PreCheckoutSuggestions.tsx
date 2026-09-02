"use client";

import type { StorefrontMenuItem } from "@/lib/menu/storefront";
import type { StoreSuggestion, StoreSuggestionBundle } from "@/hooks/useStoreSuggestion";
import { formatPromoLabel } from "@/lib/menu/upsell-rules";
import { Icon } from "@/components/ui/Icon";

type PreCheckoutSuggestionsProps = {
  lines: (StorefrontMenuItem & { quantity: number })[];
  allItems: StorefrontMenuItem[];
  cartTotal: number;
  suggestions: StoreSuggestionBundle;
  loading: boolean;
  currency?: string;
  onAdd: (suggestion: StoreSuggestion) => void;
  onSkip: () => void;
  onBack: () => void;
};

function ProductSuggestionCard({
  suggestion,
  allItems,
  currency,
  onAdd,
}: {
  suggestion: StoreSuggestion;
  allItems: StorefrontMenuItem[];
  currency: string;
  onAdd: (suggestion: StoreSuggestion) => void;
}) {
  if (!suggestion.itemId || !suggestion.name) return null;
  const suggestItem = allItems.find((i) => i.id === suggestion.itemId) ?? null;
  const isUpsell = suggestion.suggestType === "upsell";
  const regularPrice = suggestion.regularPriceCents ?? suggestItem?.priceCents ?? 0;
  const hasPromo =
    suggestion.promoPriceCents != null && suggestion.promoPriceCents !== regularPrice;
  const displayPrice = hasPromo
    ? formatPromoLabel(regularPrice, suggestion.promoPriceCents ?? null, currency)
    : formatPromoLabel(regularPrice, null, currency);

  return (
    <article
      className={`overflow-hidden border ${
        isUpsell
          ? "border-primary bg-primary text-on-primary"
          : "border-surface-container-highest bg-surface-container-lowest"
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-surface-container-highest bg-surface-container-low">
          {suggestItem?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={suggestItem.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="local_cafe" className="text-2xl text-on-surface-variant opacity-50" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-headline-sm text-primary">{suggestion.name}</h3>
          {suggestion.reason && (
            <p className="mt-1 text-body-md text-on-surface-variant">{suggestion.reason}</p>
          )}
          {suggestItem && (
            <div className="mt-2 font-mono text-label-mono">
              {hasPromo && (
                <span className="mr-2 text-on-surface-variant line-through">
                  {formatPromoLabel(regularPrice, null, currency)}
                </span>
              )}
              <span className={hasPromo ? "font-semibold text-primary" : "text-primary"}>
                {displayPrice}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-surface-container-highest p-4">
        <button
          type="button"
          onClick={() => onAdd(suggestion)}
          className="flex w-full items-center justify-center gap-2 bg-primary py-3 font-display text-eyebrow uppercase text-on-primary"
        >
          <Icon name="add" />
          Add to order
        </button>
      </div>
    </article>
  );
}

function GlobalSuggestionCard({
  suggestion,
  allItems,
  currency,
  onAdd,
}: {
  suggestion: StoreSuggestion;
  allItems: StorefrontMenuItem[];
  currency: string;
  onAdd: (suggestion: StoreSuggestion) => void;
}) {
  if (!suggestion.itemId || !suggestion.name) return null;
  const suggestItem = allItems.find((i) => i.id === suggestion.itemId) ?? null;
  const regularPrice = suggestion.regularPriceCents ?? suggestItem?.priceCents ?? 0;
  const hasPromo =
    suggestion.promoPriceCents != null && suggestion.promoPriceCents !== regularPrice;
  const displayPrice = hasPromo
    ? formatPromoLabel(regularPrice, suggestion.promoPriceCents ?? null, currency)
    : formatPromoLabel(regularPrice, null, currency);

  return (
    <article className="flex w-[148px] shrink-0 flex-col border border-surface-container-highest bg-surface-container-lowest">
      <div className="flex h-24 items-center justify-center border-b border-surface-container-highest bg-surface-container-low">
        {suggestItem?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={suggestItem.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name="local_cafe" className="text-2xl text-on-surface-variant opacity-50" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 font-display text-headline-sm text-primary">{suggestion.name}</h3>
        {suggestItem && (
          <div className="mt-1 font-mono text-label-mono">
            {hasPromo && (
              <span className="mr-1 text-[10px] text-on-surface-variant line-through">
                {formatPromoLabel(regularPrice, null, currency)}
              </span>
            )}
            <span className={hasPromo ? "text-primary" : "text-on-surface-variant"}>
              {displayPrice}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onAdd(suggestion)}
          className="mt-auto flex items-center justify-center gap-1 border border-primary py-2 font-display text-[11px] uppercase text-primary"
        >
          <Icon name="add" className="text-sm" />
          Add
        </button>
      </div>
    </article>
  );
}

export function PreCheckoutSuggestions({
  lines,
  allItems,
  cartTotal,
  suggestions,
  loading,
  currency = "RM",
  onAdd,
  onSkip,
  onBack,
}: PreCheckoutSuggestionsProps) {
  const hasProductSuggestions = suggestions.productSuggestions.length > 0;
  const hasGlobalSuggestions = suggestions.globalSuggestions.length > 0;
  const hasAnySuggestions = hasProductSuggestions || hasGlobalSuggestions;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-surface-container-highest px-6 pb-4 pt-12">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1 font-mono text-label-mono text-on-surface-variant"
        >
          <Icon name="arrow_back" className="text-lg" />
          Back to cart
        </button>
        <h1 className="font-display text-headline-mobile text-primary">Almost there</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Review your order and add anything else before you pay.
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 py-6 pb-32">
        <section className="border border-surface-container-highest bg-surface-container-lowest p-4">
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Your order
          </p>
          <ul className="mt-3 space-y-2">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-2 text-body-md">
                <span>
                  {line.quantity}× {line.name}
                </span>
                <span className="shrink-0 font-mono text-label-mono text-on-surface-variant">
                  {currency} {((line.priceCents * line.quantity) / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-surface-container-highest pt-3 font-display text-headline-sm">
            <span>Subtotal</span>
            <span className="font-mono text-label-mono">
              {currency} {(cartTotal / 100).toFixed(2)}
            </span>
          </div>
        </section>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-on-surface-variant">
            <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:300ms]" />
          </div>
        )}

        {!loading && hasProductSuggestions && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="restaurant" className="text-primary" />
              <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Goes well with your order
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {suggestions.productSuggestions.map((suggestion) => (
                <ProductSuggestionCard
                  key={suggestion.itemId}
                  suggestion={suggestion}
                  allItems={allItems}
                  currency={currency}
                  onAdd={onAdd}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && hasGlobalSuggestions && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="trending_up" className="text-primary" />
              <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Popular add-ons
              </p>
            </div>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {suggestions.globalSuggestions.map((suggestion) => (
                <GlobalSuggestionCard
                  key={suggestion.itemId}
                  suggestion={suggestion}
                  allItems={allItems}
                  currency={currency}
                  onAdd={onAdd}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && !hasAnySuggestions && (
          <p className="text-center text-body-md text-on-surface-variant">
            Your order looks complete. Continue to payment when you&apos;re ready.
          </p>
        )}
      </main>

      <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[382px] -translate-x-1/2 px-4">
        <button
          type="button"
          onClick={onSkip}
          className="flex w-full items-center justify-center gap-2 bg-primary py-4 font-display text-headline-sm text-on-primary shadow-xl"
        >
          Continue to payment
          <Icon name="arrow_forward" />
        </button>
      </div>
    </div>
  );
}
