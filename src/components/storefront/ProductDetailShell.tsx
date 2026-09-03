"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/ui/MobileShell";
import { Icon } from "@/components/ui/Icon";
import {
  ProductDetailView,
  type ProductDetailAddPayload,
} from "@/components/storefront/ProductDetailView";
import { useStorefrontLocale } from "@/hooks/useStorefrontLocale";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { useTableCart } from "@/hooks/useTableCart";
import { customerRoutes } from "@/lib/navigation/routes";
import { fetchStorefrontMenuItem, type StorefrontMenuItem } from "@/lib/menu/storefront";

type ProductDetailShellProps = {
  merchantSlug: string;
  tableId: string;
  itemSlug: string;
};

/** Routed storefront product page: /m/[merchant]/table/[table]/item/[slug]. */
export function ProductDetailShell({ merchantSlug, tableId, itemSlug }: ProductDetailShellProps) {
  const router = useRouter();
  const routes = customerRoutes(merchantSlug, tableId);
  const { lang, copy } = useStorefrontLocale(merchantSlug, ["en", "zh", "ms"]);
  const {
    categories,
    allItems,
    badges,
    ingredientPresets,
    merchantCurrency,
    pointsProgramEnabled,
    loading: menuLoading,
  } = useStorefrontMenu(merchantSlug, lang);
  const { member } = useMemberSession();

  const [item, setItem] = useState<StorefrontMenuItem | null>(null);
  const [itemLoading, setItemLoading] = useState(true);
  const [itemError, setItemError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItemLoading(true);
    setItemError(null);
    fetchStorefrontMenuItem(merchantSlug, itemSlug, lang)
      .then((fresh) => {
        if (!cancelled) setItem(fresh);
      })
      .catch((err) => {
        if (!cancelled) {
          // Only surface a message the server actually wrote. A network failure
          // reads as "Failed to fetch", which means nothing to a diner.
          const serverMessage =
            err instanceof Error &&
            !/not found/i.test(err.message) &&
            !/failed to fetch|networkerror|load failed/i.test(err.message)
              ? err.message
              : null;
          setItemError(serverMessage ?? copy.productUnavailable);
        }
      })
      .finally(() => {
        if (!cancelled) setItemLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [merchantSlug, itemSlug, lang, copy.productUnavailable]);

  // Cart pricing needs the current item even before the full menu has loaded.
  const cartItems = useMemo(() => {
    if (!item) return allItems;
    return allItems.some((i) => i.id === item.id) ? allItems : [...allItems, item];
  }, [allItems, item]);

  const { addConfiguredItem, addItem, quantityInCart, cartCount, serviceType } = useTableCart(
    merchantSlug,
    tableId,
    cartItems,
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const categoryLabel = useMemo(() => {
    if (!item) return null;
    return categories.find((c) => c.id === item.category)?.label ?? null;
  }, [categories, item]);

  const pairings = useMemo(() => {
    if (!item) return [];
    const bySlug = new Map(allItems.map((i) => [i.id, i]));
    return (item.upsellLinks ?? [])
      .map((link) => bySlug.get(link.slug))
      .filter((pair): pair is StorefrontMenuItem => Boolean(pair) && pair!.id !== item.id)
      .slice(0, 4)
      .map((pair) => ({
        item: pair,
        href: routes.item(pair.id),
        quantityInCart: quantityInCart(pair.id),
      }));
  }, [item, allItems, routes, quantityInCart]);

  const contextLabel = `${copy.table} ${tableId} · ${
    serviceType === "takeaway" ? copy.takeaway : copy.dineIn
  }`;

  function handleAdd(payload: ProductDetailAddPayload) {
    if (!item) return;
    addConfiguredItem(item.id, payload.selections, payload.quantity, undefined, payload.note);
    setToast(`${copy.added}: ${item.name}`);
    router.push(routes.shop);
  }

  function handleAddPairing(pairing: StorefrontMenuItem) {
    if ((pairing.modifierGroups?.length ?? 0) > 0) {
      router.push(routes.item(pairing.id));
      return;
    }
    addItem(pairing.id);
    setToast(`${copy.added}: ${pairing.name}`);
  }

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: item?.name ?? "Product", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch {
      /* user dismissed share sheet */
    }
  }

  const placeholderItem: StorefrontMenuItem = {
    id: itemSlug,
    name: "",
    description: "",
    priceCents: 0,
    category: "",
    menuItemId: itemSlug,
  };

  return (
    <MobileShell showPdpa={false}>
      <ProductDetailView
        item={item ?? placeholderItem}
        currency={merchantCurrency}
        categoryLabel={categoryLabel}
        badgeCatalog={badges}
        ingredientCatalog={ingredientPresets}
        lang={lang}
        copy={copy}
        contextLabel={contextLabel}
        pointsProgramEnabled={pointsProgramEnabled}
        isMember={Boolean(member)}
        pairings={pairings}
        quantityInCart={item ? quantityInCart(item.id) : 0}
        loading={itemLoading || (menuLoading && !item)}
        error={itemError}
        onBack={() => router.push(routes.shop)}
        onAdd={handleAdd}
        onAddPairing={handleAddPairing}
        onShare={handleShare}
      />

      {toast ? (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] w-full max-w-mobile -translate-x-1/2 px-4">
          <div className="flex items-center justify-between gap-3 border border-primary bg-primary px-4 py-3 text-on-primary shadow-lg">
            <span className="flex items-center gap-2 text-body-md">
              <Icon name="check_circle" className="text-[18px]" />
              {toast}
            </span>
            {cartCount > 0 ? (
              <span className="font-mono text-[11px] uppercase tracking-wider">
                {copy.cart} · {cartCount}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </MobileShell>
  );
}
