"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cartLineKey,
  type CartLinePayload,
  type CartModifierSelection,
  unitPriceWithModifiers,
} from "@/lib/menu/modifiers";
import {
  calculateTakeawaySurchargeCents,
  DEFAULT_TAKEAWAY_CHARGE,
  shouldApplyTakeawayCharge,
  type ServiceType,
} from "@/lib/menu/takeaway-charge";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";

function storageKey(merchantSlug: string, tableId: string) {
  return `irewards-cart-v2:${merchantSlug}:${tableId}`;
}

function serviceTypeKey(merchantSlug: string, tableId: string) {
  return `irewards-service-type:${merchantSlug}:${tableId}`;
}

export type CartLine = {
  key: string;
  itemId: string;
  itemName: string;
  quantity: number;
  basePriceCents: number;
  selections: CartModifierSelection[];
  unitPriceCents: number;
  packedForTakeaway: boolean;
  takeawaySurchargeCents: number;
};

type StoredLine = {
  itemId: string;
  quantity: number;
  selections: CartModifierSelection[];
  packedForTakeaway?: boolean;
  promoPriceCents?: number | null;
};

export function useTableCart(
  merchantSlug: string,
  tableId: string,
  menuItems: StorefrontMenuItem[] = [],
) {
  const [lines, setLines] = useState<StoredLine[]>([]);
  const [serviceType, setServiceTypeState] = useState<ServiceType>("dine_in");
  const [ready, setReady] = useState(false);

  const itemMap = useMemo(() => new Map(menuItems.map((i) => [i.id, i])), [menuItems]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(merchantSlug, tableId));
      if (raw) setLines(JSON.parse(raw) as StoredLine[]);
      const storedServiceType = sessionStorage.getItem(serviceTypeKey(merchantSlug, tableId));
      if (storedServiceType === "takeaway" || storedServiceType === "dine_in") {
        setServiceTypeState(storedServiceType);
      }
    } catch {
      setLines([]);
    }
    setReady(true);
  }, [merchantSlug, tableId]);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(storageKey(merchantSlug, tableId), JSON.stringify(lines));
  }, [lines, merchantSlug, tableId, ready]);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(serviceTypeKey(merchantSlug, tableId), serviceType);
  }, [serviceType, merchantSlug, tableId, ready]);

  const setServiceType = useCallback((next: ServiceType) => {
    setServiceTypeState(next);
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        packedForTakeaway: next === "takeaway",
      })),
    );
  }, []);

  const cartLines: CartLine[] = useMemo(() => {
    return lines
      .map((line) => {
        const item = itemMap.get(line.itemId);
        if (!item) return null;
        const menuBaseCents =
          line.promoPriceCents != null ? line.promoPriceCents : item.priceCents;
        const basePriceCents = unitPriceWithModifiers(menuBaseCents, line.selections);
        const packedForTakeaway = shouldApplyTakeawayCharge(
          serviceType,
          line.packedForTakeaway ?? false,
        );
        const takeawaySurchargeCents = packedForTakeaway
          ? calculateTakeawaySurchargeCents(
              basePriceCents,
              item.takeawayCharge ?? DEFAULT_TAKEAWAY_CHARGE,
            )
          : 0;
        return {
          key: cartLineKey(line.itemId, line.selections),
          itemId: line.itemId,
          itemName: item.name,
          quantity: line.quantity,
          basePriceCents,
          selections: line.selections,
          unitPriceCents: basePriceCents + takeawaySurchargeCents,
          packedForTakeaway,
          takeawaySurchargeCents,
        };
      })
      .filter((l): l is CartLine => l !== null);
  }, [lines, itemMap, serviceType]);

  const cart = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of cartLines) {
      map[line.itemId] = (map[line.itemId] ?? 0) + line.quantity;
    }
    return map;
  }, [cartLines]);

  const cartCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.quantity, 0),
    [cartLines],
  );

  const cartTotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0),
    [cartLines],
  );

  const checkoutLines: CartLinePayload[] = useMemo(
    () =>
      cartLines.map((line) => ({
        id: line.itemId,
        quantity: line.quantity,
        selections: line.selections.map((s) => ({
          groupId: s.groupId,
          optionId: s.optionId,
          quantity: s.quantity,
        })),
        packedForTakeaway: line.packedForTakeaway,
      })),
    [cartLines],
  );

  const addConfiguredItem = useCallback(
    (
      itemId: string,
      selections: CartModifierSelection[],
      amount = 1,
      promoPriceCents?: number | null,
    ) => {
      const key = cartLineKey(itemId, selections);
      setLines((prev) => {
        const idx = prev.findIndex(
          (l) => cartLineKey(l.itemId, l.selections) === key,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + amount,
            promoPriceCents:
              promoPriceCents != null ? promoPriceCents : next[idx].promoPriceCents,
          };
          return next;
        }
        return [
          ...prev,
          {
            itemId,
            quantity: amount,
            selections,
            packedForTakeaway: serviceType === "takeaway",
            promoPriceCents,
          },
        ];
      });
    },
    [serviceType],
  );

  const addItem = useCallback(
    (itemId: string, amount = 1, promoPriceCents?: number | null) => {
      addConfiguredItem(itemId, [], amount, promoPriceCents);
    },
    [addConfiguredItem],
  );

  const setLineQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => cartLineKey(l.itemId, l.selections) !== key);
      return prev.map((l) =>
        cartLineKey(l.itemId, l.selections) === key ? { ...l, quantity } : l,
      );
    });
  }, []);

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setLines((prev) => {
      const rest = prev.filter((l) => l.itemId !== itemId);
      if (quantity <= 0) return rest;
      return [
        ...rest,
        {
          itemId,
          quantity,
          selections: [],
          packedForTakeaway: serviceType === "takeaway",
        },
      ];
    });
  }, [serviceType]);

  const setLinePackedForTakeaway = useCallback((key: string, packedForTakeaway: boolean) => {
    setLines((prev) =>
      prev.map((l) =>
        cartLineKey(l.itemId, l.selections) === key ? { ...l, packedForTakeaway } : l,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const quantityInCart = useCallback(
    (itemId: string) =>
      cartLines.filter((l) => l.itemId === itemId).reduce((s, l) => s + l.quantity, 0),
    [cartLines],
  );

  return {
    cart,
    cartLines,
    cartCount,
    cartTotal,
    checkoutLines,
    serviceType,
    setServiceType,
    addItem,
    addConfiguredItem,
    setLineQuantity,
    setQuantity,
    setLinePackedForTakeaway,
    clearCart,
    quantityInCart,
    ready,
  };
}
