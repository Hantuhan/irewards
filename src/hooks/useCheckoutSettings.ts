"use client";

import { useEffect, useState } from "react";
import type { MerchantChargeSettings } from "@/lib/services/order-totals";

export function useCheckoutSettings(merchantSlug: string) {
  const [settings, setSettings] = useState<MerchantChargeSettings | null>(null);
  const [currency, setCurrency] = useState<"MYR" | "SGD">("MYR");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/merchant/${merchantSlug}/checkout-settings`, { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (json: {
          error?: string;
          currency?: "MYR" | "SGD";
          serviceChargeEnabled?: boolean;
          serviceChargePercent?: number;
          sstEnabled?: boolean;
          sstRatePercent?: number;
          gstEnabled?: boolean;
          gstRatePercent?: number;
        }) => {
          if (cancelled || json.error) return;
          setCurrency(json.currency ?? "MYR");
          setSettings({
            currency: json.currency ?? "MYR",
            serviceChargeEnabled: json.serviceChargeEnabled ?? false,
            serviceChargePercent: json.serviceChargePercent ?? 10,
            sstEnabled: json.sstEnabled ?? false,
            sstRatePercent: json.sstRatePercent ?? 6,
            gstEnabled: json.gstEnabled ?? false,
            gstRatePercent: json.gstRatePercent ?? 9,
          });
        },
      )
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [merchantSlug]);

  return { settings, currency, loading };
}
