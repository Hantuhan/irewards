"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { PreCheckoutSuggestions } from "@/components/storefront/PreCheckoutSuggestions";
import { ServiceTypePicker } from "@/components/storefront/ServiceTypePicker";
import { StorefrontLanguagePicker } from "@/components/storefront/StorefrontLanguagePicker";
import { useCheckoutSettings } from "@/hooks/useCheckoutSettings";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { useStorefrontLocale } from "@/hooks/useStorefrontLocale";
import { pointsUnit } from "@/lib/i18n/storefront-locale";
import { useStoreSuggestion, type StoreSuggestion } from "@/hooks/useStoreSuggestion";
import { useTableCart } from "@/hooks/useTableCart";
import { usePointsPreview } from "@/hooks/usePointsPreview";
import { customerRoutes } from "@/lib/navigation/routes";
import { Icon } from "@/components/ui/Icon";
import { useMemberSession } from "@/hooks/useMemberSession";
import { MobileShell } from "@/components/ui/MobileShell";
import { formatMerchantPrice } from "@/lib/merchant/currency";
import { calculateOrderTotals } from "@/lib/services/order-totals";
import { pointsDiscountCents } from "@/lib/loyalty/points";
import { defaultSelections } from "@/lib/menu/modifiers";
import { applyLevelDiscount } from "@/lib/loyalty/tiers";
import type { StorefrontPaymentMethod } from "@/lib/payments/hitpay";

type CartShellProps = {
  merchantSlug: string;
  tableId: string;
};

type CartStep = "review" | "suggestions" | "payment";

export function CartShell({ merchantSlug, tableId }: CartShellProps) {
  const searchParams = useSearchParams();
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
    addConfiguredItem,
  } = useTableCart(merchantSlug, tableId, allItems);
  const [step, setStep] = useState<CartStep>("review");
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<StorefrontPaymentMethod>("duitnow");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscountCents, setPromoDiscountCents] = useState(0);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [memberTier, setMemberTier] = useState<string | null>(null);
  const [tierDiscountPercent, setTierDiscountPercent] = useState(0);
  const { member, redeemAuthorized, refresh: refreshMember } = useMemberSession();
  const {
    settings: chargeSettings,
    currency,
    pointsRedeemCentsPerPoint,
  } = useCheckoutSettings(merchantSlug);
  const routes = customerRoutes(merchantSlug, tableId);

  const maxRedeemable = member?.availablePoints ?? member?.points ?? 0;

  useEffect(() => {
    const fromUrl = searchParams.get("promo")?.trim();
    if (fromUrl) {
      setPromoCode(fromUrl.toUpperCase());
      setStep("payment");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!member?.id) {
      setMemberTier(null);
      setTierDiscountPercent(0);
      return;
    }
    let cancelled = false;
    fetch(`/api/customers/${member.id}/tier`, { credentials: "include" })
      .then((res) => res.json())
      .then(
        (json: {
          currentLevel?: { name?: string; discountPercent?: number };
        }) => {
          if (cancelled) return;
          setMemberTier(json.currentLevel?.name ?? null);
          setTierDiscountPercent(Number(json.currentLevel?.discountPercent) || 0);
        },
      )
      .catch(() => {
        if (!cancelled) {
          setMemberTier(null);
          setTierDiscountPercent(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [member?.id]);

  useEffect(() => {
    const code = promoCode.trim();
    if (!code) {
      setPromoDiscountCents(0);
      setPromoMsg(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(
        `/api/merchant/${merchantSlug}/promos/validate?code=${encodeURIComponent(code)}&subtotalCents=${cartTotal}`,
        { cache: "no-store" },
      )
        .then((res) => res.json())
        .then(
          (json: {
            valid?: boolean;
            discountCents?: number;
            name?: string;
            error?: string;
          }) => {
            if (cancelled) return;
            if (json.valid && (json.discountCents ?? 0) > 0) {
              setPromoDiscountCents(json.discountCents ?? 0);
              setPromoMsg(json.name ? `Applied: ${json.name}` : "Promo applied");
            } else {
              setPromoDiscountCents(0);
              setPromoMsg(json.error ?? "Invalid promo code");
            }
          },
        )
        .catch(() => {
          if (!cancelled) {
            setPromoDiscountCents(0);
            setPromoMsg("Could not validate promo");
          }
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [promoCode, merchantSlug, cartTotal]);

  const previewDiscountCents = useMemo(() => {
    const tierDisc =
      member && tierDiscountPercent > 0
        ? applyLevelDiscount(cartTotal, tierDiscountPercent).discountCents
        : 0;
    const pointsDisc =
      member && redeemAuthorized && pointsToRedeem > 0
        ? pointsDiscountCents(pointsToRedeem, pointsRedeemCentsPerPoint)
        : 0;
    return tierDisc + promoDiscountCents + pointsDisc;
  }, [
    member,
    tierDiscountPercent,
    cartTotal,
    redeemAuthorized,
    pointsToRedeem,
    pointsRedeemCentsPerPoint,
    promoDiscountCents,
  ]);

  const orderTotals = useMemo(() => {
    if (!chargeSettings) return null;
    return calculateOrderTotals(cartTotal, previewDiscountCents, chargeSettings);
  }, [cartTotal, chargeSettings, previewDiscountCents]);

  const formattedTotal = orderTotals
    ? formatMerchantPrice(orderTotals.totalCents, currency)
    : formatMerchantPrice(cartTotal, currency);

  const itemById = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);

  // Points are earned on the paid total, so preview from the same figure the
  // diner is about to pay rather than estimating per item.
  const pointsPreview = usePointsPreview({
    merchantSlug,
    totalCents: orderTotals?.totalCents ?? 0,
    menuItemIds: cartLines
      .map((line) => itemById.get(line.itemId)?.menuItemId)
      .filter((id): id is string => Boolean(id)),
    enabled: Boolean(orderTotals) && cartCount > 0,
  });

  const cartItemIds = useMemo(
    () => [...new Set(cartLines.map((line) => line.itemId))],
    [cartLines],
  );

  const { suggestions, loading: suggestLoading, refresh: refreshSuggestions } = useStoreSuggestion({
    merchantSlug,
    cartItemIds,
    cartTotalCents: cartTotal,
    memberTier,
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
          promoCode: promoCode.trim() || undefined,
          pointsToRedeem: pointsToRedeem > 0 ? pointsToRedeem : undefined,
          paymentMethod,
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
    promoCode,
    pointsToRedeem,
    serviceType,
    paymentMethod,
  ]);

  const requestRedeemOtp = useCallback(async () => {
    setOtpBusy(true);
    setOtpMsg(null);
    setDevOtpHint(null);
    try {
      const res = await fetch("/api/customer/redeem/otp/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantSlug }),
      });
      const data = (await res.json()) as {
        error?: string;
        phoneMasked?: string;
        devCode?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not send code");
      setOtpMsg(
        data.phoneMasked
          ? `Code sent to WhatsApp ${data.phoneMasked}. Enter it below.`
          : "Code sent to your WhatsApp. Enter it below.",
      );
      if (data.devCode) setDevOtpHint(data.devCode);
    } catch (err) {
      setOtpMsg(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setOtpBusy(false);
    }
  }, [merchantSlug]);

  const verifyRedeemOtp = useCallback(async () => {
    if (!/^\d{4}$/.test(otpCode.trim())) {
      setOtpMsg("Enter the 4-digit code from WhatsApp.");
      return;
    }
    setOtpBusy(true);
    setOtpMsg(null);
    try {
      const res = await fetch("/api/customer/redeem/otp/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantSlug, code: otpCode.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setOtpMsg("Verified — you can spend points on this order.");
      setDevOtpHint(null);
      await refreshMember();
    } catch (err) {
      setOtpMsg(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setOtpBusy(false);
    }
  }, [merchantSlug, otpCode, refreshMember]);

  function handleAddSuggestion(suggestion: StoreSuggestion) {
    if (!suggestion.itemId) return;
    // Suggested items can have required options. Apply each group's default so
    // the line is valid at checkout instead of failing there — the diner is
    // mid-payment and should not be sent back to the product page.
    const groups = itemById.get(suggestion.itemId)?.modifierGroups ?? [];
    if (groups.length > 0) {
      addConfiguredItem(suggestion.itemId, defaultSelections(groups), 1, suggestion.promoPriceCents);
    } else {
      addItem(suggestion.itemId, 1, suggestion.promoPriceCents);
    }
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
          orderTotals={orderTotals}
          suggestions={suggestions}
          loading={suggestLoading}
          currency={currency}
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
                        {line.note && (
                          <p className="mt-1 border-l-2 border-primary/30 pl-2 text-[12px] italic text-on-surface-variant">
                            {line.note}
                          </p>
                        )}
                        <p className="mt-1 font-mono text-label-mono text-on-surface-variant">
                          {formatMerchantPrice(line.unitPriceCents, currency)} each
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
              <span className="font-mono text-label-mono">
                {formatMerchantPrice(cartTotal, currency)}
              </span>
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
                    {formatMerchantPrice(line.unitPriceCents * line.quantity, currency)}
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
                {promoMsg && (
                  <p
                    className={`text-[12px] ${
                      promoDiscountCents > 0 ? "text-primary" : "text-on-surface-variant"
                    }`}
                  >
                    {promoMsg}
                  </p>
                )}
                {!member && (
                  <p className="border border-dashed border-surface-container-highest px-3 py-2 text-[12px] text-on-surface-variant">
                    {pointsPreview?.enabled && pointsPreview.points > 0 ? (
                      <>
                        {copy.joinToClaimPoints}{" "}
                        <span className="font-medium text-on-surface">
                          {pointsPreview.points} {pointsUnit(pointsPreview.points, copy)}
                        </span>{" "}
                        {copy.onThisOrder}
                      </>
                    ) : (
                      "Not a member yet? Order & pay, then join on WhatsApp. Redeem next visit."
                    )}
                  </p>
                )}
                {member && maxRedeemable <= 0 && (
                  <p className="border border-surface-container-highest px-3 py-2 text-[12px] text-on-surface-variant">
                    You have {member.points} {pointsUnit(member.points, copy)}
                    {(member.reservedPoints ?? 0) > 0
                      ? ` (${member.reservedPoints} reserved on an unpaid order)`
                      : ""}
                    .{" "}
                    {pointsPreview?.enabled && pointsPreview.points > 0 ? (
                      <>
                        {copy.earnOnThisOrder}{" "}
                        <span className="font-medium text-on-surface">
                          +{pointsPreview.points} {pointsUnit(pointsPreview.points, copy)}
                        </span>{" "}
                        {copy.onThisOrder} {copy.pointsAfterPayment}
                      </>
                    ) : null}
                  </p>
                )}
                {member && maxRedeemable > 0 && !redeemAuthorized && (
                  <div className="flex flex-col gap-2 border border-surface-container-highest px-3 py-3">
                    <p className="text-body-md">
                      You have {maxRedeemable} pts available. Verify on WhatsApp to spend them.
                    </p>
                    <button
                      type="button"
                      disabled={otpBusy}
                      onClick={() => void requestRedeemOtp()}
                      className="bg-primary px-3 py-2 text-[12px] font-medium text-on-primary disabled:opacity-50"
                    >
                      {otpBusy ? "Sending…" : "Send WhatsApp code"}
                    </button>
                    <div className="flex gap-2">
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={4}
                        placeholder="4-digit code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="h-9 min-w-0 flex-1 border border-surface-container-highest px-3 text-[13px]"
                      />
                      <button
                        type="button"
                        disabled={otpBusy || otpCode.length !== 4}
                        onClick={() => void verifyRedeemOtp()}
                        className="h-9 shrink-0 border border-primary px-3 text-[12px] font-medium text-primary disabled:opacity-50"
                      >
                        Verify
                      </button>
                    </div>
                    {devOtpHint && (
                      <p className="text-[11px] text-on-surface-variant">
                        Dev mode code: <span className="font-mono">{devOtpHint}</span>
                      </p>
                    )}
                    {otpMsg && (
                      <p className="text-[11px] text-on-surface-variant">{otpMsg}</p>
                    )}
                  </div>
                )}
                {member && maxRedeemable > 0 && redeemAuthorized && (
                  <label className="flex items-center justify-between border border-surface-container-highest px-3 py-2">
                    <span className="text-body-md">
                      Redeem points (max {maxRedeemable})
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={maxRedeemable}
                      value={pointsToRedeem}
                      onChange={(e) =>
                        setPointsToRedeem(
                          Math.min(maxRedeemable, Math.max(0, Number(e.target.value) || 0)),
                        )
                      }
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
              <div className="overflow-hidden border border-surface-container-highest">
                {(
                  [
                    {
                      id: "duitnow" as const,
                      label: "DuitNow QR",
                      hint: "Scan with any banking app",
                      icon: "qr_code_2",
                      iconBg: "bg-[#ED1C24]/10 text-[#ED1C24]",
                      brands: ["FPX", "DuitNow"],
                      recommended: true,
                    },
                    {
                      id: "card" as const,
                      label: "Card",
                      hint: "Visa, Mastercard, Amex",
                      icon: "credit_card",
                      iconBg: "bg-surface-container text-on-surface",
                      brands: ["Visa", "Mastercard"],
                      recommended: false,
                    },
                    {
                      id: "wallet" as const,
                      label: "E-wallet",
                      hint: "Touch ’n Go, GrabPay, ShopeePay",
                      icon: "account_balance_wallet",
                      iconBg: "bg-[#00B14F]/10 text-[#00B14F]",
                      brands: ["TNG", "Grab", "Shopee"],
                      recommended: false,
                    },
                  ] as const
                ).map((method, index, list) => {
                  const selected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex w-full items-center gap-3 px-3.5 py-3.5 text-left transition-colors ${
                        index < list.length - 1 ? "border-b border-surface-container-highest" : ""
                      } ${selected ? "bg-surface-container-low" : "bg-white hover:bg-surface-container-lowest"}`}
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center ${method.iconBg}`}
                      >
                        <Icon name={method.icon} className="text-[22px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-[15px] font-semibold text-on-surface">
                            {method.label}
                          </span>
                          {method.recommended && (
                            <span className="bg-primary px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase tracking-[0.08em] text-on-primary">
                              Popular
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-on-surface-variant">
                          {method.hint}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {method.brands.map((brand) => (
                            <span
                              key={brand}
                              className="border border-surface-container-highest bg-white px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-on-surface-variant"
                            >
                              {brand}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected
                            ? "border-primary bg-primary"
                            : "border-outline-variant bg-white"
                        }`}
                        aria-hidden
                      >
                        {selected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-on-primary" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-on-surface-variant">
                {paymentMethod === "duitnow" && "You’ll see a QR after confirming — pay in your bank app."}
                {paymentMethod === "card" && "Card details are entered on a secure payment page."}
                {paymentMethod === "wallet" && "Choose your wallet on the next screen."}
              </p>
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
              {orderTotals && orderTotals.discountCents > 0 && (
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>Discounts</span>
                  <span className="font-mono text-label-mono">
                    −{formatMerchantPrice(orderTotals.discountCents, currency)}
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
              {checkoutState === "loading"
                ? "Starting…"
                : paymentMethod === "duitnow"
                  ? "Pay with DuitNow"
                  : paymentMethod === "card"
                    ? "Pay with card"
                    : "Pay with e-wallet"}
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
