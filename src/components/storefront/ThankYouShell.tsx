"use client";

import { useCallback, useEffect, useState } from "react";
import { ReceiptView } from "@/components/receipt/ReceiptView";
import { StampCardVisual } from "@/components/storefront/StampCardVisual";
import { IRewardsStatusCard } from "@/components/storefront/IRewardsStatusCard";
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
  joinOffer: {
    headline: string;
    subtitle: string;
    badge: string;
    ctaLabel?: string;
    campaignId: string | null;
    campaignName: string | null;
  } | null;
  tier: TierInfo | null;
  stamps: {
    enabled: boolean;
    filled: number;
    size: number;
    remaining: number;
    rewardLabel: string | null;
    voucher?: {
      name: string;
      code: string | null;
      description: string;
    } | null;
  } | null;
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
  const { bindSessionFromOrder } = useMemberSession();

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
    bindSessionFromOrder(orderId, merchantSlug).catch(() => undefined);
  }, [data, merchantSlug, orderId, bindSessionFromOrder]);

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

            {!data.tier && (
              <section className="overflow-hidden border-2 border-primary bg-surface-container-lowest">
                <div className="bg-primary px-5 py-3 text-center">
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-on-primary/90">
                    Members-only welcome gift
                  </p>
                  {data.joinOffer?.badge && (
                    <p className="mt-1 font-display text-[28px] font-bold leading-none tracking-tight text-on-primary">
                      {data.joinOffer.badge}
                    </p>
                  )}
                </div>
                <div className="px-5 py-5 text-center">
                  <h2 className="font-display text-[22px] font-bold leading-tight tracking-tight text-primary">
                    {data.joinOffer?.headline ?? "Don't leave empty-handed"}
                  </h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-on-surface-variant">
                    {data.joinOffer?.subtitle ??
                      "Join free on WhatsApp in 10 seconds — unlock points, stamps, and member-only drops."}
                  </p>
                  <ul className="mt-4 space-y-2 text-left">
                    {[
                      "Free to join — no app download",
                      "Earn points on every order",
                      "Stamp card toward free drinks",
                      "Welcome gift unlocked on WhatsApp",
                    ].map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-2 text-[13px] text-on-surface"
                      >
                        <Icon
                          name="check_circle"
                          className="mt-0.5 shrink-0 text-[16px] text-primary"
                          filled
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {data.whatsappJoinUrl ? (
                  <div className="flex flex-col gap-2.5 border-t border-surface-container-highest px-5 py-4">
                    <a
                      href={data.whatsappJoinUrl}
                      className="flex w-full items-center justify-center gap-2 bg-primary py-4 text-on-primary transition-colors hover:bg-surface-tint"
                    >
                      <Icon name="chat" />
                      <span className="font-display text-[15px] font-semibold">
                        {data.joinOffer?.ctaLabel ?? "Join free on WhatsApp"}
                      </span>
                      <Icon name="arrow_forward" className="text-lg" />
                    </a>
                    <p className="text-center text-[11px] text-on-surface-variant">
                      Takes ~10 seconds · Your gift waits on WhatsApp
                    </p>
                    <a
                      href={`/m/${merchantSlug}/table/${tableId}`}
                      className="pt-1 text-center font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/80 transition-colors hover:text-on-surface-variant"
                    >
                      Skip — miss this gift
                    </a>
                  </div>
                ) : (
                  <p className="border-t border-surface-container-highest p-5 text-center text-body-md text-on-surface-variant">
                    WhatsApp join link will appear once your join token is ready.
                  </p>
                )}
              </section>
            )}

            <ReceiptView
              merchant={merchant}
              order={receiptOrderFromResponse(data.order)}
              layout={data.merchant?.receiptLayout}
            />

            {data.stamps?.enabled && (
              <>
                <StampCardVisual
                  filled={data.stamps.filled}
                  size={data.stamps.size}
                  cafeName={merchant.name}
                  rewardLabel={data.stamps.rewardLabel}
                />
                {data.stamps.voucher && (
                  <section className="border border-surface-container-highest bg-surface-container-lowest p-5 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                      Stamp voucher unlocked
                    </p>
                    <p className="mt-2 font-display text-headline-sm text-primary">
                      {data.stamps.voucher.name}
                    </p>
                    <p className="mt-1 text-[13px] text-on-surface-variant">
                      {data.stamps.voucher.description}
                    </p>
                    {data.stamps.voucher.code && (
                      <p className="mt-3 border border-dashed border-primary/40 bg-primary/5 px-3 py-2 font-mono text-[13px] tracking-widest text-primary">
                        {data.stamps.voucher.code}
                      </p>
                    )}
                    <p className="mt-2 text-[12px] text-on-surface-variant">
                      Apply this code in your cart on your next visit
                    </p>
                  </section>
                )}
              </>
            )}

            {data.tier && (
              <IRewardsStatusCard
                levelName={data.tier.name}
                perkDescription={data.tier.perkDescription}
                lifetimePointsEarned={data.tier.lifetimePointsEarned}
                nextLevelName={data.tier.nextLevelName}
                pointsToNextLevel={data.tier.pointsToNextLevel}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
