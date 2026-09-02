"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { MenuItemCustomizeSheet } from "@/components/storefront/MenuItemCustomizeSheet";
import { MenuItemDetailSheet } from "@/components/storefront/MenuItemDetailSheet";
import {
  StorefrontCategoryPills,
  StorefrontMenuHeader,
  StorefrontMenuItemRow,
} from "@/components/storefront/StorefrontMenuLayout";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { useStorefrontLocale } from "@/hooks/useStorefrontLocale";
import { useTableCart } from "@/hooks/useTableCart";
import { formatMerchantPrice } from "@/lib/merchant/currency";
import { customerRoutes } from "@/lib/navigation/routes";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";
import { fetchStorefrontMenuItem } from "@/lib/menu/storefront";
import { Icon } from "@/components/ui/Icon";
import { useMemberSession, type MemberProfile } from "@/hooks/useMemberSession";
import { MobileShell } from "@/components/ui/MobileShell";

const PREVIEW_MEMBER_POINTS = 120;
const PREVIEW_MEMBER_TIER = "Gold";

type StorefrontShellProps = {
  merchantSlug: string;
  tableId: string;
  /** Minimal chrome for admin flow preview iframe */
  embed?: boolean;
  /** Admin preview: simulate returning member with usual order from live menu */
  previewMember?: boolean;
};

export function StorefrontShell({
  merchantSlug,
  tableId,
  embed = false,
  previewMember = false,
}: StorefrontShellProps) {
  const { lang, setLang, copy } = useStorefrontLocale(merchantSlug, ["en", "zh", "ms"]);
  const { categories, allItems, badges, languages, merchantName, merchantCurrency, loading: menuLoading, error: menuError } =
    useStorefrontMenu(merchantSlug, lang);
  const { cartCount, cartTotal, addItem, addConfiguredItem, quantityInCart } = useTableCart(
    merchantSlug,
    tableId,
    allItems,
  );

  const [activeItem, setActiveItem] = useState<StorefrontMenuItem | null>(null);
  const [sheetMode, setSheetMode] = useState<"detail" | "customize" | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [banner, setBanner] = useState<{
    title: string;
    text: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
  } | null>(null);
  const { member, refresh } = useMemberSession();
  const [phonePrompt, setPhonePrompt] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);

  const routes = customerRoutes(merchantSlug, tableId);

  useEffect(() => {
    fetch(`/api/merchant/${merchantSlug}/campaigns/banner`)
      .then((res) => res.json())
      .then((json: {
        banner?: {
          title: string;
          text: string | null;
          imageUrl: string | null;
          linkUrl: string | null;
        } | null;
      }) => {
        if (json.banner) setBanner(json.banner);
      })
      .catch(() => undefined);
  }, [merchantSlug]);

  useEffect(() => {
    if (categories[0] && !activeCategory) setActiveCategory(categories[0].id);
  }, [categories, activeCategory]);

  const previewMemberProfile = useMemo((): MemberProfile | null => {
    if (!previewMember || allItems.length === 0) return null;
    const picks = allItems.slice(0, 2);
    return {
      id: "preview-member",
      points: PREVIEW_MEMBER_POINTS,
      tierPoints: 450,
      usualOrder: picks.map((item) => ({ name: item.name, quantity: 1 })),
      favoriteItem: picks[0]?.name ?? null,
    };
  }, [previewMember, allItems]);

  const activeMember = previewMember ? previewMemberProfile : member;
  const usualItems = activeMember?.usualOrder ?? [];
  const showMemberChrome = Boolean(activeMember) && (!embed || previewMember);

  const filteredMenu = useMemo(
    () => categories.find((c) => c.id === activeCategory)?.items ?? [],
    [categories, activeCategory],
  );

  function openItemDetail(item: StorefrontMenuItem) {
    setActiveItem(item);
    setSheetMode("detail");
    setDetailError(null);
    setDetailLoading(true);
    void fetchStorefrontMenuItem(merchantSlug, item.id, lang)
      .then((fresh) => setActiveItem(fresh))
      .catch((err) =>
        setDetailError(err instanceof Error ? err.message : "Failed to load product details"),
      )
      .finally(() => setDetailLoading(false));
  }

  function openCustomize(item: StorefrontMenuItem) {
    setActiveItem(item);
    setSheetMode("customize");
    setDetailError(null);
    setDetailLoading(true);
    void fetchStorefrontMenuItem(merchantSlug, item.id, lang)
      .then((fresh) => setActiveItem(fresh))
      .catch((err) =>
        setDetailError(err instanceof Error ? err.message : "Failed to load product details"),
      )
      .finally(() => setDetailLoading(false));
  }

  function closeSheet() {
    setActiveItem(null);
    setSheetMode(null);
    setDetailLoading(false);
    setDetailError(null);
  }

  function handleQuickAdd(item: StorefrontMenuItem, e: React.MouseEvent) {
    e.stopPropagation();
    if ((item.modifierGroups?.length ?? 0) > 0) {
      openCustomize(item);
      return;
    }
    addItem(item.id);
  }

  function handleDetailAdd(item: StorefrontMenuItem) {
    if ((item.modifierGroups?.length ?? 0) > 0) {
      setSheetMode("customize");
      return;
    }
    addItem(item.id);
    closeSheet();
  }

  if (menuLoading) {
    return (
      <MobileShell>
        <p className="p-12 text-center text-on-surface-variant">{copy.loadingMenu}</p>
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

  const guestLabel = activeMember
    ? previewMember
      ? `${PREVIEW_MEMBER_TIER} · ${activeMember.points} ${copy.pts}`
      : `${activeMember.points} ${copy.pts}`
    : copy.guest;

  return (
    <MobileShell>
      <StorefrontMenuHeader
        storeName={merchantName}
        tableId={tableId}
        guestLabel={guestLabel}
        languages={languages}
        language={lang}
        onLanguageChange={setLang}
        copy={copy}
      />

      {showMemberChrome && (
        <div className="mx-6 mt-4 border border-primary bg-surface-container-low px-4 py-3">
          <p className="font-display text-headline-sm text-primary">Welcome back!</p>
          <p className="mt-0.5 text-body-md text-on-surface-variant">
            {previewMember
              ? `${PREVIEW_MEMBER_TIER} member · ${activeMember!.points} points`
              : `${activeMember!.points} points available`}
          </p>
        </div>
      )}

      {!showMemberChrome && !embed && !previewMember && (
        <div className="mx-6 mt-4 border border-surface-container-highest bg-surface-container-lowest px-4 py-3">
          <p className="font-display text-headline-sm text-primary">Returning member?</p>
          <p className="mt-0.5 text-[12px] text-on-surface-variant">
            Enter the mobile you used on WhatsApp to load your points and usual order.
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!phonePrompt.trim() || phoneBusy) return;
              setPhoneBusy(true);
              setPhoneMsg(null);
              void fetch("/api/customer/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ merchantSlug, phone: phonePrompt.trim() }),
              })
                .then(async (res) => {
                  const data = (await res.json()) as {
                    found?: boolean;
                    message?: string;
                    error?: string;
                    member?: { points: number; tierName: string };
                  };
                  if (!res.ok) throw new Error(data.error ?? "Lookup failed");
                  if (!data.found) {
                    setPhoneMsg(data.message ?? "No member found for that number.");
                    return;
                  }
                  setPhoneMsg(`Welcome back · ${data.member?.tierName ?? "member"} · ${data.member?.points ?? 0} pts`);
                  await refresh();
                })
                .catch((err) => {
                  setPhoneMsg(err instanceof Error ? err.message : "Lookup failed");
                })
                .finally(() => setPhoneBusy(false));
            }}
          >
            <input
              type="tel"
              inputMode="tel"
              placeholder="+60…"
              value={phonePrompt}
              onChange={(e) => setPhonePrompt(e.target.value)}
              className="h-9 min-w-0 flex-1 border border-surface-container-highest bg-white px-3 text-[13px] text-on-surface"
            />
            <button
              type="submit"
              disabled={phoneBusy}
              className="h-9 shrink-0 bg-primary px-3 text-[12px] font-medium text-on-primary disabled:opacity-50"
            >
              {phoneBusy ? "…" : "Load"}
            </button>
          </form>
          {phoneMsg && (
            <p className="mt-2 text-[11px] text-on-surface-variant">{phoneMsg}</p>
          )}
        </div>
      )}

      {!embed && banner && (
        <div className="mx-6 mt-4 overflow-hidden border border-surface-container-highest">
          {banner.imageUrl ? (
            <div className="relative aspect-[3.2/1] w-full bg-surface-container-low">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
              {(banner.title || banner.text) && (
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
                  <p className="font-display text-eyebrow uppercase text-white">{banner.title}</p>
                  {banner.text && <p className="mt-1 text-body-md text-white/90">{banner.text}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface-container-low p-4">
              <p className="font-display text-eyebrow uppercase text-primary">{banner.title}</p>
              {banner.text && <p className="mt-1 text-body-md">{banner.text}</p>}
            </div>
          )}
        </div>
      )}

      {showMemberChrome && usualItems.length > 0 && (
        <div className="mx-6 mt-4 border border-primary bg-surface-container-low p-4">
          <p className="font-mono text-label-mono uppercase text-primary">Your usual</p>
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
                      className="font-mono text-label-mono text-primary underline"
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

      <StorefrontCategoryPills
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <section className="flex flex-col gap-3 px-6 pb-32">
        {filteredMenu.map((item) => (
          <StorefrontMenuItemRow
            key={item.id}
            item={item}
            quantityInCart={quantityInCart(item.id)}
            currency={merchantCurrency}
            badgeCatalog={badges}
            onOpen={() => openItemDetail(item)}
            onAdd={(e) => handleQuickAdd(item, e)}
          />
        ))}
      </section>

      {!embed && cartCount > 0 && (
        <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[382px] -translate-x-1/2 px-4">
          <div className="flex items-center justify-between bg-primary p-4 text-on-primary shadow-xl">
            <div className="flex flex-col">
              <span className="font-mono text-label-mono text-secondary">
                {cartCount} item{cartCount === 1 ? "" : "s"}
              </span>
              <span className="font-display text-headline-sm text-on-primary">
                {formatMerchantPrice(cartTotal, merchantCurrency)}
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
        </div>
      )}

      <CustomerMobileNav
        merchantSlug={merchantSlug}
        tableId={tableId}
        active="shop"
        cartCount={embed ? 0 : cartCount}
        labels={{
          shop: copy.shop,
          rewards: copy.rewards,
          cart: copy.cart,
          profile: copy.profile,
        }}
      />

      {activeItem && sheetMode === "detail" && (
        <MenuItemDetailSheet
          item={activeItem}
          quantity={quantityInCart(activeItem.id)}
          loading={detailLoading}
          error={detailError}
          badgeCatalog={badges}
          copy={copy}
          onClose={closeSheet}
          onAdd={() => handleDetailAdd(activeItem)}
          hasModifiers={(activeItem.modifierGroups?.length ?? 0) > 0}
        />
      )}

      {activeItem && sheetMode === "customize" && !detailLoading && (
        <MenuItemCustomizeSheet
          item={activeItem}
          onClose={closeSheet}
          onConfirm={(selections) => {
            addConfiguredItem(activeItem.id, selections);
            closeSheet();
          }}
        />
      )}
    </MobileShell>
  );
}
