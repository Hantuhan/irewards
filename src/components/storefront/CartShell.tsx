"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { useTableCart } from "@/hooks/useTableCart";
import { customerRoutes } from "@/lib/navigation/routes";
import { Icon } from "@/components/ui/Icon";
import { useMemberSession } from "@/hooks/useMemberSession";
import { MobileShell } from "@/components/ui/MobileShell";

type CartShellProps = {
  merchantSlug: string;
  tableId: string;
};

type PaymentMethod = "duitnow" | "card" | "wallet";

export function CartShell({ merchantSlug, tableId }: CartShellProps) {
  const { allItems, loading } = useStorefrontMenu(merchantSlug);
  const { cart, cartCount, cartTotal, cartLines, setQuantity, addItem } =
    useTableCart(merchantSlug, tableId, allItems);
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("duitnow");
  const [promoCode, setPromoCode] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const { member } = useMemberSession();
  const routes = customerRoutes(merchantSlug, tableId);

  const lines = useMemo(
    () =>
      allItems
        .filter((item) => (cart[item.id] ?? 0) > 0)
        .map((item) => ({ ...item, quantity: cart[item.id] ?? 0 })),
    [allItems, cart],
  );

  const upsellItem = useMemo(() => {
    if (cartCount === 0) return null;
    const inCart = new Set(Object.keys(cart).filter((id) => (cart[id] ?? 0) > 0));
    return allItems.find((item) => !inCart.has(item.id)) ?? null;
  }, [cart, cartCount, allItems]);

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
          items: cartLines,
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
  }, [cartLines, merchantSlug, tableId, member?.id, promoCode, pointsToRedeem]);

  if (loading) {
    return (
      <MobileShell>
        <p className="p-12 text-center text-on-surface-variant">Loading cart…</p>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="border-b border-surface-container-highest px-6 pb-6 pt-12">
        <h1 className="font-display text-headline-mobile text-primary">Your cart</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Table {tableId} · {cartCount} item{cartCount === 1 ? "" : "s"}
        </p>
      </header>

      <main className="flex flex-col gap-6 px-6 py-6 pb-32">
        {lines.length === 0 ? (
          <div className="zenith-surface flex flex-col items-center gap-4 p-8 text-center">
            <Icon name="shopping_bag" className="text-4xl text-outline-variant" />
            <p className="text-body-md text-on-surface-variant">Your cart is empty.</p>
            <Link href={routes.shop} className="bg-primary px-6 py-3 font-display text-headline-sm text-on-primary">
              Browse menu
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {lines.map((line) => (
                <li key={line.id} className="zenith-surface flex items-start justify-between gap-4 p-4">
                  <div>
                    <h3 className="font-display text-headline-sm text-primary">{line.name}</h3>
                    <p className="mt-1 font-mono text-label-mono text-on-surface-variant">
                      RM {(line.priceCents / 100).toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQuantity(line.id, line.quantity - 1)} className="flex h-8 w-8 items-center justify-center border border-surface-container-highest">
                      <Icon name="remove" />
                    </button>
                    <span className="w-6 text-center font-mono text-label-mono">{line.quantity}</span>
                    <button type="button" onClick={() => setQuantity(line.id, line.quantity + 1)} className="flex h-8 w-8 items-center justify-center border border-surface-container-highest">
                      <Icon name="add" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {upsellItem && (
              <div className="flex items-center justify-between border border-surface-container-highest bg-surface-container-low p-4">
                <div>
                  <p className="font-display text-eyebrow uppercase text-on-surface-variant">Suggested</p>
                  <p className="font-display text-headline-sm text-primary">{upsellItem.name}</p>
                </div>
                <button type="button" onClick={() => addItem(upsellItem.id)} className="border border-primary px-3 py-1 font-mono text-label-mono text-primary">
                  Add
                </button>
              </div>
            )}

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
                        ? "border-primary bg-surface-container-low"
                        : "border-surface-container-highest"
                    }`}
                  >
                    <Icon name={method.icon} />
                    <span className="font-display text-headline-sm">{method.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="zenith-surface flex justify-between p-4 font-display text-headline-sm">
              <span>Total</span>
              <span className="font-mono text-label-mono">RM {(cartTotal / 100).toFixed(2)}</span>
            </div>

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

      <CustomerMobileNav merchantSlug={merchantSlug} tableId={tableId} active="cart" cartCount={cartCount} />
    </MobileShell>
  );
}
