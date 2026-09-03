"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PROGRAM_LANGUAGES,
  type LocalizedMap,
  type ProgramLanguage,
} from "@/lib/i18n/program-locale";

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
  /** Sync EN edits back to the product's primary English fields. */
  onEnglishNameChange?: (value: string) => void;
  onEnglishDescriptionChange?: (value: string) => void;
  onEnglishCustomIngredientsChange?: (value: string) => void;
  onEnglishItemNotesChange?: (value: string) => void;
  /** Basics-only: name + short description. Details: ingredients + notes. All: everything. */
  mode?: "all" | "basics" | "details";
  /** Optional character limit for EN description (basics). */
  descriptionMaxLength?: number;
};

export function MenuProductLocaleFields({
  englishName,
  englishDescription,
  englishCustomIngredients,
  englishItemNotes,
  translations,
  storefrontLanguages,
  onChange,
  onEnglishNameChange,
  onEnglishDescriptionChange,
  onEnglishCustomIngredientsChange,
  onEnglishItemNotesChange,
  mode = "all",
  descriptionMaxLength = 250,
}: MenuProductLocaleFieldsProps) {
  const tabs = useMemo(() => {
    const codes = new Set<ProgramLanguage>(["en"]);
    for (const lang of storefrontLanguages) {
      if (lang === "zh" || lang === "ms" || lang === "en") codes.add(lang);
    }
    // Prefer EN · 中文 · BM order
    return PROGRAM_LANGUAGES.map((l) => l.code).filter((code) => codes.has(code));
  }, [storefrontLanguages]);

  const [editLang, setEditLang] = useState<ProgramLanguage>("en");

  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(editLang)) {
      setEditLang(tabs[0]);
    }
  }, [tabs, editLang]);

  if (tabs.length === 0) return null;

  const langMeta = PROGRAM_LANGUAGES.find((l) => l.code === editLang);
  const langLabel = langMeta?.label ?? editLang;
  const showBasics = mode === "all" || mode === "basics";
  const showDetails = mode === "all" || mode === "details";
  const isEn = editLang === "en";

  const nameValue = isEn ? englishName : (translations.nameI18n[editLang] ?? "");
  const descriptionValue = isEn
    ? englishDescription
    : (translations.descriptionI18n[editLang] ?? "");
  const ingredientsValue = isEn
    ? englishCustomIngredients
    : (translations.ingredientsI18n[editLang] ?? "");
  const notesValue = isEn ? englishItemNotes : (translations.itemNotesI18n[editLang] ?? "");

  function setName(value: string) {
    if (isEn) {
      onEnglishNameChange?.(value);
      onChange({
        ...translations,
        nameI18n: { ...translations.nameI18n, en: value },
      });
      return;
    }
    onChange({
      ...translations,
      nameI18n: { ...translations.nameI18n, en: englishName, [editLang]: value },
    });
  }

  function setDescription(value: string) {
    const next = isEn ? value.slice(0, descriptionMaxLength) : value;
    if (isEn) {
      onEnglishDescriptionChange?.(next);
      onChange({
        ...translations,
        descriptionI18n: { ...translations.descriptionI18n, en: next },
      });
      return;
    }
    onChange({
      ...translations,
      descriptionI18n: {
        ...translations.descriptionI18n,
        en: englishDescription,
        [editLang]: next,
      },
    });
  }

  function setIngredients(value: string) {
    if (isEn) {
      onEnglishCustomIngredientsChange?.(value);
      onChange({
        ...translations,
        ingredientsI18n: { ...translations.ingredientsI18n, en: value },
      });
      return;
    }
    onChange({
      ...translations,
      ingredientsI18n: {
        ...translations.ingredientsI18n,
        en: englishCustomIngredients,
        [editLang]: value,
      },
    });
  }

  function setNotes(value: string) {
    if (isEn) {
      onEnglishItemNotesChange?.(value);
      onChange({
        ...translations,
        itemNotesI18n: { ...translations.itemNotesI18n, en: value },
      });
      return;
    }
    onChange({
      ...translations,
      itemNotesI18n: {
        ...translations.itemNotesI18n,
        en: englishItemNotes,
        [editLang]: value,
      },
    });
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
              ? "Ingredient chips use the shared library. Translate custom ingredients and notes per language."
              : "What diners see on the menu list and product detail sheet — switch language tabs below."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((code) => {
            const short =
              PROGRAM_LANGUAGES.find((l) => l.code === code)?.short ?? code.toUpperCase();
            return (
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
                {short}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {showBasics && (
          <>
            <label>
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Name · {langLabel}
              </span>
              <input
                value={nameValue}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEn ? "e.g. Fried Chicken" : undefined}
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              />
            </label>
            <label>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                  Short description · {langLabel}
                </span>
                {isEn ? (
                  <span className="font-mono text-[10px] text-on-surface-variant">
                    {descriptionValue.length} / {descriptionMaxLength}
                  </span>
                ) : null}
              </div>
              <textarea
                value={descriptionValue}
                onChange={(e) => setDescription(e.target.value)}
                rows={isEn ? 4 : 2}
                maxLength={isEn ? descriptionMaxLength : undefined}
                placeholder={
                  isEn
                    ? "Crispy fried chicken, juicy inside…"
                    : "One line on the menu list"
                }
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-[14px] leading-relaxed focus:border-primary focus:outline-none"
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
                value={ingredientsValue}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Extra ingredient details not covered by chips"
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              />
            </label>
            <label>
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Item notes · {langLabel}
              </span>
              <input
                value={notesValue}
                onChange={(e) => setNotes(e.target.value)}
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
