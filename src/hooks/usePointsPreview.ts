"use client";

import { useEffect, useState } from "react";
import type { OrderPointsPreview } from "@/lib/services/loyalty-points";

/**
 * Points the current order will earn, computed server-side by the same
 * pipeline that credits them after payment. Debounced because the cart total
 * changes as the diner edits quantities, promos and redemption.
 */
export function usePointsPreview(input: {
  merchantSlug: string;
  totalCents: number;
  menuItemIds: string[];
  /** Skip while the cart is empty or charge settings are still loading. */
  enabled?: boolean;
}) {
  const { merchantSlug, totalCents, enabled = true } = input;
  const menuItemKey = input.menuItemIds.join(",");
  const [preview, setPreview] = useState<OrderPointsPreview | null>(null);

  useEffect(() => {
    if (!enabled || totalCents <= 0) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(`/api/merchant/${merchantSlug}/points/preview`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalCents,
          menuItemIds: menuItemKey ? menuItemKey.split(",") : [],
        }),
      })
        .then((res) => res.json())
        .then((json: OrderPointsPreview & { error?: string }) => {
          if (cancelled || json.error) return;
          setPreview(json);
        })
        .catch(() => undefined);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [merchantSlug, totalCents, menuItemKey, enabled]);

  return preview;
}
