"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import { storageKeyForStorefrontLang, storefrontCopy } from "@/lib/i18n/storefront-locale";

export function useStorefrontLocale(merchantSlug: string, available: ProgramLanguage[]) {
  const options = useMemo(
    () => (available.length > 0 ? available : (["en"] as ProgramLanguage[])),
    [available],
  );
  const optionsKey = options.join(",");
  const [lang, setLangState] = useState<ProgramLanguage>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem(storageKeyForStorefrontLang(merchantSlug));
    if (stored === "en" || stored === "zh" || stored === "ms") return stored;
    return "en";
  });

  useEffect(() => {
    const stored = localStorage.getItem(storageKeyForStorefrontLang(merchantSlug));
    if (stored === "en" || stored === "zh" || stored === "ms") {
      if (options.includes(stored)) {
        setLangState(stored);
        return;
      }
    }
    if (!options.includes(lang)) {
      setLangState(options[0]);
    }
  }, [merchantSlug, optionsKey, options, lang]);

  const setLang = useCallback(
    (next: ProgramLanguage) => {
      if (!options.includes(next)) return;
      setLangState(next);
      localStorage.setItem(storageKeyForStorefrontLang(merchantSlug), next);
    },
    [merchantSlug, options],
  );

  return {
    lang,
    setLang,
    options,
    copy: storefrontCopy(lang),
  };
}
