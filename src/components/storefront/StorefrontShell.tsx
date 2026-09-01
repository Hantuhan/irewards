"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { useTableCart } from "@/hooks/useTableCart";
import { customerRoutes } from "@/lib/navigation/routes";
import { Icon } from "@/components/ui/Icon";
import { useMemberSession } from "@/hooks/useMemberSession";
import { MobileShell } from "@/components/ui/MobileShell";

type StorefrontShellProps = {
  merchantSlug: string;
  tableId: string;
};

type RewardLevel = {
  levelNumber: number;
  name: string;
  minLifetimePoints: number;
};

export function StorefrontShell({ merchantSlug, tableId }: StorefrontShellProps) {
  const { categories, allItems, loading: menuLoading, error: menuError } =
    useStorefrontMenu(merchantSlug);
  const { cart, cartCount, cartTotal, cartLines, addItem } = useTableCart(
    merchantSlug,
    tableId,
    allItems,
  );

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [rewardLevels, setRewardLevels] = useState<RewardLevel[]>([]);
  const [merchantName, setMerchantName] = useState(merchantSlug);
  const [banner, setBanner] = useState<{
    title: string;
    text: string | null;
    linkUrl: string | null;
  } | null>(null);
  const { member } = useMemberSession();

  const routes = customerRoutes(merchantSlug, tableId);

  useEffect(() => {
    fetch(`/api/merchant/${merchantSlug}/campaigns/banner`)
      .then((res) => res.json())
      .then((json: { banner?: { title: string; text: string | null; linkUrl: string | null } | null }) => {
        if (json.banner) setBanner(json.banner);
      })
      .catch(() => undefined);
  }, [merchantSlug]);

  useEffect(() => {
    fetch(`/api/merchant/${merchantSlug}/reward-levels`)
      .then((res) => res.json())
      .then((json: { levels?: RewardLevel[]; merchant?: { name: string } }) => {
        if (json.levels) setRewardLevels(json.levels);
        if (json.merchant?.name) setMerchantName(json.merchant.name);
      })
      .catch(() => undefined);
  }, [merchantSlug]);

  useEffect(() => {
    if (categories[0] && !activeCategory) setActiveCategory(categories[0].id);
  }, [categories, activeCategory]);

  const usualItems = member?.usualOrder ?? [];

  const filteredMenu = useMemo(
    () => categories.find((c) => c.id === activeCategory)?.items ?? [],
    [categories, activeCategory],
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
  }, [cartLines, merchantSlug, tableId, member?.id]);

  if (menuLoading) {
    return (
      <MobileShell>
        <p className="p-12 text-center text-on-surface-variant">Loading menu…</p>
      </MobileShell>
    );
  }

  if (menuError) {
    return (
      <MobileShell>
        <p className="p-12 text-center text-red-700">{menuError}</p>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="border-b border-surface-container-highest px-6 pb-6 pt-12">
        <p className="font-mono text-label-mono uppercase tracking-widest text-on-surface-variant">
          {merchantName} · Table {tableId}
        </p>
        <h1 className="mt-2 font-display text-headline-mobile text-primary">
          {member ? "Welcome back" : "Welcome"}
        </h1>
        {member && (
          <p className="mt-1 font-mono text-label-mono text-primary">
            {member.points} points available
          </p>
        )}
        <p className="mt-1 text-body-md text-on-surface-variant">
          Scan · order · pay · no signup
        </p>
        {banner && (
          <div className="mt-4 border border-primary bg-surface-container-low p-4">
            <p className="font-display text-eyebrow uppercase text-primary">{banner.title}</p>
            {banner.text && <p className="mt-1 text-body-md">{banner.text}</p>}
            {banner.linkUrl && (
              <a href={banner.linkUrl} className="mt-2 inline-block font-mono text-label-mono text-primary underline">
                Learn more
              </a>
            )}
          </div>
        )}
        {usualItems.length > 0 && (
          <div className="mt-6 border border-surface-container-highest bg-surface-container-lowest p-4">
            <p className="font-display text-eyebrow uppercase text-on-surface-variant">Your usual</p>
            <ul className="mt-2 space-y-2">
              {usualItems.map((item) => {
                const menuItem = allItems.find((m) => m.name === item.name);
                return (
                  <li key={item.name} className="flex items-center justify-between gap-2">
                    <span className="text-body-md">
                      {item.quantity}× {item.name}
                    </span>
                    {menuItem && (
                      <button
                        type="button"
                        onClick={() => addItem(menuItem.id, item.quantity)}
                        className="border border-primary px-2 py-1 font-mono text-label-mono text-primary"
                      >
                        Reorder
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {rewardLevels.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <span className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                iRewards levels
              </span>
              <Link href={routes.rewards} className="font-mono text-label-mono text-primary underline">
                View all
              </Link>
            </div>
            <div className="flex flex-wrap gap-1">
              {rewardLevels.map((level) => (
                <div
                  key={level.levelNumber}
                  className="flex h-8 min-w-[2rem] items-center justify-center border border-outline-variant bg-surface-container-lowest px-2"
                >
                  <span className="font-mono text-[10px] text-primary">{level.levelNumber}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <section className="py-6">
        <div className="no-scrollbar mb-6 flex gap-6 overflow-x-auto border-b border-surface-container px-6 pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap border-b-2 px-1 pb-2 font-mono text-label-mono transition-colors ${
                activeCategory === cat.id
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-primary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6 px-6">
          {filteredMenu.map((item, index) => (
            <div key={item.id}>
              <div className="group flex items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-display text-headline-sm text-primary">{item.name}</h4>
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="border border-surface-container-highest px-1.5 py-0.5 font-mono text-[10px] uppercase text-on-surface-variant"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 line-clamp-2 text-body-md text-on-surface-variant">
                    {item.description}
                  </p>
                  <p className="mt-2 font-mono text-label-mono text-primary">
                    RM {(item.priceCents / 100).toFixed(2)}
                  </p>
                  {(cart[item.id] ?? 0) > 0 && (
                    <p className="mt-1 font-mono text-label-mono text-on-surface-variant">
                      ×{cart[item.id]} in cart
                    </p>
                  )}
                </div>
                <div className="relative h-24 w-24 shrink-0 border border-surface-container bg-surface-container-low">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                  <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                    <Icon name="local_cafe" className="text-3xl opacity-40" />
                  </div>
                  )}
                  <button
                    type="button"
                    onClick={() => addItem(item.id)}
                    aria-label={`Add ${item.name}`}
                    className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center border border-surface-container-highest bg-surface-container-lowest text-primary shadow-sm"
                  >
                    <Icon name="add" className="text-base" />
                  </button>
                </div>
              </div>
              {index < filteredMenu.length - 1 && (
                <div className="mt-6 h-px w-full bg-surface-container" />
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="h-44" />

      {cartCount > 0 && (
        <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[382px] -translate-x-1/2 px-4">
          <div className="flex flex-col gap-3 bg-primary p-4 text-on-primary shadow-xl">
            {upsellItem && (
              <div className="flex items-start gap-2 border-b border-surface-tint pb-3">
                <Icon name="auto_awesome" className="mt-0.5 text-lg text-secondary" />
                <p className="flex-1 text-body-md leading-tight text-surface-container-low">
                  Add a <span className="font-semibold text-on-primary">{upsellItem.name}</span>?
                </p>
                <button
                  type="button"
                  onClick={() => addItem(upsellItem.id)}
                  className="bg-on-primary px-2 py-1 font-mono text-label-mono text-primary"
                >
                  Add
                </button>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-col">
                <span className="font-mono text-label-mono text-secondary">
                  {cartCount} item{cartCount === 1 ? "" : "s"}
                </span>
                <span className="font-display text-headline-sm text-on-primary">
                  RM {(cartTotal / 100).toFixed(2)}
                </span>
              </div>
              <Link
                href={routes.cart}
                className="flex items-center gap-2 bg-on-primary px-4 py-2 font-display text-headline-sm text-primary"
              >
                View cart
                <Icon name="arrow_forward" className="text-xl" />
              </Link>
            </div>
            {error && <p className="text-body-md text-red-200">{error}</p>}
            <button
              type="button"
              disabled={checkoutState === "loading"}
              onClick={startCheckout}
              className="w-full border border-on-primary py-2 font-mono text-label-mono uppercase text-on-primary disabled:opacity-60"
            >
              {checkoutState === "loading" ? "Starting…" : "Quick pay"}
            </button>
          </div>
        </div>
      )}

      <CustomerMobileNav
        merchantSlug={merchantSlug}
        tableId={tableId}
        active="shop"
        cartCount={cartCount}
      />
    </MobileShell>
  );
}
