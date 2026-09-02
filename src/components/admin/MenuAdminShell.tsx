"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { MenuProductLocaleFields } from "@/components/admin/MenuProductLocaleFields";
import { MenuTranslationsPanel } from "@/components/admin/MenuTranslationsPanel";
import { MenuItemAvailabilityEditor } from "@/components/admin/MenuItemAvailabilityEditor";
import { MenuModifierEditor } from "@/components/admin/MenuModifierEditor";
import {
  MenuTakeawayChargeEditor,
  emptyTakeawayCharge,
} from "@/components/admin/MenuTakeawayChargeEditor";
import { MenuProductBadgePicker } from "@/components/admin/MenuProductBadgePicker";
import { MenuBadgeManager } from "@/components/admin/MenuBadgeManager";
import { UpsellRuleEditor } from "@/components/admin/UpsellRuleEditor";
import {
  filterIngredientPresetsForNonCoffeeProduct,
  sanitizeIngredientIds,
  stripCoffeeIngredientIds,
  type MenuIngredientPreset,
} from "@/lib/menu/menu-ingredients";
import { MenuItemIngredientPicker } from "@/components/admin/MenuItemIngredientPicker";
import type { TakeawayChargeConfig } from "@/lib/menu/takeaway-charge";
import type { UpsellLinkConfig } from "@/lib/menu/upsell-rules";
import { ProductSettingsSection } from "@/components/admin/ProductSettingsSection";
import { Icon } from "@/components/ui/Icon";
import type { ModifierGroupInput } from "@/lib/db/modifiers-repository";
import {
  type ProgramLanguage,
} from "@/lib/i18n/program-locale";
import type { LocalizedMap } from "@/lib/i18n/program-locale";
import {
  centsToPriceInput,
  currencyDisplayCode,
  formatMerchantPrice,
  parsePriceToCents,
  type MerchantCurrency,
} from "@/lib/merchant/currency";
import { merchantApi } from "@/lib/merchant/fetch";
import {
  DEFAULT_MENU_BADGES,
  normalizeSpecialTags,
  specialTagLabel,
  type MenuBadge,
  type MenuSpecialTagId,
} from "@/lib/menu/special-tags";
import { MenuCoffeeProfileEditor } from "@/components/admin/MenuCoffeeProfileEditor";
import {
  coffeeDrinkModifierTemplate,
  coffeeRetailBeansModifierTemplate,
  isCoffeeMenuCategory,
} from "@/lib/menu/coffee-templates";
import { emptyCoffeeProfile, parseCoffeeProfile, type CoffeeProfile } from "@/lib/menu/coffee-profile";
import {
  buildWeeklySchedule,
  extractWeeklyUi,
  formatAvailabilitySummary,
  parseTagsInput,
  tagsToInput,
  toDatetimeLocalValue,
  type AvailabilityMode,
  type WeeklySchedule,
  type WeekdayKey,
} from "@/lib/menu/availability";

type MenuAdminShellProps = { merchantSlug: string };

type MenuItem = {
  slug: string;
  categorySlug: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  imageUrl: string | null;
  tags: string[];
  specialTags: MenuSpecialTagId[];
  availabilityMode: AvailabilityMode;
  availabilityWeekly: WeeklySchedule | null;
  availableFrom: string | null;
  availableUntil: string | null;
  modifierGroups: ModifierGroupInput[];
  upsellLinks: UpsellLinkConfig[];
  upsellItemSlugs?: string[];
  takeawayCharge?: TakeawayChargeConfig;
  kcal?: number | null;
  sugarG?: number | null;
  ingredients?: string | null;
  itemNotes?: string | null;
  ingredientIds?: string[];
  nameI18n?: LocalizedMap;
  descriptionI18n?: LocalizedMap;
  ingredientsI18n?: LocalizedMap;
  itemNotesI18n?: LocalizedMap;
  coffeeProfile?: CoffeeProfile;
};

type Category = { slug: string; label: string; labelI18n?: LocalizedMap };

function newItemDraft(categorySlug: string): MenuItem {
  return {
    slug: `item-${Date.now()}`,
    categorySlug,
    name: "",
    description: "",
    priceCents: 0,
    active: true,
    imageUrl: null,
    tags: [],
    specialTags: [],
    availabilityMode: "always",
    availabilityWeekly: null,
    availableFrom: null,
    availableUntil: null,
    modifierGroups: [],
    upsellLinks: [],
    takeawayCharge: emptyTakeawayCharge(),
    kcal: null,
    sugarG: null,
    ingredients: null,
    itemNotes: null,
    ingredientIds: [],
    nameI18n: { en: "" },
    descriptionI18n: { en: "" },
    ingredientsI18n: { en: "" },
    itemNotesI18n: { en: "" },
    coffeeProfile: emptyCoffeeProfile(),
  };
}

export function MenuAdminShell({ merchantSlug }: MenuAdminShellProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>("always");
  const [weeklyDays, setWeeklyDays] = useState<WeekdayKey[]>([]);
  const [weeklyStart, setWeeklyStart] = useState("09:00");
  const [weeklyEnd, setWeeklyEnd] = useState("22:00");
  const [availableFromLocal, setAvailableFromLocal] = useState("");
  const [availableUntilLocal, setAvailableUntilLocal] = useState("");
  const [specialTags, setSpecialTags] = useState<MenuSpecialTagId[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupInput[]>([]);
  const [upsellLinks, setUpsellLinks] = useState<UpsellLinkConfig[]>([]);
  const [takeawayCharge, setTakeawayCharge] = useState<TakeawayChargeConfig>(emptyTakeawayCharge());
  const [ingredientPresets, setIngredientPresets] = useState<MenuIngredientPreset[]>([]);
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [customIngredients, setCustomIngredients] = useState("");
  const [kcalInput, setKcalInput] = useState("");
  const [sugarGInput, setSugarGInput] = useState("");
  const [itemNotesInput, setItemNotesInput] = useState("");
  const [coffeeProfile, setCoffeeProfile] = useState<CoffeeProfile>(emptyCoffeeProfile());
  const [currency, setCurrency] = useState<MerchantCurrency>("MYR");
  const [priceInput, setPriceInput] = useState("0.00");
  const [badgeCatalog, setBadgeCatalog] = useState<MenuBadge[]>(DEFAULT_MENU_BADGES);
  const [showBadgeManager, setShowBadgeManager] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const [storefrontLanguages, setStorefrontLanguages] = useState<ProgramLanguage[]>(["en"]);
  const filterCategoryRef = useRef(filterCategory);

  useEffect(() => {
    if (filterCategoryRef.current !== filterCategory) {
      filterCategoryRef.current = filterCategory;
      setEditing(null);
    }
  }, [filterCategory]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await merchantApi<{
        currency?: MerchantCurrency;
        badges?: MenuBadge[];
        ingredientPresets?: MenuIngredientPreset[];
        categories: Category[];
        items: MenuItem[];
      }>(`/api/merchant/${merchantSlug}/menu`);
      const settings = await merchantApi<{ languages?: string[] }>(
        `/api/merchant/${merchantSlug}/settings`,
      );
      const langs = (settings.languages ?? ["en"]).filter(
        (l): l is ProgramLanguage => l === "en" || l === "zh" || l === "ms",
      );
      setStorefrontLanguages(langs.length > 0 ? langs : ["en"]);
      setCurrency(data.currency ?? "MYR");
      const catalog = data.badges?.length ? data.badges : DEFAULT_MENU_BADGES;
      setBadgeCatalog(catalog);
      setIngredientPresets(data.ingredientPresets ?? []);
      setCategories(data.categories);
      setItems(
        data.items.map((item) => ({
          ...item,
          imageUrl: item.imageUrl ?? null,
          tags: item.tags ?? [],
          specialTags: normalizeSpecialTags(item.specialTags ?? [], catalog),
          availabilityMode: item.availabilityMode ?? "always",
          availabilityWeekly: item.availabilityWeekly ?? null,
          availableFrom: item.availableFrom ?? null,
          availableUntil: item.availableUntil ?? null,
          modifierGroups: item.modifierGroups ?? [],
          upsellLinks: item.upsellLinks ?? (item.upsellItemSlugs ?? []).map((slug) => ({
            slug,
            suggestType: "upsell" as const,
            promoMode: "regular" as const,
            ruleType: "always" as const,
            priority: 10,
          })),
          takeawayCharge: item.takeawayCharge ?? emptyTakeawayCharge(),
          kcal: item.kcal ?? null,
          sugarG: item.sugarG ?? null,
          ingredients: item.ingredients ?? null,
          itemNotes: item.itemNotes ?? null,
          ingredientIds: item.ingredientIds ?? [],
          nameI18n: item.nameI18n ?? { en: item.name },
          descriptionI18n: item.descriptionI18n ?? { en: item.description ?? "" },
          ingredientsI18n: item.ingredientsI18n ?? { en: item.ingredients ?? "" },
          itemNotesI18n: item.itemNotesI18n ?? { en: item.itemNotes ?? "" },
          coffeeProfile: parseCoffeeProfile(item.coffeeProfile),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const addIngredientPreset = useCallback(
    async (label: string, group: string) => {
      const result = await merchantApi<{
        preset: MenuIngredientPreset;
        presets: MenuIngredientPreset[];
      }>(`/api/merchant/${merchantSlug}/menu/ingredients`, {
        method: "POST",
        body: JSON.stringify({ label, group }),
      });
      setIngredientPresets(result.presets);
      return result.preset.id;
    },
    [merchantSlug],
  );

  const categoryLabelBySlug = useMemo(
    () => new Map(categories.map((c) => [c.slug, c.label])),
    [categories],
  );

  const itemCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.categorySlug, (counts.get(item.categorySlug) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filterCategory !== "all" && item.categorySlug !== filterCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q))
      );
    });
  }, [items, filterCategory, search]);

  const isNewItem = editing?.slug.startsWith("item-") ?? false;
  const defaultCategory = filterCategory !== "all" ? filterCategory : categories[0]?.slug ?? "";
  const editingCategory = editing
    ? categories.find((c) => c.slug === editing.categorySlug)
    : undefined;
  const editingCoffee = editing
    ? isCoffeeMenuCategory(editing.categorySlug, editingCategory?.label)
    : false;

  async function persistItem(item: MenuItem, useFormFields = false) {
    let payload = { ...item };

    if (useFormFields) {
      const saveCategory = categories.find((c) => c.slug === payload.categorySlug);
      const coffeeItem = isCoffeeMenuCategory(payload.categorySlug, saveCategory?.label);

      payload = {
        ...payload,
        tags: parseTagsInput(tagsInput),
        specialTags,
        availabilityMode,
        availabilityWeekly:
          availabilityMode === "weekly"
            ? buildWeeklySchedule(weeklyDays, weeklyStart, weeklyEnd)
            : null,
        availableFrom:
          availabilityMode === "date_range" && availableFromLocal
            ? new Date(availableFromLocal).toISOString()
            : null,
        availableUntil:
          availabilityMode === "date_range" && availableUntilLocal
            ? new Date(availableUntilLocal).toISOString()
            : null,
        modifierGroups,
        upsellLinks,
        takeawayCharge,
        kcal: coffeeItem ? null : kcalInput.trim() ? Number.parseInt(kcalInput, 10) : null,
        sugarG: coffeeItem ? null : sugarGInput.trim() ? Number.parseFloat(sugarGInput) : null,
        ingredients: coffeeItem ? null : customIngredients.trim() || null,
        itemNotes: coffeeItem ? null : itemNotesInput.trim() || null,
        ingredientIds: coffeeItem
          ? []
          : sanitizeIngredientIds(
              stripCoffeeIngredientIds(ingredientIds, ingredientPresets),
            ),
        ingredientsI18n: coffeeItem
          ? { en: "" }
          : {
              ...(payload.ingredientsI18n ?? {}),
              en: customIngredients.trim(),
            },
        itemNotesI18n: coffeeItem
          ? { en: "" }
          : {
              ...(payload.itemNotesI18n ?? {}),
              en: itemNotesInput.trim(),
            },
        coffeeProfile: coffeeItem ? coffeeProfile : emptyCoffeeProfile(),
        priceCents: parsePriceToCents(priceInput),
      };
      if (availabilityMode !== "weekly") payload.availabilityWeekly = null;
      if (availabilityMode !== "date_range") {
        payload.availableFrom = null;
        payload.availableUntil = null;
      }
      if (availabilityMode === "always") {
        payload.availabilityWeekly = null;
        payload.availableFrom = null;
        payload.availableUntil = null;
      }
    }

    await merchantApi(`/api/merchant/${merchantSlug}/menu`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async function saveItem(item: MenuItem) {
    await persistItem(item, true);
    setEditing(null);
    await load();
  }

  async function toggleActive(item: MenuItem) {
    await persistItem({ ...item, active: !item.active });
    await load();
  }

  function openEditor(item: MenuItem) {
    const itemCategory = categories.find((c) => c.slug === item.categorySlug);
    const coffeeItem = isCoffeeMenuCategory(item.categorySlug, itemCategory?.label);

    setEditing(item);
    setTagsInput(tagsToInput(item.tags));
    setSpecialTags(normalizeSpecialTags(item.specialTags ?? [], badgeCatalog));
    setAvailabilityMode(item.availabilityMode);
    const weekly = extractWeeklyUi(item.availabilityWeekly);
    setWeeklyDays(weekly.days);
    setWeeklyStart(weekly.start);
    setWeeklyEnd(weekly.end);
    setAvailableFromLocal(toDatetimeLocalValue(item.availableFrom));
    setAvailableUntilLocal(toDatetimeLocalValue(item.availableUntil));
    setModifierGroups(item.modifierGroups ?? []);
    setUpsellLinks(
      item.upsellLinks ??
        (item.upsellItemSlugs ?? []).map((slug) => ({
          slug,
          suggestType: "upsell" as const,
          promoMode: "regular" as const,
          ruleType: "always" as const,
          priority: 10,
        })),
    );
    setPriceInput(centsToPriceInput(item.priceCents));
    setTakeawayCharge(item.takeawayCharge ?? emptyTakeawayCharge());
    setIngredientIds(
      coffeeItem
        ? []
        : stripCoffeeIngredientIds(item.ingredientIds ?? [], ingredientPresets),
    );
    setCustomIngredients(item.ingredients ?? "");
    setKcalInput(item.kcal != null ? String(item.kcal) : "");
    setSugarGInput(item.sugarG != null ? String(item.sugarG) : "");
    setItemNotesInput(item.itemNotes ?? "");
    setCoffeeProfile(
      coffeeItem ? parseCoffeeProfile(item.coffeeProfile) : emptyCoffeeProfile(),
    );
  }

  function openNewEditor() {
    const draft = newItemDraft(defaultCategory);
    setEditing(draft);
    setTagsInput("");
    setSpecialTags([]);
    setAvailabilityMode("always");
    setWeeklyDays(["mon", "tue", "wed", "thu", "fri"]);
    setWeeklyStart("09:00");
    setWeeklyEnd("22:00");
    setAvailableFromLocal("");
    setAvailableUntilLocal("");
    setUpsellLinks([]);
    setTakeawayCharge(emptyTakeawayCharge());
    setIngredientIds([]);
    setCustomIngredients("");
    setKcalInput("");
    setSugarGInput("");
    setItemNotesInput("");
    const cat = categories.find((c) => c.slug === defaultCategory);
    const coffeeCat = isCoffeeMenuCategory(defaultCategory, cat?.label);
    if (coffeeCat) {
      setModifierGroups(coffeeDrinkModifierTemplate(currency));
      setCoffeeProfile(emptyCoffeeProfile());
    } else {
      setModifierGroups([]);
      setCoffeeProfile(emptyCoffeeProfile());
    }
    setPriceInput("0.00");
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    const label = newCategoryLabel.trim();
    if (!label) return;

    setSavingCategory(true);
    setError(null);
    try {
      const created = await merchantApi<{ slug: string; label: string }>(
        `/api/merchant/${merchantSlug}/menu/categories`,
        { method: "POST", body: JSON.stringify({ label }) },
      );
      setNewCategoryLabel("");
      setShowCategoryManager(false);
      await load();
      setFilterCategory(created.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  }

  async function removeCategory(category: Category) {
    const itemCount = itemCountByCategory.get(category.slug) ?? 0;
    const confirmed = window.confirm(
      itemCount > 0
        ? `Remove "${category.label}"? This will also delete ${itemCount} product${itemCount === 1 ? "" : "s"} in this category.`
        : `Remove category "${category.label}"?`,
    );
    if (!confirmed) return;

    setDeletingCategory(category.slug);
    setError(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/menu/categories`, {
        method: "DELETE",
        body: JSON.stringify({ slug: category.slug }),
      });
      if (filterCategory === category.slug) {
        setFilterCategory("all");
      }
      if (editing?.categorySlug === category.slug) {
        setEditing(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingCategory(null);
    }
  }

  async function uploadPhoto(file: File) {
    if (!editing) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/merchant/${merchantSlug}/menu/upload`, {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "Upload failed");
      setEditing({ ...editing, imageUrl: json.url ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function startAddProduct() {
    if (!defaultCategory) {
      setShowCategoryManager(true);
      return;
    }
    openNewEditor();
  }

  const upsellOptions = useMemo(
    () =>
      items
        .filter((item) => item.slug !== editing?.slug)
        .map((item) => ({
          slug: item.slug,
          name: item.name,
          categoryLabel: categoryLabelBySlug.get(item.categorySlug),
        })),
    [items, editing?.slug, categoryLabelBySlug],
  );

  function upsellSummary(links: UpsellLinkConfig[]) {
    if (links.length === 0) return "—";
    return links
      .map((link) => {
        const name = items.find((item) => item.slug === link.slug)?.name ?? link.slug;
        const promo =
          link.promoMode === "free"
            ? " (FREE)"
            : link.promoMode === "custom"
              ? ` (${formatMerchantPrice(link.promoPriceCents ?? 0, currency)})`
              : "";
        return `${name}${promo}`;
      })
      .join(", ");
  }

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="menu"
      title="Menu & product management"
      eyebrow="Catalog"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex flex-col gap-6 border-b border-surface-container-highest pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="max-w-2xl text-body-md text-on-surface-variant">
              Organize offerings, upload product photos, and control what appears on the diner
              storefront.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowTranslations((v) => !v)}
              className={`inline-flex items-center gap-2 border px-5 py-2.5 font-body-md font-medium transition-colors ${
                showTranslations
                  ? "border-primary bg-surface-container-low text-primary"
                  : "border-primary text-primary hover:bg-surface-container-low"
              }`}
            >
              <Icon name="translate" className="text-[18px]" />
              Bulk translate
            </button>
            <button
              type="button"
              onClick={() => setShowCategoryManager((v) => !v)}
              className={`inline-flex items-center gap-2 border px-5 py-2.5 font-body-md font-medium transition-colors ${
                showCategoryManager
                  ? "border-primary bg-surface-container-low text-primary"
                  : "border-primary text-primary hover:bg-surface-container-low"
              }`}
            >
              <Icon name="category" className="text-[18px]" />
              Manage categories
            </button>
            <button
              type="button"
              onClick={startAddProduct}
              disabled={categories.length === 0}
              className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 font-body-md font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="add" className="text-[18px]" />
              Add new product
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800">
            {error}
          </div>
        )}

        {loading && <p className="text-body-md text-on-surface-variant">Loading menu…</p>}

        {!loading && categories.length === 0 && (
          <div className="border border-surface-container-highest bg-surface-container-lowest px-8 py-12 text-center">
            <p className="font-display text-headline-sm text-primary">Start with a category</p>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Create Coffee, Pastries, or Mains — then add products with photos.
            </p>
            <button
              type="button"
              onClick={() => setShowCategoryManager(true)}
              className="mt-6 inline-flex items-center gap-2 bg-primary px-5 py-2.5 font-display text-headline-sm text-on-primary"
            >
              <Icon name="add" />
              Create first category
            </button>
          </div>
        )}

        {showTranslations && !loading && categories.length > 0 && (
          <MenuTranslationsPanel
            merchantSlug={merchantSlug}
            categories={categories}
            items={items}
            storefrontLanguages={storefrontLanguages}
            onClose={() => setShowTranslations(false)}
            onSaved={() => load()}
          />
        )}

        {showCategoryManager && (
          <div className="mb-6 border border-surface-container-highest bg-surface-container-lowest p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                  Manage categories
                </p>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  Add or remove menu categories. Removing a category also deletes its products.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryManager(false);
                  setNewCategoryLabel("");
                }}
                className="text-on-surface-variant hover:text-primary"
                aria-label="Close category manager"
              >
                <Icon name="close" />
              </button>
            </div>

            {categories.length > 0 && (
              <ul className="mt-6 divide-y divide-surface-container-highest border border-surface-container-highest">
                {categories.map((cat) => {
                  const itemCount = itemCountByCategory.get(cat.slug) ?? 0;
                  return (
                    <li
                      key={cat.slug}
                      className="flex items-center justify-between gap-4 bg-surface-container-lowest px-4 py-3"
                    >
                      <div>
                        <p className="font-display text-headline-sm text-primary">{cat.label}</p>
                        <p className="mt-0.5 font-mono text-label-mono text-on-surface-variant">
                          {itemCount} product{itemCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCategory(cat)}
                        disabled={deletingCategory === cat.slug}
                        className="inline-flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-body-md text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                      >
                        <Icon name="delete" className="text-[18px]" />
                        {deletingCategory === cat.slug ? "Removing…" : "Remove"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <form onSubmit={saveCategory} className="mt-6 border-t border-surface-container-highest pt-6">
              <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                New category
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <label className="min-w-[220px] flex-1">
                  <span className="mb-1.5 block font-mono text-label-mono text-on-surface-variant">
                    Category name
                  </span>
                  <input
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    placeholder="e.g. Coffee"
                    className="w-full border-0 border-b border-surface-container-highest bg-transparent px-0 py-2 focus:border-primary focus:outline-none focus:ring-0"
                    required
                    autoFocus={categories.length === 0}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingCategory}
                    className="bg-primary px-4 py-2 text-on-primary disabled:opacity-60"
                  >
                    {savingCategory ? "Saving…" : "Add category"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {!loading && categories.length > 0 && (
          <>
            <div className="mb-6 border border-surface-container-highest bg-surface-container-lowest p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <div className="relative w-full shrink-0 lg:w-80">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search menu items…"
                    className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-0"
                  />
                </div>

                <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1 lg:border-l lg:border-surface-container-highest lg:pl-6">
                  <button
                    type="button"
                    onClick={() => setFilterCategory("all")}
                    className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-1 font-body-md transition-colors ${
                      filterCategory === "all"
                        ? "border-primary text-primary"
                        : "border-transparent text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    All items
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setFilterCategory(cat.slug)}
                      className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-1 font-body-md transition-colors ${
                        filterCategory === cat.slug
                          ? "border-primary text-primary"
                          : "border-transparent text-on-surface-variant hover:text-primary"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                  <div className="ml-2 flex shrink-0 items-center border-l border-outline-variant pl-4">
                    <button
                      type="button"
                      onClick={() => setShowCategoryManager(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1 text-on-surface-variant transition-colors hover:text-primary"
                    >
                      <Icon name="add_circle" className="text-[18px]" />
                      <span className="font-body-md">New category</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {editing && (
              <form
                className="mb-6 border border-surface-container-highest bg-surface-container-low p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveItem(editing);
                }}
              >
                <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                  {isNewItem ? "New product" : "Edit product"}
                  {editingCategory ? (
                    <span className="ml-2 normal-case text-primary">· {editingCategory.label}</span>
                  ) : null}
                </p>
                {!editingCoffee && (
                  <p className="mt-1 text-body-md text-on-surface-variant">
                    Product details use ingredients, nutrition, and notes — not coffee settings.
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-4">
                  <ProductSettingsSection
                    step={1}
                    icon="inventory_2"
                    title="Product basics"
                    description="Name, photo, price, and storefront visibility."
                  >
                    <div className="grid gap-6 lg:grid-cols-[140px_1fr]">
                      <div>
                        <p className="mb-2 font-mono text-label-mono text-on-surface-variant">
                          Photo
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="relative flex h-[120px] w-[120px] items-center justify-center border border-surface-container-highest bg-surface-container-low"
                        >
                          {editing.imageUrl ? (
                            <Image
                              src={editing.imageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                              <Icon name="add_photo_alternate" className="text-2xl" />
                              <span className="font-mono text-[10px] uppercase">Upload</span>
                            </div>
                          )}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadPhoto(file);
                            e.target.value = "";
                          }}
                        />
                        {uploadingPhoto && (
                          <p className="mt-2 font-mono text-label-mono text-on-surface-variant">
                            Uploading…
                          </p>
                        )}
                        {editing.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setEditing({ ...editing, imageUrl: null })}
                            className="mt-2 font-mono text-label-mono text-on-surface-variant underline"
                          >
                            Remove photo
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="sm:col-span-2">
                          <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                            Product name
                          </span>
                          <input
                            value={editing.name}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                name: e.target.value,
                                nameI18n: {
                                  ...(editing.nameI18n ?? { en: editing.name }),
                                  en: e.target.value,
                                },
                              })
                            }
                            className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
                            required
                          />
                        </label>
                        <label>
                          <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                            Category
                          </span>
                          <select
                            value={editing.categorySlug}
                            onChange={(e) => {
                              const slug = e.target.value;
                              const cat = categories.find((c) => c.slug === slug);
                              const enteringCoffee = isCoffeeMenuCategory(slug, cat?.label);
                              if (enteringCoffee) {
                                if (!coffeeProfile.detailLevel) {
                                  setCoffeeProfile(emptyCoffeeProfile());
                                }
                                if (modifierGroups.length === 0) {
                                  setModifierGroups(coffeeDrinkModifierTemplate(currency));
                                }
                                setIngredientIds([]);
                                setCustomIngredients("");
                                setKcalInput("");
                                setSugarGInput("");
                                setItemNotesInput("");
                              } else if (editingCoffee) {
                                setCoffeeProfile(emptyCoffeeProfile());
                                setIngredientIds(
                                  stripCoffeeIngredientIds(
                                    editing.ingredientIds ?? [],
                                    ingredientPresets,
                                  ),
                                );
                                setCustomIngredients(editing.ingredients ?? "");
                                setKcalInput(editing.kcal != null ? String(editing.kcal) : "");
                                setSugarGInput(editing.sugarG != null ? String(editing.sugarG) : "");
                                setItemNotesInput(editing.itemNotes ?? "");
                              }
                              setEditing({ ...editing, categorySlug: slug });
                            }}
                            className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                          >
                            {categories.map((cat) => (
                              <option key={cat.slug} value={cat.slug}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                            Price
                          </span>
                          <div className="flex items-center gap-2 border-0 border-b border-surface-container-highest py-2 focus-within:border-primary">
                            <span className="shrink-0 font-mono text-label-mono text-on-surface-variant">
                              {currencyDisplayCode(currency)}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={priceInput}
                              onChange={(e) => setPriceInput(e.target.value)}
                              onBlur={() =>
                                setPriceInput(centsToPriceInput(parsePriceToCents(priceInput)))
                              }
                              placeholder="0.00"
                              className="w-full border-0 bg-transparent font-mono focus:outline-none"
                              required
                            />
                          </div>
                        </label>
                        <label className="sm:col-span-2">
                          <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                            Short description
                          </span>
                          <input
                            value={editing.description ?? ""}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                description: e.target.value,
                                descriptionI18n: {
                                  ...(editing.descriptionI18n ?? { en: editing.description ?? "" }),
                                  en: e.target.value,
                                },
                              })
                            }
                            placeholder="One line shown on the menu list"
                            className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
                          />
                        </label>
                        <label className="flex items-center gap-2 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={editing.active}
                            onChange={(e) =>
                              setEditing({ ...editing, active: e.target.checked })
                            }
                            className="h-4 w-4"
                          />
                          <span className="text-body-md">Live on storefront</span>
                        </label>
                      </div>
                    </div>
                    <MenuProductLocaleFields
                      merchantSlug={merchantSlug}
                      itemSlug={editing.slug}
                      englishName={editing.name}
                      englishDescription={editing.description ?? ""}
                      englishCustomIngredients={customIngredients}
                      englishItemNotes={itemNotesInput}
                      translations={{
                        nameI18n: editing.nameI18n ?? { en: editing.name },
                        descriptionI18n:
                          editing.descriptionI18n ?? { en: editing.description ?? "" },
                        ingredientsI18n:
                          editing.ingredientsI18n ?? { en: customIngredients },
                        itemNotesI18n: editing.itemNotesI18n ?? { en: itemNotesInput },
                      }}
                      storefrontLanguages={storefrontLanguages}
                      mode="basics"
                      onChange={(next) =>
                        setEditing({
                          ...editing,
                          nameI18n: next.nameI18n,
                          descriptionI18n: next.descriptionI18n,
                        })
                      }
                    />
                  </ProductSettingsSection>

                  <ProductSettingsSection
                    key={`product-details-${editing.slug}-${editing.categorySlug}`}
                    step={2}
                    icon="restaurant"
                    title="Product details"
                    description={
                      editingCoffee
                        ? "Coffee products: choose Simple or Advanced. Only fields you fill appear on the diner menu."
                        : "Ingredients, nutrition, and notes shown when diners tap the item on the menu."
                    }
                  >
                    {editingCoffee ? (
                      <MenuCoffeeProfileEditor
                        value={coffeeProfile}
                        onChange={setCoffeeProfile}
                      />
                    ) : (
                      <>
                        <MenuItemIngredientPicker
                          presets={filterIngredientPresetsForNonCoffeeProduct(ingredientPresets)}
                          selectedIds={ingredientIds}
                          customIngredients={customIngredients}
                          kcal={kcalInput}
                          sugarG={sugarGInput}
                          notes={itemNotesInput}
                          onSelectedIdsChange={setIngredientIds}
                          onCustomIngredientsChange={(value) => {
                            setCustomIngredients(value);
                            if (editing) {
                              setEditing({
                                ...editing,
                                ingredients: value,
                                ingredientsI18n: {
                                  ...(editing.ingredientsI18n ?? { en: value }),
                                  en: value,
                                },
                              });
                            }
                          }}
                          onKcalChange={setKcalInput}
                          onSugarGChange={setSugarGInput}
                          onNotesChange={(value) => {
                            setItemNotesInput(value);
                            if (editing) {
                              setEditing({
                                ...editing,
                                itemNotes: value,
                                itemNotesI18n: {
                                  ...(editing.itemNotesI18n ?? { en: value }),
                                  en: value,
                                },
                              });
                            }
                          }}
                          onAddPreset={addIngredientPreset}
                        />
                        <MenuProductLocaleFields
                          merchantSlug={merchantSlug}
                          itemSlug={editing.slug}
                          englishName={editing.name}
                          englishDescription={editing.description ?? ""}
                          englishCustomIngredients={customIngredients}
                          englishItemNotes={itemNotesInput}
                          translations={{
                            nameI18n: editing.nameI18n ?? { en: editing.name },
                            descriptionI18n:
                              editing.descriptionI18n ?? { en: editing.description ?? "" },
                            ingredientsI18n:
                              editing.ingredientsI18n ?? { en: customIngredients },
                            itemNotesI18n: editing.itemNotesI18n ?? { en: itemNotesInput },
                          }}
                          storefrontLanguages={storefrontLanguages}
                          mode="details"
                          onChange={(next) =>
                            setEditing({
                              ...editing,
                              nameI18n: next.nameI18n,
                              descriptionI18n: next.descriptionI18n,
                              ingredientsI18n: next.ingredientsI18n,
                              itemNotesI18n: next.itemNotesI18n,
                            })
                          }
                        />
                      </>
                    )}
                  </ProductSettingsSection>

                  <ProductSettingsSection
                    step={3}
                    icon="sell"
                    title="Merchandising"
                    description="Badges and custom tags shown on the diner menu."
                  >
                    <div className="flex flex-col gap-6">
                      <div>
                        <p className="mb-3 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                          Add-on badges
                        </p>
                        <MenuProductBadgePicker
                          catalog={badgeCatalog}
                          value={specialTags}
                          onChange={setSpecialTags}
                          onCustomize={() => setShowBadgeManager(true)}
                        />
                      </div>
                      <label>
                        <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                          Custom tags
                        </span>
                        <input
                          value={tagsInput}
                          onChange={(e) => setTagsInput(e.target.value)}
                          placeholder="vegan, spicy, dairy-free (comma separated)"
                          className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
                        />
                      </label>
                    </div>
                  </ProductSettingsSection>

                  <ProductSettingsSection
                    step={4}
                    icon="trending_up"
                    title="Upselling & downselling"
                    description="Suggest add-ons or lighter alternatives at checkout. Set rules for when to show them and promo pricing (e.g. bread for RM2, free ice cream)."
                  >
                    <UpsellRuleEditor
                      key={editing.slug}
                      options={upsellOptions}
                      value={upsellLinks}
                      onChange={setUpsellLinks}
                      currency={currency}
                    />
                  </ProductSettingsSection>

                  <ProductSettingsSection
                    step={5}
                    icon="tune"
                    title="Customisation"
                    description={
                      editingCoffee
                        ? "Coffee templates for temperature, size, milk, syrups, and more — or build your own groups."
                        : "Modifier groups for size, milk, add-ons, and more."
                    }
                  >
                    {editingCoffee && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setModifierGroups(coffeeDrinkModifierTemplate(currency))}
                          className="border border-primary px-3 py-1.5 font-mono text-label-mono text-primary"
                        >
                          Apply drink template
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModifierGroups(coffeeRetailBeansModifierTemplate(currency));
                            setCoffeeProfile((prev) => ({ ...prev, kind: "retail_beans" }));
                          }}
                          className="border border-surface-container-highest px-3 py-1.5 font-mono text-label-mono text-on-surface-variant"
                        >
                          Apply retail beans template
                        </button>
                      </div>
                    )}
                    <MenuModifierEditor
                      hideHeader
                      groups={modifierGroups}
                      onChange={setModifierGroups}
                      currency={currency}
                    />
                  </ProductSettingsSection>

                  <ProductSettingsSection
                    step={6}
                    icon="shopping_bag"
                    title="Take away charge"
                    description="Optional packaging surcharge when diners pack this item to go (dine-in) or order take away."
                  >
                    <MenuTakeawayChargeEditor
                      value={takeawayCharge}
                      onChange={setTakeawayCharge}
                      currency={currency}
                    />
                  </ProductSettingsSection>

                  <ProductSettingsSection
                    step={7}
                    icon="schedule"
                    title="Availability"
                    description="When diners can order this item on the storefront."
                  >
                    <MenuItemAvailabilityEditor
                      hideHeader
                      mode={availabilityMode}
                      weeklyDays={weeklyDays}
                      weeklyStart={weeklyStart}
                      weeklyEnd={weeklyEnd}
                      availableFrom={availableFromLocal}
                      availableUntil={availableUntilLocal}
                      onModeChange={setAvailabilityMode}
                      onWeeklyDaysChange={setWeeklyDays}
                      onWeeklyStartChange={setWeeklyStart}
                      onWeeklyEndChange={setWeeklyEnd}
                      onAvailableFromChange={setAvailableFromLocal}
                      onAvailableUntilChange={setAvailableUntilLocal}
                    />
                  </ProductSettingsSection>
                </div>

                <div className="mt-6 flex gap-2">
                  <button type="submit" className="bg-primary px-5 py-2.5 text-on-primary">
                    {isNewItem ? "Add product" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="border border-surface-container-highest px-5 py-2.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-hidden border border-surface-container-highest bg-surface-container-lowest">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-surface-container-highest bg-surface">
                      {["Product", "Badges", "Upselling", "Availability", "Price", "Status", ""].map((col) => (
                        <th
                          key={col}
                          className="px-6 py-4 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant"
                        >
                          {col}
                        </th>
                      ))}
                  </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-12 text-center text-body-md text-on-surface-variant"
                        >
                          No products match your filters.
                          <button
                            type="button"
                            onClick={startAddProduct}
                            className="ml-2 underline hover:text-primary"
                          >
                            Add one
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr
                          key={item.slug}
                          className="border-b border-surface-container-highest transition-colors hover:bg-surface-container-low"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative h-12 w-12 shrink-0 border border-surface-container-highest bg-surface-container-low">
                                {item.imageUrl ? (
                                  <Image
                                    src={item.imageUrl}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                                    <Icon name="image_not_supported" className="text-xl opacity-60" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-display text-headline-sm text-primary">
                                  {item.name}
                                </p>
                                <p className="mt-1 font-mono text-label-mono text-on-surface-variant">
                                  {categoryLabelBySlug.get(item.categorySlug) ?? item.categorySlug}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {item.specialTags.length === 0 && item.tags.length === 0 ? (
                                <span className="text-body-md text-on-surface-variant">—</span>
                              ) : (
                                <>
                                  {item.specialTags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[10px] uppercase text-primary"
                                    >
                                      {specialTagLabel(tag, badgeCatalog)}
                                    </span>
                                  ))}
                                  {item.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="border border-surface-container-highest bg-surface-container-low px-2 py-0.5 font-mono text-[11px] text-on-surface"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-body-md text-on-surface">
                              {upsellSummary(item.upsellLinks)}
                            </span>
                          </td>
                          <td className="max-w-[200px] px-6 py-4 font-mono text-label-mono text-on-surface-variant">
                            {formatAvailabilitySummary(item)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-label-mono">
                            {formatMerchantPrice(item.priceCents, currency)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={item.active}
                              onClick={() => toggleActive(item)}
                              className={`inline-flex h-4 w-8 items-center border transition-colors ${
                                item.active
                                  ? "border-primary bg-primary"
                                  : "border-surface-container-highest bg-surface-container-highest"
                              }`}
                            >
                              <span
                                className={`h-3 w-3 bg-surface-container-lowest transition-transform ${
                                  item.active ? "translate-x-4 border border-primary" : "translate-x-0.5 border border-on-surface"
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openEditor(item)}
                              className="text-on-surface-variant hover:text-primary"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Icon name="edit" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-surface-container-highest px-6 py-3 font-mono text-label-mono text-on-surface-variant">
                <span>
                  {filteredItems.length} of {items.length} products
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {showBadgeManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto bg-surface-container-lowest shadow-xl">
            <MenuBadgeManager
              merchantSlug={merchantSlug}
              badges={badgeCatalog}
              onChange={(badges) => {
                setBadgeCatalog(badges);
                setSpecialTags((prev) => normalizeSpecialTags(prev, badges));
              }}
              onClose={() => setShowBadgeManager(false)}
            />
          </div>
        </div>
      )}
    </AdminShell>
  );
}
