"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import {
  StorefrontCategoryPills,
  StorefrontMenuHeader,
  StorefrontMenuItemRow,
  StorefrontStampProgress,
  StorefrontUsualCard,
  StorefrontBannerVisual,
} from "@/components/storefront/StorefrontMenuLayout";
import { HorizontalScrollCue } from "@/components/ui/HorizontalScrollCue";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { useStorefrontLocale } from "@/hooks/useStorefrontLocale";
import { useTableCart } from "@/hooks/useTableCart";
import { formatMerchantPrice } from "@/lib/merchant/currency";
import { customerRoutes } from "@/lib/navigation/routes";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";
import { Icon } from "@/components/ui/Icon";
import { useMemberSession, type MemberProfile } from "@/hooks/useMemberSession";
import { MobileShell } from "@/components/ui/MobileShell";
import { formatMultiplier } from "@/lib/format/number";

const PREVIEW_MEMBER_POINTS = 1450;
const PREVIEW_MEMBER_TIER = "Silken";
const PREVIEW_MEMBER_MULT = 1.5;

type StorefrontShellProps = {
  merchantSlug: string;
  tableId: string;
  /** Minimal chrome for admin flow preview iframe */
  embed?: boolean;
  /** Admin preview: simulate returning member with usual order from live menu */
  previewMember?: boolean;
};

type StampSnap = {
  filled: number;
  size: number;
  rewardLabel: string | null;
  cartNudgeEnabled: boolean;
  qualifyingItemSlugs: string[];
};
type TierSnap = { name: string; pointsMultiplier: number };

const PREVIEW_STAMPS: StampSnap = {
  filled: 3,
  size: 8,
  rewardLabel: null,
  cartNudgeEnabled: true,
  qualifyingItemSlugs: [],
};

function firstName(displayName: string | null | undefined): string | null {
  if (!displayName?.trim()) return null;
  return displayName.trim().split(/\s+/)[0] ?? null;
}

export function StorefrontShell({
  merchantSlug,
  tableId,
  embed = false,
  previewMember = false,
}: StorefrontShellProps) {
  const { lang, setLang, copy } = useStorefrontLocale(merchantSlug, ["en", "zh", "ms"]);
  const {
    categories,
    allItems,
    badges,
    languages,
    merchantName,
    merchantCurrency,
    pointsProgramEnabled,
    stampsProgramEnabled,
    loading: menuLoading,
    error: menuError,
  } = useStorefrontMenu(merchantSlug, lang);
  const {
    cartCount,
    cartTotal,
    cartLines,
    addItem,
    quantityInCart,
    serviceType,
  } = useTableCart(merchantSlug, tableId, allItems);

  const router = useRouter();

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
  const [showLoadPoints, setShowLoadPoints] = useState(false);
  const [stamps, setStamps] = useState<StampSnap | null>(null);
  const [tier, setTier] = useState<TierSnap | null>(null);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [usualExpanded, setUsualExpanded] = useState(true);

  const routes = customerRoutes(merchantSlug, tableId);

  useEffect(() => {
    if (previewMember) {
      setStamps(PREVIEW_STAMPS);
      setTier({ name: PREVIEW_MEMBER_TIER, pointsMultiplier: PREVIEW_MEMBER_MULT });
      return;
    }

    const customerId =
      typeof window !== "undefined"
        ? member?.id ?? localStorage.getItem(`irewards-member:${merchantSlug}`)
        : null;
    const qs = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
    fetch(`/api/merchant/${merchantSlug}/stamps/progress${qs}`)
      .then((res) => res.json())
      .then((json: {
        stampsProgramEnabled?: boolean;
        progress?: {
          enabled?: boolean;
          filled?: number;
          size?: number;
          rewardLabel?: string | null;
          cartNudge?: {
            enabled?: boolean;
            qualifyingItemSlugs?: string[];
          };
        };
      }) => {
        if (!json.stampsProgramEnabled || !json.progress?.enabled || !customerId) {
          setStamps(null);
          return;
        }
        setStamps({
          filled: json.progress.filled ?? 0,
          size: json.progress.size ?? 6,
          rewardLabel: json.progress.rewardLabel ?? null,
          cartNudgeEnabled: Boolean(json.progress.cartNudge?.enabled),
          qualifyingItemSlugs: json.progress.cartNudge?.qualifyingItemSlugs ?? [],
        });
      })
      .catch(() => setStamps(null));

    if (!customerId) {
      setTier(null);
      return;
    }
    fetch(`/api/customers/${customerId}/tier`)
      .then((res) => res.json())
      .then((json: {
        currentLevel?: { name: string; pointsMultiplier: number };
      }) => {
        if (!json.currentLevel) {
          setTier(null);
          return;
        }
        setTier({
          name: json.currentLevel.name,
          pointsMultiplier: Number(json.currentLevel.pointsMultiplier ?? 1),
        });
      })
      .catch(() => setTier(null));
  }, [merchantSlug, member?.id, previewMember]);

  useEffect(() => {
    fetch(`/api/merchant/${merchantSlug}/campaigns/banner`, { credentials: "include" })
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
        else setBanner(null);
      })
      .catch(() => setBanner(null));
  }, [merchantSlug, member?.id]);

  useEffect(() => {
    if (categories[0] && !activeCategory) setActiveCategory(categories[0].id);
  }, [categories, activeCategory]);

  useEffect(() => {
    setUpsellDismissed(false);
  }, [cartLines.length]);

  const previewMemberProfile = useMemo((): MemberProfile | null => {
    if (!previewMember || allItems.length === 0) return null;
    const picks = allItems.slice(0, 2);
    return {
      id: "preview-member",
      points: PREVIEW_MEMBER_POINTS,
      tierPoints: 450,
      usualOrder: picks.map((item) => ({ name: item.name, quantity: 1 })),
      favoriteItem: picks[0]?.name ?? null,
      displayName: "Alex",
    };
  }, [previewMember, allItems]);

  const activeMember = previewMember ? previewMemberProfile : member;
  const usualItems = activeMember?.usualOrder ?? [];
  const showMemberChrome = Boolean(activeMember) && (!embed || previewMember);
  const memberFirst = firstName(activeMember?.displayName) ?? (previewMember ? "Alex" : null);

  const filteredMenu = useMemo(() => {
    const items = categories.find((c) => c.id === activeCategory)?.items ?? [];
    return items.filter((item) =>
      serviceType === "takeaway"
        ? item.availableTakeaway !== false
        : item.availableDineIn !== false,
    );
  }, [categories, activeCategory, serviceType]);

  const cartItemIds = useMemo(
    () => new Set(cartLines.map((line) => line.itemId)),
    [cartLines],
  );

  /** Soft upsell for the floating checkout bar — stamp nudge from backend qualifying items. */
  const cartUpsell = useMemo(() => {
    if (cartCount === 0 || upsellDismissed) return null;
    if (!stampsProgramEnabled || !stamps?.cartNudgeEnabled) return null;
    if (stamps.qualifyingItemSlugs.length === 0) return null;

    const qualifying = new Set(stamps.qualifyingItemSlugs);
    const candidate = allItems.find(
      (i) =>
        !cartItemIds.has(i.id) &&
        (qualifying.has(i.id) || qualifying.has(i.menuItemId)),
    );
    if (!candidate) return null;

    return {
      item: candidate,
      reason: `Add ${candidate.name} for +1 stamp?`,
    };
  }, [
    allItems,
    cartCount,
    cartItemIds,
    stamps,
    stampsProgramEnabled,
    upsellDismissed,
  ]);

  const serviceGuestLine = useMemo(() => {
    const service = serviceType === "takeaway" ? "Takeaway" : "Dine-in";
    const who = memberFirst ?? (activeMember ? "Member" : copy.guest);
    return `${service} · ${who}`.toUpperCase();
  }, [serviceType, memberFirst, activeMember, copy.guest]);

  function submitLoadPoints(e: React.FormEvent) {
    e.preventDefault();
    if (!phonePrompt.trim() || phoneBusy) return;
    setPhoneBusy(true);
    setPhoneMsg(null);
    const raw = phonePrompt.trim();
    const phone =
      raw.startsWith("+") || raw.startsWith("0") ? raw : `+60${raw.replace(/\s/g, "")}`;
    void fetch("/api/customer/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ merchantSlug, phone }),
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          found?: boolean;
          message?: string;
          error?: string;
          member?: { id: string; points: number; tierName: string };
        };
        if (!res.ok) throw new Error(data.error ?? "Lookup failed");
        if (!data.found) {
          setPhoneMsg(data.message ?? "No member found for that number.");
          return;
        }
        if (data.member?.id) {
          try {
            localStorage.setItem(`irewards-member:${merchantSlug}`, data.member.id);
          } catch {
            /* ignore */
          }
        }
        setShowLoadPoints(false);
        setPhonePrompt("");
        await refresh();
      })
      .catch((err) => {
        setPhoneMsg(err instanceof Error ? err.message : "Lookup failed");
      })
      .finally(() => setPhoneBusy(false));
  }

  /** Product detail is a routed page (shared template for every product). */
  function openItemDetail(item: StorefrontMenuItem) {
    const href = routes.item(item.id);
    router.push(embed ? `${href}?embed=1` : href);
  }

  /**
   * Anything with choices to make goes to the product page, so options are
   * picked in one place. Only a product with no options adds in a single tap.
   */
  function handleQuickAdd(item: StorefrontMenuItem, e?: React.MouseEvent) {
    e?.stopPropagation();
    if ((item.modifierGroups?.length ?? 0) > 0) {
      openItemDetail(item);
      return;
    }
    addItem(item.id);
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

  return (
    <MobileShell>
      <StorefrontMenuHeader
        storeName={merchantName}
        tableId={tableId}
        serviceGuestLine={serviceGuestLine}
        languages={languages}
        language={lang}
        onLanguageChange={setLang}
        copy={copy}
      />

      {/* Guests: campaign banner is the hero chrome (no loyalty strip). */}
      {!showMemberChrome && !embed && banner && (
        <div className="mx-5 mt-3 overflow-hidden border border-surface-container-highest">
          {banner.linkUrl ? (
            <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
              <StorefrontBannerVisual banner={banner} />
            </a>
          ) : (
            <StorefrontBannerVisual banner={banner} />
          )}
        </div>
      )}

      {showMemberChrome && (
        <section className="px-5 pt-4">
          <h2 className="font-display text-[28px] font-bold leading-none tracking-tight text-on-surface">
            Welcome{memberFirst ? ` ${memberFirst}` : ""}
          </h2>

          {pointsProgramEnabled && (
            <div className="mt-4 flex items-center justify-between gap-3 border border-surface-container-highest bg-white px-3.5 py-3.5">
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Points balance
                </p>
                <p className="mt-0.5 font-display text-[15px] font-semibold text-on-surface">
                  {activeMember!.points.toLocaleString()} pts
                </p>
              </div>
              {tier && tier.pointsMultiplier > 1 && (
                <span className="shrink-0 border border-on-surface bg-white px-2 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-on-surface">
                  {tier.name} {formatMultiplier(tier.pointsMultiplier)}x boost
                </span>
              )}
              {tier && tier.pointsMultiplier <= 1 && (
                <span className="shrink-0 border border-on-surface/25 bg-white px-2 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-on-surface">
                  {tier.name}
                </span>
              )}
            </div>
          )}

          {stampsProgramEnabled && stamps && (
            <div className="mt-4">
              <StorefrontStampProgress filled={stamps.filled} size={stamps.size} />
            </div>
          )}
        </section>
      )}

      {!showMemberChrome && !embed && !previewMember && (
        <div className="px-5 pt-3">
          {!showLoadPoints ? (
            <button
              type="button"
              onClick={() => setShowLoadPoints(true)}
              className="text-left text-[12px] text-on-surface-variant underline-offset-2 hover:text-on-surface hover:underline"
            >
              Returning member? Load your points
            </button>
          ) : (
            <form onSubmit={submitLoadPoints} className="flex flex-col gap-2">
              <div className="flex gap-1.5">
                <span className="flex h-9 shrink-0 items-center border border-surface-container-highest bg-white px-2 font-mono text-[11px] text-on-surface-variant">
                  +60
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoFocus
                  placeholder="12 345 6789"
                  value={phonePrompt}
                  onChange={(e) => setPhonePrompt(e.target.value)}
                  className="h-9 min-w-0 flex-1 border border-surface-container-highest bg-white px-2.5 text-[13px] text-on-surface"
                />
                <button
                  type="submit"
                  disabled={phoneBusy}
                  className="h-9 shrink-0 bg-primary px-3 text-[12px] font-medium text-on-primary disabled:opacity-50"
                >
                  {phoneBusy ? "…" : "Load"}
                </button>
              </div>
              {phoneMsg && <p className="text-[11px] text-on-surface-variant">{phoneMsg}</p>}
              <button
                type="button"
                onClick={() => {
                  setShowLoadPoints(false);
                  setPhoneMsg(null);
                }}
                className="self-start text-[11px] text-on-surface-variant"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

      {/* Members: optional promo under loyalty chrome */}
      {showMemberChrome && !embed && banner && (
        <div className="mx-5 mt-4 overflow-hidden border border-surface-container-highest">
          {banner.linkUrl ? (
            <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
              <StorefrontBannerVisual banner={banner} />
            </a>
          ) : (
            <StorefrontBannerVisual banner={banner} />
          )}
        </div>
      )}

      {showMemberChrome && usualItems.length > 0 && (
        <section className="pt-5">
          <button
            type="button"
            onClick={() => setUsualExpanded((open) => !open)}
            aria-expanded={usualExpanded}
            className="mb-2.5 flex w-full items-center justify-between gap-2 px-5 text-left"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
              Your usual
              <span className="ml-1.5 normal-case tracking-normal text-on-surface-variant/70">
                ({usualItems.length})
              </span>
            </span>
            <Icon
              name={usualExpanded ? "expand_less" : "expand_more"}
              className="text-xl text-on-surface-variant"
            />
          </button>
          {usualExpanded && (
            <HorizontalScrollCue
              className="px-5"
              contentClassName="gap-3 pb-1"
              fadeFromClass="from-surface-container-lowest"
              controlClassName="border-surface-container-highest bg-surface-container-lowest"
              ariaLabel="Your usual order"
            >
              {usualItems.map((usual) => {
                const menuItem = allItems.find((m) => m.name === usual.name);
                if (!menuItem) {
                  return (
                    <div
                      key={usual.name}
                      className="flex w-[148px] shrink-0 items-center border border-surface-container-highest px-3 py-4 text-[13px] text-on-surface-variant"
                    >
                      {usual.quantity}× {usual.name}
                    </div>
                  );
                }
                return (
                  <StorefrontUsualCard
                    key={usual.name}
                    item={menuItem}
                    subtitle={menuItem.description?.split(/[.\n]/)[0]?.trim() || null}
                    currency={merchantCurrency}
                    onOpen={() => openItemDetail(menuItem)}
                    onAdd={() => handleQuickAdd(menuItem)}
                  />
                );
              })}
            </HorizontalScrollCue>
          )}
        </section>
      )}

      <div className="mt-2">
        <StorefrontCategoryPills
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      <section className={`px-5 ${cartCount > 0 && !embed ? "pb-44" : "pb-28"}`}>
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
        {filteredMenu.length === 0 && (
          <p className="py-10 text-center text-[13px] text-on-surface-variant">
            No items in this category.
          </p>
        )}
      </section>

      {!embed && cartCount > 0 && (
        <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[382px] -translate-x-1/2 px-4 pb-1">
          <div className="overflow-hidden bg-primary text-on-primary shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
            {cartUpsell && (
              <div className="flex items-center gap-2 border-b border-white/15 px-3 py-2">
                <Icon name="auto_awesome" className="shrink-0 text-[15px] text-white/80" />
                <p className="min-w-0 flex-1 truncate text-[12px] text-white/90">
                  {cartUpsell.reason}
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(cartUpsell.item)}
                  className="shrink-0 bg-white px-2.5 py-1 text-[11px] font-semibold text-on-surface"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setUpsellDismissed(true)}
                  aria-label="Dismiss suggestion"
                  className="shrink-0 text-white/50 hover:text-white"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/70">
                  {cartCount} item{cartCount === 1 ? "" : "s"}
                </p>
                <p className="font-display text-[17px] font-semibold leading-tight text-on-primary">
                  {formatMerchantPrice(cartTotal, merchantCurrency)}
                </p>
              </div>
              <Link
                href={routes.cart}
                className="flex shrink-0 items-center gap-1 bg-white px-4 py-2.5 font-display text-[14px] font-semibold text-on-surface"
              >
                Pay
                <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
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

    </MobileShell>
  );
}
