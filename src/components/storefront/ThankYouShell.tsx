"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useMemberSession } from "@/hooks/useMemberSession";

type TierInfo = {
  levelNumber: number;
  name: string;
  perkDescription: string | null;
  pointsMultiplier: number;
  lifetimePointsEarned: number;
  pointsToNextLevel: number | null;
  nextLevelName: string | null;
};

type OrderStatusResponse = {
  order: {
    id: string;
    status: "pending" | "paid" | "cancelled";
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
    currency: string;
  };
  merchant: { name: string; slug: string } | null;
  tableNumber: string | null;
  whatsappJoinUrl: string | null;
  tier: TierInfo | null;
};

type ThankYouShellProps = {
  merchantSlug: string;
  tableId: string;
  orderId: string;
};

export function ThankYouShell({ merchantSlug, tableId, orderId }: ThankYouShellProps) {
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const { bindSession } = useMemberSession();

  const loadOrder = useCallback(async () => {
    const response = await fetch(`/api/orders/${orderId}`);
    const json = (await response.json()) as OrderStatusResponse & { error?: string };
    if (!response.ok) throw new Error(json.error ?? "Failed to load order");
    setData(json);
    return json;
  }, [orderId]);

  useEffect(() => {
    loadOrder().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load order");
    });
  }, [loadOrder]);

  useEffect(() => {
    if (!data || data.order.status === "paid") return;
    const timer = setInterval(() => {
      loadOrder().catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [data, loadOrder]);

  useEffect(() => {
    if (!data?.order.customerId || data.order.status !== "paid") return;
    bindSession(data.order.customerId, merchantSlug).catch(() => undefined);
  }, [data, merchantSlug, bindSession]);

  async function simulateDevPayment() {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/dev-pay`, {
        method: "POST",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Payment failed");
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  const isPaid = data?.order.status === "paid";
  const currency = data?.order.currency ?? "MYR";
  const shortOrderId = orderId.slice(0, 8).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-4">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-element-gap">
        <header className="zenith-surface mb-2 flex h-16 w-full items-center justify-between px-container-padding">
          <span className="font-display text-headline-sm font-bold tracking-tight text-primary">
            iRewards
          </span>
          <a
            href={`/m/${merchantSlug}/table/${tableId}`}
            className="text-on-surface-variant transition-colors hover:text-primary"
            aria-label="Close"
          >
            <Icon name="close" />
          </a>
        </header>

        {!data && !error && (
          <p className="py-12 text-center text-on-surface-variant">Loading your order…</p>
        )}

        {error && (
          <p className="zenith-surface p-4 text-body-md text-red-700" role="alert">
            {error}
          </p>
        )}

        {data && !isPaid && (
          <main className="zenith-surface flex flex-col items-center gap-element-gap p-container-padding text-center">
            <h1 className="font-display text-headline-mobile text-primary">Complete payment</h1>
            <p className="text-body-md text-on-surface-variant">
              Total: {currency} {(data.order.totalCents / 100).toFixed(2)}
            </p>
            <p className="text-body-md text-on-surface-variant">
              Dev mode: simulate a successful DuitNow payment.
            </p>
            <button
              type="button"
              onClick={simulateDevPayment}
              disabled={paying}
              className="w-full bg-primary py-4 font-display text-headline-sm text-on-primary transition-colors hover:bg-surface-tint disabled:opacity-50"
            >
              {paying ? "Confirming…" : "Simulate payment (dev)"}
            </button>
          </main>
        )}

        {data && isPaid && (
          <>
            <main className="zenith-surface flex flex-col items-center gap-element-gap p-container-padding text-center">
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary">
                <Icon name="check_circle" className="text-4xl text-primary" filled />
              </div>
              <h1 className="font-display text-headline-mobile text-primary tracking-tight">
                Order Confirmed
              </h1>
              <span className="font-mono text-label-mono uppercase tracking-wider text-on-surface-variant">
                Order ID: #{shortOrderId}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-body-md text-on-surface-variant">
                  {data.merchant?.name ?? merchantSlug} · Table {data.tableNumber ?? tableId}
                </span>
              </div>
              <p className="font-display text-headline-sm text-primary">
                {currency} {(data.order.totalCents / 100).toFixed(2)} paid
              </p>
              {data.order.discountCents > 0 && (
                <p className="text-body-md text-on-surface-variant">
                  iRewards discount: -{currency}{" "}
                  {(data.order.discountCents / 100).toFixed(2)}
                </p>
              )}
            </main>

            {data.tier && (
              <section className="zenith-surface flex flex-col gap-element-gap p-container-padding">
                <h2 className="text-center font-display text-eyebrow uppercase tracking-wider text-on-surface-variant">
                  iRewards status
                </h2>
                <p className="text-center font-display text-headline-sm text-primary">
                  Your level: {data.tier.name}
                </p>
                {data.tier.perkDescription && (
                  <p className="text-center text-body-md text-on-surface-variant">
                    {data.tier.perkDescription}
                  </p>
                )}
                <div className="mt-2 border-t border-surface-container-high pt-4">
                  <div className="mb-2 flex items-end justify-between">
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      {data.tier.lifetimePointsEarned} lifetime pts
                    </span>
                    {data.tier.nextLevelName && (
                      <span className="font-mono text-label-mono text-primary">
                        Next: {data.tier.nextLevelName}
                      </span>
                    )}
                  </div>
                  <div className="h-1 w-full bg-surface-container-highest">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: data.tier.pointsToNextLevel
                          ? `${Math.min(95, Math.max(8, 100 - (data.tier.pointsToNextLevel / (data.tier.pointsToNextLevel + data.tier.lifetimePointsEarned)) * 100))}%`
                          : "100%",
                      }}
                    />
                  </div>
                  {data.tier.pointsToNextLevel !== null && data.tier.nextLevelName && (
                    <p className="mt-2 text-center text-body-md text-on-surface-variant">
                      {data.tier.pointsToNextLevel} points to {data.tier.nextLevelName}
                    </p>
                  )}
                </div>
              </section>
            )}

            <section className="mt-2 flex flex-col gap-4">
              {data.whatsappJoinUrl ? (
                <>
                  <a
                    href={data.whatsappJoinUrl}
                    className="relative flex w-full items-center justify-center gap-3 overflow-hidden bg-primary py-4 px-6 text-on-primary transition-colors hover:bg-surface-tint"
                  >
                    <Icon name="chat" />
                    <span className="font-display text-headline-sm">Join iRewards on WhatsApp</span>
                    <span className="absolute right-4 flex items-center gap-1 bg-surface-container-lowest px-2 py-1 font-display text-[10px] uppercase tracking-wider text-primary">
                      <Icon name="redeem" className="text-xs" />
                      +1 Pt
                    </span>
                  </a>
                  <p className="text-center text-body-md text-on-surface-variant">
                    Save your progress and get exclusive drops.
                  </p>
                  <a
                    href={`/m/${merchantSlug}/table/${tableId}`}
                    className="mt-1 text-center font-mono text-label-mono uppercase tracking-widest text-on-surface-variant underline decoration-outline-variant underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
                  >
                    Skip for now
                  </a>
                </>
              ) : (
                <p className="text-center text-body-md text-on-surface-variant">
                  WhatsApp join link will appear once your join token is ready.
                </p>
              )}
            </section>

            <details className="zenith-surface mt-4 p-container-padding group">
              <summary className="flex cursor-pointer list-none items-center justify-between font-display text-eyebrow uppercase tracking-wider text-on-surface">
                Order summary
                <Icon
                  name="expand_more"
                  className="text-on-surface-variant transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="mt-4 flex flex-col gap-3 border-t border-surface-container-high pt-4">
                <div className="flex justify-between text-body-md">
                  <span>Subtotal</span>
                  <span className="font-mono text-label-mono">
                    {currency} {(data.order.subtotalCents / 100).toFixed(2)}
                  </span>
                </div>
                {data.order.discountCents > 0 && (
                  <div className="flex justify-between text-body-md text-on-surface-variant">
                    <span>iRewards discount</span>
                    <span className="font-mono text-label-mono">
                      -{currency} {(data.order.discountCents / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-surface-container-high pt-3 font-display text-headline-sm">
                  <span>Total</span>
                  <span className="font-mono text-label-mono">
                    {currency} {(data.order.totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
