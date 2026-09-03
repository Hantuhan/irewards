"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchStorefrontMenu,
  type StorefrontCategory,
  type StorefrontMenuItem,
} from "@/lib/menu/storefront";
import type { MenuBadge } from "@/lib/menu/menu-badges";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";

export function useStorefrontMenu(merchantSlug: string, lang: ProgramLanguage = "en") {
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [badges, setBadges] = useState<MenuBadge[]>([]);
  const [languages, setLanguages] = useState<ProgramLanguage[]>(["en"]);
  const [merchantName, setMerchantName] = useState(merchantSlug);
  const [merchantCurrency, setMerchantCurrency] = useState<"MYR" | "SGD">("MYR");
  const [pointsProgramEnabled, setPointsProgramEnabled] = useState(true);
  const [stampsProgramEnabled, setStampsProgramEnabled] = useState(false);
  const [pointsPerRinggit, setPointsPerRinggit] = useState(0.1);
  const [pointsRedeemCentsPerPoint, setPointsRedeemCentsPerPoint] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStorefrontMenu(merchantSlug, lang)
      .then((data) => {
        setCategories(data.categories);
        setBadges(data.badges);
        const langs = data.languages.filter(
          (l): l is ProgramLanguage => l === "en" || l === "zh" || l === "ms",
        );
        setLanguages(langs.length > 0 ? langs : ["en"]);
        setMerchantName(data.merchant.name);
        setMerchantCurrency(data.merchant.currency);
        setPointsProgramEnabled(data.merchant.pointsProgramEnabled !== false);
        setStampsProgramEnabled(Boolean(data.merchant.stampsProgramEnabled));
        setPointsPerRinggit(Number(data.merchant.pointsPerRinggit ?? 0.1));
        setPointsRedeemCentsPerPoint(
          Number(data.merchant.pointsRedeemCentsPerPoint ?? 10),
        );
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load menu"),
      )
      .finally(() => setLoading(false));
  }, [merchantSlug, lang]);

  const allItems: StorefrontMenuItem[] = useMemo(
    () => categories.flatMap((c) => c.items),
    [categories],
  );

  return {
    categories,
    allItems,
    badges,
    languages,
    merchantName,
    merchantCurrency,
    pointsProgramEnabled,
    stampsProgramEnabled,
    pointsPerRinggit,
    pointsRedeemCentsPerPoint,
    loading,
    error,
  };
}
