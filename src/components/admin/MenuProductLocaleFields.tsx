"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  PROGRAM_LANGUAGES,
  type LocalizedMap,
  type ProgramLanguage,
} from "@/lib/i18n/program-locale";
import { merchantApi } from "@/lib/merchant/fetch";

type TargetLanguage = Exclude<ProgramLanguage, "en">;

export type MenuProductTranslations = {
  nameI18n: LocalizedMap;
  descriptionI18n: LocalizedMap;
  ingredientsI18n: LocalizedMap;
  itemNotesI18n: LocalizedMap;
};

type MenuProductLocaleFieldsProps = {
  merchantSlug: string;
  itemSlug: string;
  englishName: string;
  englishDescription: string;
  englishCustomIngredients: string;
  englishItemNotes: string;
  translations: MenuProductTranslations;
  storefrontLanguages: ProgramLanguage[];
  onChange: (next: MenuProductTranslations) => void;
  /** Basics-only: name + short description. Details: ingredients + notes. All: everything. */
  mode?: "all" | "basics" | "details";
};

export function MenuProductLocaleFields({
  merchantSlug,
  itemSlug,
  englishName,
  englishDescription,
  englishCustomIngredients,
  englishItemNotes,
  translations,
  storefrontLanguages,
  onChange,
  mode = "all",
}: MenuProductLocaleFieldsProps) {
  const targetLanguages = storefrontLanguages.filter(
    (l): l is TargetLanguage => l === "zh" || l === "ms",
  );
  const [editLang, setEditLang] = useState<TargetLanguage>(targetLanguages[0] ?? "zh");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  useEffect(() => {
    if (targetLanguages.length > 0 && !targetLanguages.includes(editLang)) {
      setEditLang(targetLanguages[0]);
    }
  }, [targetLanguages, editLang]);

  if (targetLanguages.length === 0) return null;

  const langLabel = PROGRAM_LANGUAGES.find((l) => l.code === editLang)?.label ?? editLang;
  const isNewItem = itemSlug.startsWith("item-");
  const showBasics = mode === "all" || mode === "basics";
  const showDetails = mode === "all" || mode === "details";

  async function suggestWithAi() {
    if (isNewItem) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const result = await merchantApi<{
        items: Array<{
          slug: string;
          nameI18n: LocalizedMap;
          descriptionI18n: LocalizedMap;
          ingredientsI18n: LocalizedMap;
          itemNotesI18n: LocalizedMap;
        }>;
        source: string;
        message?: string;
      }>(`/api/merchant/${merchantSlug}/ai/menu-translate`, {
        method: "POST",
        body: JSON.stringify({
          targetLanguages: [editLang],
          overwrite: true,
          itemSlugs: [itemSlug],
        }),
      });

      if (result.message && result.source === "empty") {
        setSuggestError(result.message);
        return;
      }

      const row = result.items.find((i) => i.slug === itemSlug);
      if (!row) {
        setSuggestError("No translation returned. Try again.");
        return;
      }

      onChange({
        nameI18n: { ...translations.nameI18n, en: englishName, ...row.nameI18n },
        descriptionI18n: {
          ...translations.descriptionI18n,
          en: englishDescription,
          ...row.descriptionI18n,
        },
        ingredientsI18n: {
          ...translations.ingredientsI18n,
          en: englishCustomIngredients,
          ...row.ingredientsI18n,
        },
        itemNotesI18n: {
          ...translations.itemNotesI18n,
          en: englishItemNotes,
          ...row.itemNotesI18n,
        },
      });
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "AI suggestion failed");
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="border border-surface-container-highest bg-surface-container-low p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            {showDetails && !showBasics ? "Detail translations" : "Storefront translations"}
          </p>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {showDetails && !showBasics
              ? "Ingredient chips use the shared library (fish bone, spice level, etc.). Translate custom ingredients and notes below."
              : "English is edited above. Add what diners see in the product detail sheet and menu list."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {targetLanguages.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setEditLang(code)}
              className={`border px-3 py-1.5 font-display text-headline-sm transition-colors ${
                editLang === code
                  ? "border-primary bg-primary text-on-primary"
                  : "border-surface-container-highest text-on-surface-variant"
              }`}
            >
              {PROGRAM_LANGUAGES.find((l) => l.code === code)?.short ?? code}
            </button>
          ))}
          <button
            type="button"
            onClick={suggestWithAi}
            disabled={suggesting || isNewItem}
            className="inline-flex items-center gap-1 border border-primary px-3 py-1.5 font-mono text-label-mono text-primary disabled:opacity-50"
          >
            <Icon name="auto_awesome" className="text-sm" />
            {suggesting ? "Suggesting…" : `AI suggest · ${langLabel}`}
          </button>
        </div>
      </div>

      {isNewItem && (
        <p className="mt-3 text-body-md text-on-surface-variant">
          Save the product first, then use AI suggest for translations.
        </p>
      )}
      {suggestError && (
        <p className="mt-3 text-body-md text-red-700" role="alert">{suggestError}</p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {showBasics && (
          <>
            <label>
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Name · {langLabel}
              </span>
              <input
                value={translations.nameI18n[editLang] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...translations,
                    nameI18n: { ...translations.nameI18n, en: englishName, [editLang]: e.target.value },
                  })
                }
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              />
            </label>
            <label>
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Short description · {langLabel}
              </span>
              <input
                value={translations.descriptionI18n[editLang] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...translations,
                    descriptionI18n: {
                      ...translations.descriptionI18n,
                      en: englishDescription,
                      [editLang]: e.target.value,
                    },
                  })
                }
                placeholder="One line on the menu list"
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              />
            </label>
          </>
        )}

        {showDetails && (
          <>
            <label>
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Custom ingredients · {langLabel}
              </span>
              <textarea
                rows={2}
                value={translations.ingredientsI18n[editLang] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...translations,
                    ingredientsI18n: {
                      ...translations.ingredientsI18n,
                      en: englishCustomIngredients,
                      [editLang]: e.target.value,
                    },
                  })
                }
                placeholder="Extra ingredient details not covered by chips"
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              />
            </label>
            <label>
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Item notes · {langLabel}
              </span>
              <input
                value={translations.itemNotesI18n[editLang] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...translations,
                    itemNotesI18n: {
                      ...translations.itemNotesI18n,
                      en: englishItemNotes,
                      [editLang]: e.target.value,
                    },
                  })
                }
                placeholder="e.g. Best served iced"
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
