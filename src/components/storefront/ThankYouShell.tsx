"use client";

import { useCallback, useEffect, useState } from "react";
import { ReceiptView } from "@/components/receipt/ReceiptView";
import { Icon } from "@/components/ui/Icon";
import { useMemberSession } from "@/hooks/useMemberSession";
import type { ReceiptLineItem, ReceiptMerchant, ReceiptOrder } from "@/lib/receipt/types";

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
    serviceChargeCents: number;
    serviceChargeLabel: string | null;
    taxCents: number;
    taxLabel: string | null;
    discountCents: number;
    totalCents: number;
    paidAt: string | null;
    currency: string;
    serviceType?: "dine_in" | "takeaway";
    customerId: string | null;
    items: ReceiptLineItem[];
  };
  merchant: ReceiptMerchant & { slug: string; receiptLayout?: unknown } | null;
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
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const merchant = data?.merchant ?? {
    name: merchantSlug,
    slug: merchantSlug,
  };

  function receiptOrderFromResponse(order: OrderStatusResponse["order"]): ReceiptOrder {
    return {
      id: order.id,
      shortId: shortOrderId,
      tableNumber: data?.tableNumber ?? tableId,
      paidAt: order.paidAt,
      status: order.status,
      currency: order.currency,
      subtotalCents: order.subtotalCents,
      serviceChargeCents: order.serviceChargeCents,
      serviceChargeLabel: order.serviceChargeLabel,
      taxCents: order.taxCents,
      taxLabel: order.taxLabel,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      serviceType: order.serviceType,
      items: order.items,
    };
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface p-4 pb-12">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <header className="flex h-12 items-center justify-between">
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
          <p className="border border-red-200 bg-red-50 p-4 text-body-md text-red-700" role="alert">
            {error}
          </p>
        )}

        {data && !isPaid && (
          <div className="space-y-6">
            <ReceiptView
              merchant={merchant}
              order={receiptOrderFromResponse(data.order)}
              layout={data.merchant?.receiptLayout}
            />
            <div className="border border-surface-container-highest bg-surface-container-lowest p-6 text-center">
              <p className="text-body-md text-on-surface-variant">
                Complete payment to confirm your order.
              </p>
              <button
                type="button"
                onClick={simulateDevPayment}
                disabled={paying}
                className="mt-4 w-full bg-primary py-4 font-display text-headline-sm text-on-primary transition-colors hover:bg-surface-tint disabled:opacity-50"
              >
                {paying ? "Confirming…" : "Simulate payment (dev)"}
              </button>
            </div>
          </div>
        )}

        {data && isPaid && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary">
                <Icon name="check_circle" className="text-3xl text-primary" filled />
              </div>
              <h1 className="font-display text-headline-mobile text-primary tracking-tight">
                Order confirmed
              </h1>
            </div>

            <ReceiptView
              merchant={merchant}
              order={receiptOrderFromResponse(data.order)}
              layout={data.merchant?.receiptLayout}
            />

            {data.tier && (
              <section className="border border-surface-container-highest bg-surface-container-lowest p-6">
                <h2 className="text-center font-display text-eyebrow uppercase tracking-wider text-on-surface-variant">
                  iRewards status
                </h2>
                <p className="mt-2 text-center font-display text-headline-sm text-primary">
                  Your level: {data.tier.name}
                </p>
                {data.tier.perkDescription && (
                  <p className="mt-1 text-center text-body-md text-on-surface-variant">
                    {data.tier.perkDescription}
                  </p>
                )}
                <div className="mt-4 border-t border-surface-container-high pt-4">
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

            <section className="flex flex-col gap-4">
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
                    className="text-center font-mono text-label-mono uppercase tracking-widest text-on-surface-variant underline decoration-outline-variant underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
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
          </>
        )}
      </div>
    </div>
  );
}
