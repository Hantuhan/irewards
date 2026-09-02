"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { PreCheckoutSuggestions } from "@/components/storefront/PreCheckoutSuggestions";
import { ServiceTypePicker } from "@/components/storefront/ServiceTypePicker";
import { StorefrontLanguagePicker } from "@/components/storefront/StorefrontLanguagePicker";
import { useCheckoutSettings } from "@/hooks/useCheckoutSettings";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { useStorefrontLocale } from "@/hooks/useStorefrontLocale";
import { useStoreSuggestion, type StoreSuggestion } from "@/hooks/useStoreSuggestion";
import { useTableCart } from "@/hooks/useTableCart";
import { customerRoutes } from "@/lib/navigation/routes";
import { Icon } from "@/components/ui/Icon";
import { useMemberSession } from "@/hooks/useMemberSession";
import { MobileShell } from "@/components/ui/MobileShell";
import { formatMerchantPrice } from "@/lib/merchant/currency";
import { calculateOrderTotals } from "@/lib/services/order-totals";

type CartShellProps = {
  merchantSlug: string;
  tableId: string;
};

type PaymentMethod = "duitnow" | "card" | "wallet";
type CartStep = "review" | "suggestions" | "payment";

export function CartShell({ merchantSlug, tableId }: CartShellProps) {
  const { lang, setLang, copy } = useStorefrontLocale(merchantSlug, ["en", "zh", "ms"]);
  const { allItems, languages, loading } = useStorefrontMenu(merchantSlug, lang);
  const {
    cartCount,
    cartTotal,
    cartLines,
    checkoutLines,
    serviceType,
    setServiceType,
    setLineQuantity,
    setLinePackedForTakeaway,
    addItem,
  } = useTableCart(merchantSlug, tableId, allItems);
  const [step, setStep] = useState<CartStep>("review");
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("duitnow");
  const [promoCode, setPromoCode] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const { member } = useMemberSession();
  const { settings: chargeSettings, currency } = useCheckoutSettings(merchantSlug);
  const routes = customerRoutes(merchantSlug, tableId);

  const orderTotals = useMemo(() => {
    if (!chargeSettings) return null;
    return calculateOrderTotals(cartTotal, 0, chargeSettings);
  }, [cartTotal, chargeSettings]);

  const formattedTotal = orderTotals
    ? formatMerchantPrice(orderTotals.totalCents, currency)
    : formatMerchantPrice(cartTotal, currency);

  const itemById = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);

  const cartItemIds = useMemo(
    () => [...new Set(cartLines.map((line) => line.itemId))],
    [cartLines],
  );

  const { suggestions, loading: suggestLoading, refresh: refreshSuggestions } = useStoreSuggestion({
    merchantSlug,
    cartItemIds,
    cartTotalCents: cartTotal,
    memberTier: null,
    usualOrder: member?.usualOrder ?? undefined,
    enabled: step === "suggestions",
  });

  const suggestionLines = useMemo(
    () =>
      cartLines.map((line) => ({
        id: line.itemId,
        name: line.itemName,
        description: "",
        priceCents: line.unitPriceCents,
        category: "",
        menuItemId: line.itemId,
        quantity: line.quantity,
      })),
    [cartLines],
  );

  const startCheckout = useCallback(async () => {
    setCheckoutState("loading");
    setError(null);
    try {
      const response = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          merchantSlug,
          tableId,
          serviceType,
          items: checkoutLines,
          customerId: member?.id,
          promoCode: promoCode.trim() || undefined,
          pointsToRedeem: pointsToRedeem > 0 ? pointsToRedeem : undefined,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        thanksUrl?: string;
        paymentUrl?: string;
        mode?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.mode === "dev" && data.thanksUrl) {
        window.location.href = data.thanksUrl;
        return;
      }
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      throw new Error("No payment URL returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCheckoutState("idle");
    }
  }, [
    checkoutLines,
    merchantSlug,
    tableId,
    member?.id,
    promoCode,
    pointsToRedeem,
    serviceType,
  ]);

  function handleAddSuggestion(suggestion: StoreSuggestion) {
    if (!suggestion.itemId) return;
    addItem(suggestion.itemId, 1, suggestion.promoPriceCents);
    void refreshSuggestions();
  }

  if (loading) {
    return (
      <MobileShell>
        <p className="p-12 text-center text-on-surface-variant">Loading cart…</p>
      </MobileShell>
    );
  }

  if (step === "suggestions" && cartLines.length > 0) {
    return (
      <MobileShell>
        <PreCheckoutSuggestions
          lines={suggestionLines}
          allItems={allItems}
          cartTotal={cartTotal}
          suggestions={suggestions}
          loading={suggestLoading}
          onAdd={handleAddSuggestion}
          onSkip={() => setStep("payment")}
          onBack={() => setStep("review")}
        />
        <CustomerMobileNav
          merchantSlug={merchantSlug}
          tableId={tableId}
          active="cart"
          cartCount={cartCount}
          labels={{
            shop: copy.shop,
            rewards: copy.rewards,
            cart: copy.cart,
            profile: copy.profile,
          }}
        />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="border-b border-surface-container-highest px-6 pb-6 pt-12">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-mobile text-primary">{copy.cart}</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              {copy.table} {tableId} · {cartCount} item{cartCount === 1 ? "" : "s"}
              {serviceType === "takeaway" ? " · Take away" : " · Dine in"}
            </p>
          </div>
          {languages.length > 1 && (
            <StorefrontLanguagePicker languages={languages} value={lang} onChange={setLang} />
          )}
        </div>
        {step === "payment" && (
          <button
            type="button"
            onClick={() => setStep("suggestions")}
            className="mt-2 flex items-center gap-1 font-mono text-label-mono text-on-surface-variant"
          >
            <Icon name="arrow_back" className="text-lg" />
            Back to suggestions
          </button>
        )}
      </header>

      <main className="flex flex-col gap-6 px-6 py-6 pb-32">
        {cartLines.length === 0 ? (
          <div className="zenith-surface flex flex-col items-center gap-4 p-8 text-center">
            <Icon name="shopping_bag" className="text-4xl text-outline-variant" />
            <p className="text-body-md text-on-surface-variant">Your cart is empty.</p>
            <Link
              href={routes.shop}
              className="bg-primary px-6 py-3 font-display text-headline-sm text-on-primary"
            >
              Browse menu
            </Link>
          </div>
        ) : step === "review" ? (
          <>
            <section>
              <h2 className="mb-3 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Order type
              </h2>
              <ServiceTypePicker value={serviceType} onChange={setServiceType} />
            </section>

            <ul className="flex flex-col gap-4">
              {cartLines.map((line) => {
                const menuItem = itemById.get(line.itemId);
                const canPackToGo =
                  serviceType === "dine_in" && menuItem?.takeawayCharge?.enabled === true;

                return (
                  <li key={line.key} className="zenith-surface flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-display text-headline-sm text-primary">{line.itemName}</h3>
                        {line.selections.length > 0 && (
                          <p className="mt-1 text-body-md text-on-surface-variant">
                            {line.selections
                              .map((s) =>
                                s.quantity > 1 ? `${s.optionName} ×${s.quantity}` : s.optionName,
                              )
                              .join(", ")}
                          </p>
                        )}
                        <p className="mt-1 font-mono text-label-mono text-on-surface-variant">
                          RM {(line.unitPriceCents / 100).toFixed(2)} each
                          {line.takeawaySurchargeCents > 0 && (
                            <span className="ml-1 text-primary">incl. takeaway</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLineQuantity(line.key, line.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center border border-surface-container-highest"
                        >
                          <Icon name="remove" />
                        </button>
                        <span className="w-6 text-center font-mono text-label-mono">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setLineQuantity(line.key, line.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center border border-surface-container-highest"
                        >
                          <Icon name="add" />
                        </button>
                      </div>
                    </div>

                    {canPackToGo && (
                      <label className="flex items-center gap-2 text-body-md text-on-surface-variant">
                        <input
                          type="checkbox"
                          checked={line.packedForTakeaway}
                          onChange={(e) => setLinePackedForTakeaway(line.key, e.target.checked)}
                          className="h-4 w-4"
                        />
                        Pack this item to go
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="zenith-surface flex justify-between p-4 font-display text-headline-sm">
              <span>Subtotal</span>
              <span className="font-mono text-label-mono">RM {(cartTotal / 100).toFixed(2)}</span>
            </div>

            <p className="text-center text-body-md text-on-surface-variant">
              Tap continue to review add-ons before payment.
            </p>

            <button
              type="button"
              onClick={() => setStep("suggestions")}
              className="flex w-full items-center justify-center gap-2 bg-primary py-4 font-display text-headline-sm text-on-primary"
            >
              Continue
              <Icon name="arrow_forward" />
            </button>
          </>
        ) : (
          <>
            <ul className="flex flex-col gap-2 border border-surface-container-highest bg-surface-container-lowest p-4">
              {cartLines.map((line) => (
                <li key={line.key} className="flex justify-between text-body-md">
                  <span>
                    {line.quantity}× {line.itemName}
                  </span>
                  <span className="font-mono text-label-mono">
                    RM {((line.unitPriceCents * line.quantity) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <section>
              <h2 className="mb-3 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Promo & points
              </h2>
              <div className="flex flex-col gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Promo code"
                  className="border border-surface-container-highest px-3 py-2"
                />
                {member && member.points > 0 && (
                  <label className="flex items-center justify-between border border-surface-container-highest px-3 py-2">
                    <span className="text-body-md">Redeem points (max {member.points})</span>
                    <input
                      type="number"
                      min={0}
                      max={member.points}
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                      className="w-20 border border-surface-container-highest px-2 py-1 text-right"
                    />
                  </label>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Payment method
              </h2>
              <div className="flex flex-col gap-2">
                {(
                  [
                    { id: "duitnow", label: "DuitNow QR", icon: "qr_code_2" },
                    { id: "card", label: "Card", icon: "credit_card" },
                    { id: "wallet", label: "E-wallet", icon: "account_balance_wallet" },
                  ] as const
                ).map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-3 border p-4 text-left ${
                      paymentMethod === method.id
                        ? "border-primary bg-primary text-on-primary"
                        : "border-surface-container-highest"
                    }`}
                  >
                    <Icon name={method.icon} />
                    <span className="font-display text-headline-sm">{method.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="zenith-surface flex flex-col gap-2 p-4">
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>Subtotal</span>
                <span className="font-mono text-label-mono">
                  {formatMerchantPrice(cartTotal, currency)}
                </span>
              </div>
              {orderTotals && orderTotals.serviceChargeCents > 0 && (
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>{orderTotals.serviceChargeLabel ?? "Service charge"}</span>
                  <span className="font-mono text-label-mono">
                    {formatMerchantPrice(orderTotals.serviceChargeCents, currency)}
                  </span>
                </div>
              )}
              {orderTotals && orderTotals.taxCents > 0 && (
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>{orderTotals.taxLabel ?? "Tax"}</span>
                  <span className="font-mono text-label-mono">
                    {formatMerchantPrice(orderTotals.taxCents, currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-surface-container-highest pt-2 font-display text-headline-sm">
                <span>Total</span>
                <span className="font-mono text-label-mono">{formattedTotal}</span>
              </div>
            </section>

            {error && <p className="text-body-md text-red-700">{error}</p>}

            <button
              type="button"
              disabled={checkoutState === "loading"}
              onClick={startCheckout}
              className="flex w-full items-center justify-center gap-2 bg-primary py-4 font-display text-headline-sm text-on-primary disabled:opacity-60"
            >
              {checkoutState === "loading" ? "Starting…" : "Pay now"}
              <Icon name="arrow_forward" />
            </button>
          </>
        )}
      </main>

      <CustomerMobileNav
        merchantSlug={merchantSlug}
        tableId={tableId}
        active="cart"
        cartCount={cartCount}
        labels={{
          shop: copy.shop,
          rewards: copy.rewards,
          cart: copy.cart,
          profile: copy.profile,
        }}
      />
    </MobileShell>
  );
}
