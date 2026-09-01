"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function cartKey(merchantSlug: string, tableId: string) {
  return `irewards-cart:${merchantSlug}:${tableId}`;
}

type MenuPrice = { id: string; priceCents: number };

export function useTableCart(
  merchantSlug: string,
  tableId: string,
  menuItems: MenuPrice[] = [],
) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  const priceMap = useMemo(
    () => new Map(menuItems.map((item) => [item.id, item.priceCents])),
    [menuItems],
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(cartKey(merchantSlug, tableId));
      if (raw) setCart(JSON.parse(raw) as Record<string, number>);
    } catch {
      setCart({});
    }
    setReady(true);
  }, [merchantSlug, tableId]);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(cartKey(merchantSlug, tableId), JSON.stringify(cart));
  }, [cart, merchantSlug, tableId, ready]);

  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, qty) => sum + qty, 0),
    [cart],
  );

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const price = priceMap.get(id) ?? 0;
      return sum + price * qty;
    }, 0);
  }, [cart, priceMap]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({ id, quantity }));
  }, [cart]);

  const addItem = useCallback((itemId: string, amount = 1) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? 0) + amount,
    }));
  }, []);

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) delete next[itemId];
      else next[itemId] = quantity;
      return next;
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  return {
    cart,
    cartCount,
    cartTotal,
    cartLines,
    addItem,
    setQuantity,
    clearCart,
    ready,
  };
}
