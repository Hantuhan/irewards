import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import { resolveLocalized, type LocalizedMap } from "@/lib/i18n/program-locale";

export function menuLocalizedText(
  map: LocalizedMap | Record<string, string> | null | undefined,
  lang: ProgramLanguage,
  fallback: string,
): string {
  return resolveLocalized(map as LocalizedMap, lang, fallback);
}

export function mergeLocalizedMap(
  existing: LocalizedMap | Record<string, string> | null | undefined,
  updates: LocalizedMap,
): LocalizedMap {
  return { ...(existing ?? {}), ...updates };
}

export function englishFromLocalized(
  map: LocalizedMap | Record<string, string> | null | undefined,
  fallback: string,
): string {
  const en = map?.en?.trim();
  if (en) return en;
  return fallback;
}
