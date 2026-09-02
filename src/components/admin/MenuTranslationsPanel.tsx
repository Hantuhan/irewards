"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  PROGRAM_LANGUAGES,
  type LocalizedMap,
  type ProgramLanguage,
} from "@/lib/i18n/program-locale";
import { merchantApi } from "@/lib/merchant/fetch";

type CategoryRow = {
  slug: string;
  label: string;
  labelI18n?: LocalizedMap;
};

type ItemRow = {
  slug: string;
  categorySlug: string;
  name: string;
  description: string | null;
  ingredients?: string | null;
  itemNotes?: string | null;
  nameI18n?: LocalizedMap;
  descriptionI18n?: LocalizedMap;
  ingredientsI18n?: LocalizedMap;
  itemNotesI18n?: LocalizedMap;
};

type TargetLanguage = Exclude<ProgramLanguage, "en">;

type MenuTranslationsPanelProps = {
  merchantSlug: string;
  categories: CategoryRow[];
  items: ItemRow[];
  storefrontLanguages: ProgramLanguage[];
  onClose: () => void;
  onSaved: () => void;
};

function emptyMap(en: string): LocalizedMap {
  return { en };
}

export function MenuTranslationsPanel({
  merchantSlug,
  categories,
  items,
  storefrontLanguages,
  onClose,
  onSaved,
}: MenuTranslationsPanelProps) {
  const targetLanguages = useMemo(
    () => storefrontLanguages.filter((l): l is TargetLanguage => l === "zh" || l === "ms"),
    [storefrontLanguages],
  );
  const [editLang, setEditLang] = useState<TargetLanguage>(targetLanguages[0] ?? "zh");
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, LocalizedMap>>({});
  const [itemDrafts, setItemDrafts] = useState<
    Record<
      string,
      {
        nameI18n: LocalizedMap;
        descriptionI18n: LocalizedMap;
        ingredientsI18n: LocalizedMap;
        itemNotesI18n: LocalizedMap;
      }
    >
  >({});
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  const hydrate = useCallback(() => {
    const catMap: Record<string, LocalizedMap> = {};
    for (const cat of categories) {
      catMap[cat.slug] = { ...emptyMap(cat.label), ...(cat.labelI18n ?? {}) };
    }
    const itemMap: Record<
      string,
      {
        nameI18n: LocalizedMap;
        descriptionI18n: LocalizedMap;
        ingredientsI18n: LocalizedMap;
        itemNotesI18n: LocalizedMap;
      }
    > = {};
    for (const item of items) {
      itemMap[item.slug] = {
        nameI18n: { ...emptyMap(item.name), ...(item.nameI18n ?? {}) },
        descriptionI18n: {
          ...emptyMap(item.description ?? ""),
          ...(item.descriptionI18n ?? {}),
        },
        ingredientsI18n: {
          ...emptyMap(item.ingredients ?? ""),
          ...(item.ingredientsI18n ?? {}),
        },
        itemNotesI18n: {
          ...emptyMap(item.itemNotes ?? ""),
          ...(item.itemNotesI18n ?? {}),
        },
      };
    }
    setCategoryDrafts(catMap);
    setItemDrafts(itemMap);
    setSelectedCategories(new Set());
    setSelectedItems(new Set());
  }, [categories, items]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (targetLanguages.length > 0 && !targetLanguages.includes(editLang)) {
      setEditLang(targetLanguages[0]);
    }
  }, [targetLanguages, editLang]);

  const selectedCount = selectedCategories.size + selectedItems.size;

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleItem(slug: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function selectAllCategories() {
    setSelectedCategories(new Set(categories.map((c) => c.slug)));
  }

  function selectAllItems() {
    setSelectedItems(new Set(items.map((i) => i.slug)));
  }

  function clearCategorySelection() {
    setSelectedCategories(new Set());
  }

  function clearItemSelection() {
    setSelectedItems(new Set());
  }

  async function runAiTranslate(overwrite: boolean) {
    if (targetLanguages.length === 0) return;
    if (selectedCount === 0) {
      setError("Select categories or products to translate.");
      return;
    }
    setTranslating(true);
    setError(null);
    setStatus(null);
    try {
      const result = await merchantApi<{
        categories: Array<{ slug: string; labelI18n: LocalizedMap }>;
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
          overwrite,
          categorySlugs: [...selectedCategories],
          itemSlugs: [...selectedItems],
        }),
      });

      if (result.message && result.source === "empty") {
        setError(result.message);
        return;
      }

      setCategoryDrafts((prev) => {
        const next = { ...prev };
        for (const cat of result.categories) {
          if (!selectedCategories.has(cat.slug)) continue;
          next[cat.slug] = { ...prev[cat.slug], ...cat.labelI18n };
        }
        return next;
      });
      setItemDrafts((prev) => {
        const next = { ...prev };
        for (const item of result.items) {
          if (!selectedItems.has(item.slug)) continue;
          next[item.slug] = {
            nameI18n: { ...prev[item.slug]?.nameI18n, ...item.nameI18n },
            descriptionI18n: {
              ...prev[item.slug]?.descriptionI18n,
              ...item.descriptionI18n,
            },
            ingredientsI18n: {
              ...prev[item.slug]?.ingredientsI18n,
              ...item.ingredientsI18n,
            },
            itemNotesI18n: {
              ...prev[item.slug]?.itemNotesI18n,
              ...item.itemNotesI18n,
            },
          };
        }
        return next;
      });
      setStatus(
        result.source === "deepseek"
          ? `AI draft applied to ${selectedCount} selected row(s) in ${PROGRAM_LANGUAGES.find((l) => l.code === editLang)?.label ?? editLang}. Review and save.`
          : result.message ?? "Translation complete.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI translation failed");
    } finally {
      setTranslating(false);
    }
  }

  async function saveTranslations() {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/menu/translations`, {
        method: "PUT",
        body: JSON.stringify({
          categories: categories.map((cat) => ({
            slug: cat.slug,
            labelI18n: categoryDrafts[cat.slug] ?? emptyMap(cat.label),
          })),
          items: items.map((item) => ({
            slug: item.slug,
            nameI18n: itemDrafts[item.slug]?.nameI18n ?? emptyMap(item.name),
            descriptionI18n:
              itemDrafts[item.slug]?.descriptionI18n ?? emptyMap(item.description ?? ""),
            ingredientsI18n:
              itemDrafts[item.slug]?.ingredientsI18n ?? emptyMap(item.ingredients ?? ""),
            itemNotesI18n:
              itemDrafts[item.slug]?.itemNotesI18n ?? emptyMap(item.itemNotes ?? ""),
          })),
        }),
      });
      setStatus("Translations saved.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save translations");
    } finally {
      setSaving(false);
    }
  }

  const langLabel =
    PROGRAM_LANGUAGES.find((l) => l.code === editLang)?.label ?? editLang;

  if (targetLanguages.length === 0) {
    return (
      <div className="mb-6 border border-surface-container-highest bg-surface-container-lowest p-6">
        <p className="font-display text-headline-sm text-primary">Menu translations</p>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Add Chinese or Bahasa Malaysia in <strong>Settings → Store → Storefront languages</strong>,
          then return here to translate your menu.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 border border-primary px-4 py-2 font-display text-eyebrow uppercase text-primary"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 border border-surface-container-highest bg-surface-container-lowest p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Bulk translate
          </p>
          <h2 className="mt-1 font-display text-headline-sm text-primary">
            Translate categories &amp; products in bulk
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Edit English on each product. Use this panel for batch AI drafts — select only the rows
            you want. Existing translations are kept unless you choose overwrite.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-on-surface-variant hover:text-primary"
          aria-label="Close translations"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {targetLanguages.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setEditLang(code)}
            className={`border px-4 py-2 font-display text-headline-sm transition-colors ${
              editLang === code
                ? "border-primary bg-primary text-on-primary"
                : "border-surface-container-highest text-on-surface-variant"
            }`}
          >
            {PROGRAM_LANGUAGES.find((l) => l.code === code)?.short ?? code}
          </button>
        ))}
        <span className="text-body-md text-on-surface-variant">
          {selectedCount} selected
        </span>
        <button
          type="button"
          onClick={() => runAiTranslate(false)}
          disabled={translating || selectedCount === 0}
          className="inline-flex items-center gap-2 border border-primary px-4 py-2 font-display text-eyebrow uppercase text-primary disabled:opacity-50"
        >
          <Icon name="auto_awesome" className="text-lg" />
          {translating ? "Translating…" : `AI · fill gaps (${langLabel})`}
        </button>
        <button
          type="button"
          onClick={() => runAiTranslate(true)}
          disabled={translating || selectedCount === 0}
          className="text-body-md text-on-surface-variant underline disabled:opacity-50"
        >
          Overwrite selected
        </button>
        <button
          type="button"
          onClick={saveTranslations}
          disabled={saving}
          className="bg-primary px-5 py-2 font-display text-headline-sm text-on-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save all"}
        </button>
      </div>

      {error && (
        <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="mt-4 border border-green-200 bg-green-50 px-4 py-3 text-body-md text-green-900">
          {status}
        </p>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Categories
          </h3>
          <div className="flex flex-wrap gap-3 text-body-md">
            <button
              type="button"
              onClick={selectAllCategories}
              className="text-primary underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearCategorySelection}
              className="text-on-surface-variant underline"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {categories.map((cat) => (
            <div
              key={cat.slug}
              className="grid gap-3 border border-surface-container-highest p-4 md:grid-cols-[auto_1fr_1fr]"
            >
              <label className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={selectedCategories.has(cat.slug)}
                  onChange={() => toggleCategory(cat.slug)}
                  className="mt-1 h-4 w-4 accent-primary"
                  aria-label={`Select ${cat.label}`}
                />
              </label>
              <div>
                <p className="font-mono text-label-mono text-on-surface-variant">EN</p>
                <p className="font-display text-headline-sm text-primary">{cat.label}</p>
              </div>
              <div>
                <label className="font-mono text-label-mono text-on-surface-variant">
                  {langLabel}
                </label>
                <input
                  value={categoryDrafts[cat.slug]?.[editLang] ?? ""}
                  onChange={(e) =>
                    setCategoryDrafts((prev) => ({
                      ...prev,
                      [cat.slug]: { ...prev[cat.slug], [editLang]: e.target.value },
                    }))
                  }
                  className="mt-1 w-full border border-surface-container-highest px-3 py-2"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Products
          </h3>
          <div className="flex flex-wrap gap-3 text-body-md">
            <button type="button" onClick={selectAllItems} className="text-primary underline">
              Select all
            </button>
            <button
              type="button"
              onClick={clearItemSelection}
              className="text-on-surface-variant underline"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.slug} className="border border-surface-container-highest p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.slug)}
                  onChange={() => toggleItem(item.slug)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  aria-label={`Select ${item.name}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-label-mono text-on-surface-variant">
                    {item.categorySlug}
                  </p>
                  <div className="mt-2 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="font-display text-headline-sm text-primary">{item.name}</p>
                      {item.description && (
                        <p className="mt-1 text-body-md text-on-surface-variant">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-label-mono text-on-surface-variant">
                          Name · {langLabel}
                        </span>
                        <input
                          value={itemDrafts[item.slug]?.nameI18n?.[editLang] ?? ""}
                          onChange={(e) =>
                            setItemDrafts((prev) => ({
                              ...prev,
                              [item.slug]: {
                                nameI18n: {
                                  ...prev[item.slug]?.nameI18n,
                                  [editLang]: e.target.value,
                                },
                                descriptionI18n: prev[item.slug]?.descriptionI18n ?? emptyMap(""),
                                ingredientsI18n: prev[item.slug]?.ingredientsI18n ?? emptyMap(""),
                                itemNotesI18n: prev[item.slug]?.itemNotesI18n ?? emptyMap(""),
                              },
                            }))
                          }
                          className="border border-surface-container-highest px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-label-mono text-on-surface-variant">
                          Description · {langLabel}
                        </span>
                        <textarea
                          rows={2}
                          value={itemDrafts[item.slug]?.descriptionI18n?.[editLang] ?? ""}
                          onChange={(e) =>
                            setItemDrafts((prev) => ({
                              ...prev,
                              [item.slug]: {
                                nameI18n: prev[item.slug]?.nameI18n ?? emptyMap(item.name),
                                descriptionI18n: {
                                  ...prev[item.slug]?.descriptionI18n,
                                  [editLang]: e.target.value,
                                },
                                ingredientsI18n: prev[item.slug]?.ingredientsI18n ?? emptyMap(""),
                                itemNotesI18n: prev[item.slug]?.itemNotesI18n ?? emptyMap(""),
                              },
                            }))
                          }
                          className="border border-surface-container-highest px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-label-mono text-on-surface-variant">
                          Custom ingredients · {langLabel}
                        </span>
                        <textarea
                          rows={2}
                          value={itemDrafts[item.slug]?.ingredientsI18n?.[editLang] ?? ""}
                          onChange={(e) =>
                            setItemDrafts((prev) => ({
                              ...prev,
                              [item.slug]: {
                                nameI18n: prev[item.slug]?.nameI18n ?? emptyMap(item.name),
                                descriptionI18n:
                                  prev[item.slug]?.descriptionI18n ?? emptyMap(item.description ?? ""),
                                ingredientsI18n: {
                                  ...prev[item.slug]?.ingredientsI18n,
                                  [editLang]: e.target.value,
                                },
                                itemNotesI18n: prev[item.slug]?.itemNotesI18n ?? emptyMap(""),
                              },
                            }))
                          }
                          className="border border-surface-container-highest px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-label-mono text-on-surface-variant">
                          Item notes · {langLabel}
                        </span>
                        <input
                          value={itemDrafts[item.slug]?.itemNotesI18n?.[editLang] ?? ""}
                          onChange={(e) =>
                            setItemDrafts((prev) => ({
                              ...prev,
                              [item.slug]: {
                                nameI18n: prev[item.slug]?.nameI18n ?? emptyMap(item.name),
                                descriptionI18n:
                                  prev[item.slug]?.descriptionI18n ?? emptyMap(item.description ?? ""),
                                ingredientsI18n: prev[item.slug]?.ingredientsI18n ?? emptyMap(""),
                                itemNotesI18n: {
                                  ...prev[item.slug]?.itemNotesI18n,
                                  [editLang]: e.target.value,
                                },
                              },
                            }))
                          }
                          className="border border-surface-container-highest px-3 py-2"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
