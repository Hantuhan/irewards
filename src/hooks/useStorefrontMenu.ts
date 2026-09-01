"use client";

import { useEffect, useState } from "react";
import {
  fetchStorefrontMenu,
  type StorefrontCategory,
  type StorefrontMenuItem,
} from "@/lib/menu/storefront";

export function useStorefrontMenu(merchantSlug: string) {
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStorefrontMenu(merchantSlug)
      .then(setCategories)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load menu"),
      )
      .finally(() => setLoading(false));
  }, [merchantSlug]);

  const allItems: StorefrontMenuItem[] = categories.flatMap((c) => c.items);

  return { categories, allItems, loading, error };
}
