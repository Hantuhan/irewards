"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dinerFacingSuggestReason,
  defaultSuggestReason,
} from "@/lib/ai/store-intelligence";

export type StoreSuggestion = {
  itemId: string | null;
  name: string | null;
  reason: string;
  suggestType: "upsell" | "downsell";
  source: string;
  regularPriceCents?: number;
  promoPriceCents?: number | null;
};

export type StoreSuggestionBundle = {
  productSuggestions: StoreSuggestion[];
  globalSuggestions: StoreSuggestion[];
};

type UseStoreSuggestionInput = {
  merchantSlug: string;
  cartItemIds: string[];
  cartTotalCents?: number;
  memberTier?: string | null;
  usualOrder?: { name: string }[];
  enabled: boolean;
};

const emptyBundle: StoreSuggestionBundle = {
  productSuggestions: [],
  globalSuggestions: [],
};

function normalizeSuggestion(raw: unknown): StoreSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as StoreSuggestion;
  if (!item.itemId) return null;
  const suggestType = item.suggestType === "downsell" ? "downsell" : "upsell";
  return {
    itemId: item.itemId,
    name: item.name ?? null,
    reason: dinerFacingSuggestReason(item.reason, defaultSuggestReason(suggestType)),
    suggestType,
    source: item.source ?? "rules",
    regularPriceCents: item.regularPriceCents,
    promoPriceCents: item.promoPriceCents,
  };
}

function normalizeSuggestions(items: unknown): StoreSuggestion[] {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeSuggestion).filter((s): s is StoreSuggestion => s != null);
}

function normalizeBundle(data: unknown): StoreSuggestionBundle {
  if (!data || typeof data !== "object") return emptyBundle;

  const payload = data as {
    productSuggestions?: unknown;
    globalSuggestions?: unknown;
    suggestions?: unknown;
    itemId?: string | null;
    name?: string | null;
    reason?: string;
    suggestType?: "upsell" | "downsell";
    source?: string;
    regularPriceCents?: number;
    promoPriceCents?: number | null;
  };

  if (payload.productSuggestions || payload.globalSuggestions) {
    return {
      productSuggestions: normalizeSuggestions(payload.productSuggestions),
      globalSuggestions: normalizeSuggestions(payload.globalSuggestions),
    };
  }

  if (Array.isArray(payload.suggestions)) {
    return {
      productSuggestions: normalizeSuggestions(payload.suggestions),
      globalSuggestions: [],
    };
  }

  const legacy = normalizeSuggestion(payload);
  if (legacy) {
    return { productSuggestions: [legacy], globalSuggestions: [] };
  }

  return emptyBundle;
}

export function useStoreSuggestion({
  merchantSlug,
  cartItemIds,
  cartTotalCents,
  memberTier,
  usualOrder,
  enabled,
}: UseStoreSuggestionInput) {
  const [suggestions, setSuggestions] = useState<StoreSuggestionBundle>(emptyBundle);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (cartItemIds.length === 0) {
      setSuggestions(emptyBundle);
      return emptyBundle;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/merchant/${merchantSlug}/ai/store-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItemIds,
          cartTotalCents,
          memberTier: memberTier ?? null,
          usualOrder,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Suggestion failed");
      const bundle = normalizeBundle(data);
      setSuggestions(bundle);
      return bundle;
    } catch {
      setSuggestions(emptyBundle);
      return emptyBundle;
    } finally {
      setLoading(false);
    }
  }, [cartItemIds, cartTotalCents, merchantSlug, memberTier, usualOrder]);

  useEffect(() => {
    if (!enabled || cartItemIds.length === 0) {
      setSuggestions(emptyBundle);
      return;
    }
    void fetchSuggestions();
  }, [enabled, cartItemIds, fetchSuggestions]);

  return { suggestions, loading, refresh: fetchSuggestions };
}
