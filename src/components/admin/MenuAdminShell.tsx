"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useUnsavedChangesGuard } from "@/components/admin/unsaved-changes";
import { MenuCategoryManager } from "@/components/admin/MenuCategoryManager";
import { MenuProductStarter } from "@/components/admin/MenuProductStarter";
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
  filterIngredientPresetsForDrinkProduct,
  filterIngredientPresetsForFoodProduct,
  formatCustomIngredients,
  sanitizeIngredientIds,
  stripCoffeeDisclosureIngredientIds,
  stripCoffeeIngredientIds,
  stripFoodOnlyIngredientIds,
  type MenuIngredientPreset,
} from "@/lib/menu/menu-ingredients";
import { MenuItemIngredientPicker } from "@/components/admin/MenuItemIngredientPicker";
import { ProductDetailView } from "@/components/storefront/ProductDetailView";
import { MenuDetailTemplateEditor } from "@/components/admin/MenuDetailTemplateEditor";
import { MenuCatalogImportPanel } from "@/components/admin/MenuCatalogImportPanel";
import {
  emptyMenuItemDetail,
  parseMenuItemDetail,
  type MenuItemDetail,
} from "@/lib/menu/detail";
import type { TakeawayChargeConfig } from "@/lib/menu/takeaway-charge";
import { mergeMaxProfitLinks, type UpsellLinkConfig } from "@/lib/menu/upsell-rules";
import { MainIngredientPicker } from "@/components/admin/MainIngredientPicker";
import {
  guessMainIngredientsFromText,
  normalizeMainIngredientIds,
  type MainIngredientId,
} from "@/lib/menu/main-ingredients";
import { ProductEditorShell } from "@/components/admin/ProductEditorShell";
import type { StorefrontMenuItem } from "@/lib/menu/storefront";
import type { ModifierGroup } from "@/lib/menu/modifiers";
import type { ModifierGroupInput } from "@/lib/db/modifiers-repository";
import { HorizontalScrollCue } from "@/components/ui/HorizontalScrollCue";
import { Icon } from "@/components/ui/Icon";
import {
  type ProgramLanguage,
} from "@/lib/i18n/program-locale";
import type { LocalizedMap } from "@/lib/i18n/program-locale";
import {
  centsToPriceInput,
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
import { MenuSimpleCategoryEditor } from "@/components/admin/MenuSimpleCategoryEditor";
import {
  isCoffeeMenuCategory,
  isDrinkMenuCategory,
} from "@/lib/menu/coffee-templates";
import {
  ensureSimpleDrinkModifiers,
  simpleDrinkExtraModifierGroups,
  simpleDrinkModifierTemplate,
} from "@/lib/menu/simple-drink-options";
import {
  createEmptySimpleCategoryProfile,
  ensureSimpleCategoryModifiers,
  parseCategoryProfile,
  resolveSimpleCategory,
  SIMPLE_CATEGORY_DEFS,
  simpleCategoryExtraModifierGroups,
  simpleCategoryModifierTemplate,
} from "@/lib/menu/simple-category-options";
import type { SimpleCategoryKind, SimpleCategoryProfile } from "@/lib/menu/simple-category-profile";
import {
  cafeProductPresetPrice,
  type CafeProductPreset,
} from "@/lib/menu/cafe-product-presets";
import { estimateKcalFromProduct } from "@/lib/menu/estimate-kcal";
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
  availableDineIn?: boolean;
  availableTakeaway?: boolean;
  kcal?: number | null;
  sugarG?: number | null;
  ingredients?: string | null;
  itemNotes?: string | null;
  ingredientIds?: string[];
  mainIngredientIds?: MainIngredientId[];
  nameI18n?: LocalizedMap;
  descriptionI18n?: LocalizedMap;
  ingredientsI18n?: LocalizedMap;
  itemNotesI18n?: LocalizedMap;
  coffeeProfile?: CoffeeProfile | SimpleCategoryProfile;
  simpleCategoryProfile?: SimpleCategoryProfile;
  detail?: MenuItemDetail;
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
    availableDineIn: true,
    availableTakeaway: true,
    kcal: null,
    sugarG: null,
    ingredients: null,
    itemNotes: null,
    ingredientIds: [],
    mainIngredientIds: [],
    nameI18n: { en: "" },
    descriptionI18n: { en: "" },
    ingredientsI18n: { en: "" },
    itemNotesI18n: { en: "" },
    coffeeProfile: emptyCoffeeProfile(),
    detail: emptyMenuItemDetail(),
  };
}

function storedProfileForCategory(
  categorySlug: string,
  label: string | undefined,
): CoffeeProfile | SimpleCategoryProfile {
  if (isCoffeeMenuCategory(categorySlug, label)) return emptyCoffeeProfile();
  const kind = resolveSimpleCategory(categorySlug, label);
  if (kind) return createEmptySimpleCategoryProfile(kind);
  return emptyCoffeeProfile();
}

function modifiersForCategory(
  categorySlug: string,
  label: string | undefined,
  currency: MerchantCurrency,
): ModifierGroupInput[] {
  if (isCoffeeMenuCategory(categorySlug, label)) {
    return simpleDrinkModifierTemplate(currency, emptyCoffeeProfile());
  }
  const kind = resolveSimpleCategory(categorySlug, label);
  if (kind) return simpleCategoryModifierTemplate(kind, currency);
  return [];
}

export function MenuAdminShell({ merchantSlug }: MenuAdminShellProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showProductStarter, setShowProductStarter] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
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
  const [availableDineIn, setAvailableDineIn] = useState(true);
  const [availableTakeaway, setAvailableTakeaway] = useState(true);
  const [completingProduct, setCompletingProduct] = useState(false);
  const [completeHint, setCompleteHint] = useState<string | null>(null);
  const [productPreview, setProductPreview] = useState<StorefrontMenuItem | null>(null);
  const [detailDraft, setDetailDraft] = useState<MenuItemDetail>(emptyMenuItemDetail());
  const [showCatalogImport, setShowCatalogImport] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [ingredientPresets, setIngredientPresets] = useState<MenuIngredientPreset[]>([]);
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [mainIngredientIds, setMainIngredientIds] = useState<MainIngredientId[]>([]);
  const [mainIngredientHint, setMainIngredientHint] = useState<string | null>(null);
  const [mainIngredientSuggesting, setMainIngredientSuggesting] = useState(false);
  const [mainIngredientManual, setMainIngredientManual] = useState(false);
  const [customIngredients, setCustomIngredients] = useState("");
  const [kcalInput, setKcalInput] = useState("");
  const [kcalManual, setKcalManual] = useState(false);
  const [kcalHint, setKcalHint] = useState<string | null>(null);
  const [kcalAsking, setKcalAsking] = useState(false);
  const [sugarGInput, setSugarGInput] = useState("");
  const [itemNotesInput, setItemNotesInput] = useState("");
  const [coffeeProfile, setCoffeeProfile] = useState<CoffeeProfile>(emptyCoffeeProfile());
  const [simpleProfile, setSimpleProfile] = useState<SimpleCategoryProfile>(
    createEmptySimpleCategoryProfile("brunch"),
  );
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
      setFilterCategory((prev) => {
        if (data.categories.some((c) => c.slug === prev)) return prev;
        return data.categories[0]?.slug ?? "";
      });
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
          availableDineIn: item.availableDineIn ?? true,
          availableTakeaway: item.availableTakeaway ?? true,
          kcal: item.kcal ?? null,
          sugarG: item.sugarG ?? null,
          ingredients: item.ingredients ?? null,
          itemNotes: item.itemNotes ?? null,
          ingredientIds: item.ingredientIds ?? [],
          mainIngredientIds: normalizeMainIngredientIds(item.mainIngredientIds ?? []),
          nameI18n: item.nameI18n ?? { en: item.name },
          descriptionI18n: item.descriptionI18n ?? { en: item.description ?? "" },
          ingredientsI18n: item.ingredientsI18n ?? { en: item.ingredients ?? "" },
          itemNotesI18n: item.itemNotesI18n ?? { en: item.itemNotes ?? "" },
          coffeeProfile: parseCoffeeProfile(item.coffeeProfile),
          detail: parseMenuItemDetail(item.detail),
          simpleCategoryProfile: (() => {
            const cat = data.categories.find((c) => c.slug === item.categorySlug);
            const kind = resolveSimpleCategory(item.categorySlug, cat?.label);
            return kind ? parseCategoryProfile(kind, item.coffeeProfile) : undefined;
          })(),
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
    const categorySlug = filterCategory || categories[0]?.slug;
    return items.filter((item) => {
      if (categorySlug && item.categorySlug !== categorySlug) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q))
      );
    });
  }, [items, filterCategory, categories, search]);

  const isNewItem = editing?.slug.startsWith("item-") ?? false;
  const defaultCategory = filterCategory || categories[0]?.slug || "";

  const editorFingerprint = useMemo(() => {
    if (!editing) return "";
    return JSON.stringify({
      slug: editing.slug,
      name: editing.name,
      description: editing.description,
      categorySlug: editing.categorySlug,
      active: editing.active,
      imageUrl: editing.imageUrl,
      nameI18n: editing.nameI18n,
      descriptionI18n: editing.descriptionI18n,
      priceInput,
      tagsInput,
      specialTags,
      availabilityMode,
      weeklyDays,
      weeklyStart,
      weeklyEnd,
      availableFromLocal,
      availableUntilLocal,
      modifierGroups,
      upsellLinks,
      takeawayCharge,
      availableDineIn,
      availableTakeaway,
      ingredientIds,
      mainIngredientIds,
      customIngredients,
      kcalInput,
      sugarGInput,
      itemNotesInput,
      coffeeProfile,
      simpleProfile,
    });
  }, [
    editing,
    priceInput,
    tagsInput,
    specialTags,
    availabilityMode,
    weeklyDays,
    weeklyStart,
    weeklyEnd,
    availableFromLocal,
    availableUntilLocal,
    modifierGroups,
    upsellLinks,
    takeawayCharge,
    availableDineIn,
    availableTakeaway,
    ingredientIds,
    mainIngredientIds,
    customIngredients,
    kcalInput,
    sugarGInput,
    itemNotesInput,
    coffeeProfile,
    simpleProfile,
  ]);

  const [editorBaseline, setEditorBaseline] = useState<string | null>(null);
  const latestEditorFingerprint = useRef(editorFingerprint);
  latestEditorFingerprint.current = editorFingerprint;

  // Keyed on the slug alone on purpose: this resets the unsaved-changes
  // baseline when a different product is opened, not on every keystroke.
  useEffect(() => {
    if (!editing) {
      setEditorBaseline(null);
      return;
    }
    setEditorBaseline(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.slug]);

  useEffect(() => {
    if (!editing || editorBaseline !== null) return;
    // Wait for AI auto-suggests (kcal / main ingredient) to settle before locking baseline.
    if (mainIngredientSuggesting || kcalAsking) return;
    const timer = window.setTimeout(() => {
      setEditorBaseline(latestEditorFingerprint.current);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [
    editing,
    editorBaseline,
    editorFingerprint,
    mainIngredientSuggesting,
    kcalAsking,
  ]);

  const editorDirty =
    Boolean(editing) && editorBaseline !== null && editorFingerprint !== editorBaseline;

  const { requestLeave } = useUnsavedChangesGuard({
    isDirty: editorDirty,
    onSave: async () => {
      if (!editing) return;
      try {
        setError(null);
        await persistItem(editing, true);
        setEditing(null);
        setEditorBaseline(null);
        await load();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save product";
        setError(message);
        throw err;
      }
    },
    onDiscard: () => {
      setEditing(null);
      setEditorBaseline(null);
    },
  });

  const editingCategory = editing
    ? categories.find((c) => c.slug === editing.categorySlug)
    : undefined;
  const editingCoffee = editing
    ? isCoffeeMenuCategory(editing.categorySlug, editingCategory?.label)
    : false;
  const editingDrink = editing
    ? isDrinkMenuCategory(editing.categorySlug, editingCategory?.label)
    : false;
  const editingSimpleKind: SimpleCategoryKind | null = editing
    ? resolveSimpleCategory(editing.categorySlug, editingCategory?.label)
    : null;
  const editingSimpleDrinkMode = editingCoffee;
  const editingSimpleCategoryMode = Boolean(editingSimpleKind);
  const productDetailKind: "drink" | "food" =
    editingDrink || editingSimpleKind === "juice" ? "drink" : "food";
  const managedModifierSummary = editingSimpleDrinkMode
    ? "Temperature · Size · Sweetness · Ice"
    : editingSimpleCategoryMode && editingSimpleKind
      ? SIMPLE_CATEGORY_DEFS[editingSimpleKind].groups.map((g) => g.name).join(" · ")
      : null;
  const editableModifierGroups = editingSimpleDrinkMode
    ? simpleDrinkExtraModifierGroups(modifierGroups)
    : editingSimpleCategoryMode && editingSimpleKind
      ? simpleCategoryExtraModifierGroups(editingSimpleKind, modifierGroups)
      : modifierGroups;

  function updateEditableModifierGroups(nextExtras: ModifierGroupInput[]) {
    if (editingSimpleDrinkMode) {
      setModifierGroups(ensureSimpleDrinkModifiers(nextExtras, currency, coffeeProfile));
      return;
    }
    if (editingSimpleCategoryMode && editingSimpleKind) {
      setModifierGroups(
        ensureSimpleCategoryModifiers(editingSimpleKind, nextExtras, currency, simpleProfile),
      );
      return;
    }
    setModifierGroups(nextExtras);
  }

  function updateCustomIngredients(value: string) {
    setCustomIngredients(value);
    if (!editing) return;
    setEditing({
      ...editing,
      ingredients: value,
      ingredientsI18n: {
        ...(editing.ingredientsI18n ?? { en: value }),
        en: value,
      },
    });
  }

  function updateItemNotes(value: string) {
    setItemNotesInput(value);
    if (!editing) return;
    setEditing({
      ...editing,
      itemNotes: value,
      itemNotesI18n: {
        ...(editing.itemNotesI18n ?? { en: value }),
        en: value,
      },
    });
  }

  function updateDetailTranslations(next: {
    nameI18n: LocalizedMap;
    descriptionI18n: LocalizedMap;
    ingredientsI18n: LocalizedMap;
    itemNotesI18n: LocalizedMap;
  }) {
    if (!editing) return;
    setEditing({
      ...editing,
      nameI18n: next.nameI18n,
      descriptionI18n: next.descriptionI18n,
      ingredientsI18n: next.ingredientsI18n,
      itemNotesI18n: next.itemNotesI18n,
    });
  }

  useEffect(() => {
    if (!editing?.slug || !editingCoffee) return;
    setModifierGroups((prev) => ensureSimpleDrinkModifiers(prev, currency, coffeeProfile));
  }, [
    editing?.slug,
    editingCoffee,
    coffeeProfile,
    coffeeProfile.defaultTemperature,
    coffeeProfile.defaultSize,
    coffeeProfile.defaultSweetness,
    coffeeProfile.defaultIce,
    currency,
  ]);

  /** Auto-fill kcal with AI from name/description (local hint first, then AI refine). */
  // Deps are the specific editable fields this debounce reacts to. Depending on
  // `editing` as a whole would refire the AI call on every unrelated field edit.
  useEffect(() => {
    if (!editing) return;
    if (kcalManual) return;
    const name = editing.name.trim();
    if (name.length < 2) {
      setKcalHint(null);
      return;
    }

    const cat = categories.find((c) => c.slug === editing.categorySlug);
    const local = estimateKcalFromProduct({
      name,
      description: editing.description,
      categorySlug: editing.categorySlug,
      categoryLabel: cat?.label,
    });
    if (local) {
      setKcalInput(String(local.kcal));
      if (local.sugarG != null) setSugarGInput(String(local.sugarG));
      setKcalHint(`Quick match · ${local.label} — AI refining…`);
    } else {
      setKcalHint("AI estimating from name…");
    }

    const slug = editing.slug;
    const nameSnap = editing.name;
    const descSnap = editing.description;
    const catSlug = editing.categorySlug;
    const catLabel = cat?.label;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setKcalAsking(true);
        try {
          const result = await merchantApi<{
            kcal: number | null;
            sugarG: number | null;
            label: string;
            rationale?: string;
            message?: string;
            source: string;
          }>(`/api/merchant/${merchantSlug}/ai/menu-kcal`, {
            method: "POST",
            body: JSON.stringify({
              name: nameSnap,
              description: descSnap,
              categorySlug: catSlug,
              categoryLabel: catLabel,
              forceAi: true,
            }),
          });
          if (cancelled) return;
          if (result.kcal == null) {
            setKcalHint(
              result.message ??
                (local
                  ? `Kept · ${local.label}`
                  : "AI unsure — enter kcal or tap Auto generate"),
            );
            return;
          }
          setKcalInput(String(result.kcal));
          if (result.sugarG != null) setSugarGInput(String(result.sugarG));
          setKcalHint(
            result.rationale
              ? `AI · ${result.label} — ${result.rationale}`
              : `AI · ${result.label}`,
          );
        } catch {
          if (cancelled) return;
          setKcalHint(
            local
              ? `Kept · ${local.label} (AI unavailable)`
              : "AI unavailable — enter kcal or tap Auto generate",
          );
        } finally {
          if (!cancelled) setKcalAsking(false);
        }
      })();
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // slug unused except for clarity in stale checks
      void slug;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editing?.slug,
    editing?.name,
    editing?.description,
    editing?.categorySlug,
    kcalManual,
    categories,
    merchantSlug,
  ]);

  // Auto-suggest main ingredient once when adding a food product (name typed).
  useEffect(() => {
    if (!editing?.slug.startsWith("item-")) return;
    if (mainIngredientManual) return;
    if (!editing.name.trim() || editing.name.trim().length < 3) return;
    const cat = categories.find((c) => c.slug === editing.categorySlug);
    if (isDrinkMenuCategory(editing.categorySlug, cat?.label)) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void askMainIngredientSuggest(false);
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- suggest fn stable enough; avoid re-loop
  }, [
    editing?.slug,
    editing?.name,
    editing?.description,
    editing?.categorySlug,
    mainIngredientManual,
    categories,
  ]);


  function setKcalFromUser(value: string) {
    setKcalManual(true);
    setKcalInput(value);
    setKcalHint(value.trim() ? "Edited by you" : null);
  }

  async function askMainIngredientSuggest(forceAi = true) {
    if (!editing?.name.trim()) {
      setMainIngredientHint("Add a product name first");
      return;
    }
    const cat = categories.find((c) => c.slug === editing.categorySlug);
    if (isDrinkMenuCategory(editing.categorySlug, cat?.label)) return;
    setMainIngredientSuggesting(true);
    setError(null);
    try {
      const result = await merchantApi<{
        ids: MainIngredientId[];
        source: string;
        rationale?: string;
        message?: string;
      }>(`/api/merchant/${merchantSlug}/ai/menu-main-ingredients`, {
        method: "POST",
        body: JSON.stringify({
          name: editing.name,
          description: editing.description,
          categorySlug: editing.categorySlug,
          categoryLabel: cat?.label,
          forceAi,
        }),
      });
      if (result.ids.length === 0) {
        setMainIngredientHint(result.message ?? "Could not suggest — pick one yourself");
        return;
      }
      setMainIngredientIds(normalizeMainIngredientIds(result.ids));
      setMainIngredientManual(true);
      setMainIngredientHint(
        result.rationale
          ? `${result.source === "ai" ? "AI" : "Suggested"} · ${result.rationale}`
          : result.source === "ai"
            ? "AI suggested — tap a chip to change"
            : "Suggested from the name — tap a chip to change",
      );
    } catch (err) {
      setMainIngredientHint(err instanceof Error ? err.message : "Suggest failed");
    } finally {
      setMainIngredientSuggesting(false);
    }
  }

  async function completeProductWithAi() {
    if (!editing?.name.trim()) {
      setCompleteHint("Add a product title first");
      return;
    }
    const shortDescription = (editing.description ?? "").trim();
    setCompletingProduct(true);
    setCompleteHint(
      shortDescription
        ? "Using title + short description to fill the rest…"
        : "Using product title to fill description and details…",
    );
    setError(null);
    try {
      const cat = categories.find((c) => c.slug === editing.categorySlug);
      const kind: "drink" | "food" = isDrinkMenuCategory(
        editing.categorySlug,
        cat?.label,
      )
        ? "drink"
        : "food";
      const availablePresets =
        kind === "drink"
          ? filterIngredientPresetsForDrinkProduct(ingredientPresets)
          : filterIngredientPresetsForFoodProduct(ingredientPresets);
      const targetLanguages = storefrontLanguages.filter(
        (l): l is "zh" | "ms" => l === "zh" || l === "ms",
      );

      const result = await merchantApi<{
        description: string | null;
        ingredientIds: string[];
        customIngredients: string | null;
        notes: string | null;
        kcal: number | null;
        sugarG: number | null;
        mainIngredientIds: MainIngredientId[];
        translations: {
          nameI18n: LocalizedMap;
          descriptionI18n: LocalizedMap;
          ingredientsI18n: LocalizedMap;
          itemNotesI18n: LocalizedMap;
        };
        upsellLinks: UpsellLinkConfig[];
        takeawayCharge: TakeawayChargeConfig | null;
        specialTags: string[];
        rationale?: string;
        source: string;
      }>(`/api/merchant/${merchantSlug}/ai/complete-product`, {
        method: "POST",
        body: JSON.stringify({
          name: editing.name.trim(),
          priceCents: parsePriceToCents(priceInput),
          categorySlug: editing.categorySlug,
          categoryLabel: cat?.label,
          productKind: kind,
          description: shortDescription || null,
          availablePresets: availablePresets.map((p) => ({
            id: p.id,
            label: p.label,
            group: p.group,
          })),
          upsellCandidates: upsellOptions,
          targetLanguages,
          availableTakeaway,
        }),
      });

      const nextDescription = result.description?.trim() || editing.description;
      setEditing({
        ...editing,
        description: nextDescription,
        descriptionI18n: {
          ...(editing.descriptionI18n ?? {}),
          ...result.translations.descriptionI18n,
          en: nextDescription ?? "",
        },
        nameI18n: {
          ...(editing.nameI18n ?? {}),
          ...result.translations.nameI18n,
          en: editing.name,
        },
        ingredientsI18n: {
          ...(editing.ingredientsI18n ?? {}),
          ...result.translations.ingredientsI18n,
          en: result.customIngredients ?? customIngredients,
        },
        itemNotesI18n: {
          ...(editing.itemNotesI18n ?? {}),
          ...result.translations.itemNotesI18n,
          en: result.notes ?? itemNotesInput,
        },
      });

      if (result.ingredientIds?.length) setIngredientIds(result.ingredientIds);
      if (result.customIngredients) {
        setCustomIngredients(result.customIngredients);
      }
      if (result.notes) setItemNotesInput(result.notes);
      if (result.kcal != null) {
        setKcalInput(String(result.kcal));
        setKcalManual(true);
      }
      if (result.sugarG != null) setSugarGInput(String(result.sugarG));
      if (result.mainIngredientIds?.length && kind === "food") {
        setMainIngredientIds(result.mainIngredientIds);
        setMainIngredientManual(true);
        setMainIngredientHint("Filled by Complete with AI");
      }
      if (result.upsellLinks?.length) {
        setUpsellLinks(
          upsellLinks.length === 0
            ? result.upsellLinks
            : mergeMaxProfitLinks(upsellLinks, result.upsellLinks, 8),
        );
      }
      if (result.takeawayCharge && availableTakeaway) {
        setTakeawayCharge(result.takeawayCharge);
      }
      if (result.specialTags?.length) {
        setSpecialTags(
          normalizeSpecialTags(
            [...new Set([...specialTags, ...result.specialTags])],
            badgeCatalog,
          ),
        );
      }

      setKcalHint(
        result.rationale
          ? `AI · ${result.rationale}`
          : "AI filled menu-sheet details — review below",
      );
      setCompleteHint(
        result.rationale
          ? `Done · ${result.rationale}`
          : "Done · Review description, details, translations, and sell-more below.",
      );
    } catch (err) {
      setCompleteHint(err instanceof Error ? err.message : "Complete with AI failed");
    } finally {
      setCompletingProduct(false);
    }
  }

  async function persistItem(item: MenuItem, useFormFields = false) {
    let payload = { ...item };

    if (useFormFields) {
      const saveCategory = categories.find((c) => c.slug === payload.categorySlug);
      const coffeeItem = isCoffeeMenuCategory(payload.categorySlug, saveCategory?.label);
      const drinkItem = isDrinkMenuCategory(payload.categorySlug, saveCategory?.label);
      const simpleKind = resolveSimpleCategory(payload.categorySlug, saveCategory?.label);
      const simpleModifiers = simpleKind
        ? ensureSimpleCategoryModifiers(simpleKind, modifierGroups, currency, simpleProfile)
        : modifierGroups;

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
        modifierGroups: coffeeItem
          ? ensureSimpleDrinkModifiers(modifierGroups, currency, coffeeProfile)
          : simpleModifiers,
        upsellLinks,
        takeawayCharge,
        availableDineIn,
        availableTakeaway,
        kcal: kcalInput.trim() ? Number.parseInt(kcalInput, 10) : null,
        sugarG: sugarGInput.trim() ? Number.parseFloat(sugarGInput) : null,
        ingredients: customIngredients.trim() || null,
        itemNotes: itemNotesInput.trim() || null,
        ingredientIds: (() => {
          let ids = sanitizeIngredientIds(
            coffeeItem
              ? stripCoffeeDisclosureIngredientIds(ingredientIds, ingredientPresets)
              : drinkItem
                ? ingredientIds
                : stripCoffeeIngredientIds(ingredientIds, ingredientPresets),
          );
          if (drinkItem) ids = stripFoodOnlyIngredientIds(ids);
          return ids;
        })(),
        mainIngredientIds: drinkItem ? [] : mainIngredientIds,
        ingredientsI18n: {
          ...(payload.ingredientsI18n ?? {}),
          en: customIngredients.trim(),
        },
        itemNotesI18n: {
          ...(payload.itemNotesI18n ?? {}),
          en: itemNotesInput.trim(),
        },
        coffeeProfile: coffeeItem
          ? { ...coffeeProfile, detailLevel: "simple" }
          : simpleKind
            ? { ...simpleProfile, detailLevel: "simple" }
            : emptyCoffeeProfile(),
        priceCents: parsePriceToCents(priceInput),
        detail: detailDraft,
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
    } else {
      const saveCategory = categories.find((c) => c.slug === payload.categorySlug);
      const coffeeItem = isCoffeeMenuCategory(payload.categorySlug, saveCategory?.label);
      const simpleKind = resolveSimpleCategory(payload.categorySlug, saveCategory?.label);
      if (!coffeeItem) {
        payload.coffeeProfile = simpleKind
          ? (item.simpleCategoryProfile ?? createEmptySimpleCategoryProfile(simpleKind))
          : emptyCoffeeProfile();
      }
    }

    await merchantApi(`/api/merchant/${merchantSlug}/menu`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async function saveItem(item: MenuItem) {
    setError(null);
    try {
      await persistItem(item, true);
      setEditing(null);
      setEditorBaseline(null);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save product";
      setError(message);
      throw err;
    }
  }

  function closeEditor() {
    requestLeave(() => {
      setEditing(null);
      setEditorBaseline(null);
      setProductPreview(null);
    });
  }

  function modifierInputsToStorefront(groups: ModifierGroupInput[]): ModifierGroup[] {
    return groups.map((group, gi) => ({
      id: group.id ?? `preview-g-${gi}`,
      name: group.name,
      required: group.required ?? false,
      minSelect: group.minSelect ?? 0,
      maxSelect: group.maxSelect ?? 1,
      options: group.options.map((option, oi) => ({
        id: option.id ?? `preview-o-${gi}-${oi}`,
        name: option.name,
        priceDeltaCents: option.priceDeltaCents ?? 0,
        maxQuantity: option.maxQuantity ?? 1,
        isDefault: option.isDefault,
      })),
    }));
  }

  function openProductPreview() {
    if (!editing) return;
    if (!editing.name.trim()) {
      setCompleteHint("Add a product name before preview");
      return;
    }
    const ids = sanitizeIngredientIds(ingredientIds);
    const ingredientsText = formatCustomIngredients(
      customIngredients,
      "en",
      editing.ingredientsI18n,
    );
    const preview: StorefrontMenuItem = {
      id: editing.slug,
      name: editing.name.trim() || "Untitled",
      description: (editing.description ?? "").trim(),
      priceCents: parsePriceToCents(priceInput),
      category: editing.categorySlug,
      menuItemId: editing.slug,
      imageUrl: editing.imageUrl,
      tags: parseTagsInput(tagsInput),
      specialTags: specialTags,
      kcal: kcalInput.trim() ? Number.parseInt(kcalInput, 10) : null,
      sugarG: sugarGInput.trim() ? Number.parseFloat(sugarGInput) : null,
      ingredients: ingredientsText,
      notes: itemNotesInput.trim() || null,
      ingredientIds: ids,
      mainIngredientIds: normalizeMainIngredientIds(mainIngredientIds),
      coffeeProfile: editingCoffee ? coffeeProfile : undefined,
      simpleCategoryProfile: editingSimpleKind
        ? { ...simpleProfile, kind: editingSimpleKind }
        : undefined,
      upsellLinks,
      upsellItemIds: upsellLinks.map((l) => l.slug),
      modifierGroups: modifierInputsToStorefront(modifierGroups),
      takeawayCharge,
      availableDineIn,
      availableTakeaway,
      detail: detailDraft,
    };
    setProductPreview(preview);
  }

  /** Pairing cards for the admin preview, built from the saved product list. */
  function previewPairings(): { item: StorefrontMenuItem; quantityInCart: number }[] {
    return upsellLinks
      .map((link) => items.find((i) => i.slug === link.slug))
      .filter((i): i is MenuItem => Boolean(i))
      .slice(0, 4)
      .map((i) => ({
        item: {
          id: i.slug,
          name: i.name,
          description: i.description ?? "",
          priceCents: i.priceCents,
          category: i.categorySlug,
          menuItemId: i.slug,
          imageUrl: i.imageUrl,
        },
        quantityInCart: 0,
      }));
  }

  function duplicateEditingItem() {
    if (!editing) return;
    requestLeave(() => {
      const copy: MenuItem = {
        ...editing,
        slug: `item-${Date.now()}`,
        name: `${editing.name.trim() || "Product"} (copy)`,
        nameI18n: {
          ...(editing.nameI18n ?? {}),
          en: `${editing.name.trim() || "Product"} (copy)`,
        },
        active: false,
      };
      openEditor(copy);
      setCompleteHint("Duplicated as a draft — edit and save to publish.");
    });
  }

  async function toggleActive(item: MenuItem) {
    await persistItem({ ...item, active: !item.active });
    await load();
  }

  function openEditor(item: MenuItem) {
    const itemCategory = categories.find((c) => c.slug === item.categorySlug);
    const coffeeItem = isCoffeeMenuCategory(item.categorySlug, itemCategory?.label);
    const drinkItem = isDrinkMenuCategory(item.categorySlug, itemCategory?.label);
    const simpleKind = resolveSimpleCategory(item.categorySlug, itemCategory?.label);

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
    const profile = coffeeItem
      ? { ...parseCoffeeProfile(item.coffeeProfile), detailLevel: "simple" as const }
      : emptyCoffeeProfile();
    setCoffeeProfile(profile);
    const categoryProfile = simpleKind
      ? {
          ...(item.simpleCategoryProfile ?? parseCategoryProfile(simpleKind, item.coffeeProfile)),
          detailLevel: "simple" as const,
        }
      : createEmptySimpleCategoryProfile("brunch");
    setSimpleProfile(categoryProfile);
    if (coffeeItem) {
      setModifierGroups(
        ensureSimpleDrinkModifiers(item.modifierGroups ?? [], currency, profile),
      );
    } else if (simpleKind) {
      setModifierGroups(
        ensureSimpleCategoryModifiers(
          simpleKind,
          item.modifierGroups ?? [],
          currency,
          categoryProfile,
        ),
      );
    } else {
      setModifierGroups(item.modifierGroups ?? []);
    }
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
    setAvailableDineIn(item.availableDineIn ?? true);
    setAvailableTakeaway(item.availableTakeaway ?? true);
    let loadedIds = coffeeItem
      ? stripCoffeeDisclosureIngredientIds(item.ingredientIds ?? [], ingredientPresets)
      : drinkItem
        ? (item.ingredientIds ?? [])
        : stripCoffeeIngredientIds(item.ingredientIds ?? [], ingredientPresets);
    if (drinkItem) loadedIds = stripFoodOnlyIngredientIds(loadedIds);
    setIngredientIds(loadedIds);
    setMainIngredientIds(normalizeMainIngredientIds(item.mainIngredientIds ?? []));
    setMainIngredientManual((item.mainIngredientIds ?? []).length > 0);
    setMainIngredientHint(
      (item.mainIngredientIds ?? []).length > 0 ? "Saved on this product" : null,
    );
    setCustomIngredients(item.ingredients ?? "");
    setKcalInput(item.kcal != null ? String(item.kcal) : "");
    setSugarGInput(item.sugarG != null ? String(item.sugarG) : "");
    setKcalManual(item.kcal != null);
    setKcalHint(item.kcal != null ? "Saved on this product" : null);
    setItemNotesInput(item.itemNotes ?? "");
    setDetailDraft(parseMenuItemDetail(item.detail));
  }

  function openNewEditor(categorySlug = defaultCategory) {
    const draft = newItemDraft(categorySlug || defaultCategory);
    setEditing(draft);
    setShowProductStarter(false);
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
    setAvailableDineIn(true);
    setAvailableTakeaway(true);
    setCompleteHint(null);
    setIngredientIds([]);
    setMainIngredientIds([]);
    setMainIngredientHint(null);
    setMainIngredientManual(false);
    setCustomIngredients("");
    setKcalInput("");
    setSugarGInput("");
    setKcalManual(false);
    setKcalHint(null);
    setItemNotesInput("");
    setDetailDraft(emptyMenuItemDetail());
    const cat = categories.find((c) => c.slug === draft.categorySlug);
    setCoffeeProfile(emptyCoffeeProfile());
    const simpleKind = resolveSimpleCategory(draft.categorySlug, cat?.label);
    setSimpleProfile(
      simpleKind
        ? createEmptySimpleCategoryProfile(simpleKind)
        : createEmptySimpleCategoryProfile("brunch"),
    );
    setModifierGroups(modifiersForCategory(draft.categorySlug, cat?.label, currency));
    setPriceInput("0.00");
  }

  async function createCategories(input: Array<{ slug?: string; label: string }>) {
    setSavingCategory(true);
    setError(null);
    try {
      await merchantApi<{
        categories?: Array<{ slug: string; label: string }>;
        slug?: string;
        label?: string;
      }>(`/api/merchant/${merchantSlug}/menu/categories`, {
        method: "POST",
        body: JSON.stringify(
          input.length === 1 && !input[0]?.slug
            ? { label: input[0]!.label }
            : { categories: input },
        ),
      });
      // Stay on Categories so merchant can keep adding/removing, then Back to menu.
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  }

  async function addPresetProducts(presets: CafeProductPreset[], categorySlug: string) {
    setSavingProducts(true);
    setError(null);
    try {
      const cat = categories.find((c) => c.slug === categorySlug);
      for (const product of presets) {
        await merchantApi(`/api/merchant/${merchantSlug}/menu`, {
          method: "PUT",
          body: JSON.stringify({
            slug: product.slug,
            categorySlug,
            name: product.name,
            description: product.description,
            priceCents: cafeProductPresetPrice(product, currency),
            active: true,
            imageUrl: null,
            tags: product.tags ?? [],
            specialTags: [],
            availabilityMode: "always",
            modifierGroups: modifiersForCategory(categorySlug, cat?.label, currency),
            upsellLinks: [],
            takeawayCharge: emptyTakeawayCharge(),
            coffeeProfile: storedProfileForCategory(categorySlug, cat?.label),
            kcal: product.kcal ?? null,
            sugarG: product.sugarG ?? null,
            mainIngredientIds: isDrinkMenuCategory(categorySlug, cat?.label)
              ? []
              : guessMainIngredientsFromText({
                  name: product.name,
                  description: product.description,
                }),
            nameI18n: { en: product.name },
            descriptionI18n: { en: product.description },
          }),
        });
      }
      setShowProductStarter(false);
      setFilterCategory(categorySlug);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add products");
    } finally {
      setSavingProducts(false);
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
        setFilterCategory("");
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

  function openAddProducts(categorySlug: string) {
    requestLeave(() => {
      setEditing(null);
      setEditorBaseline(null);
      setShowCategoryManager(false);
      setShowTranslations(false);
      setFilterCategory(categorySlug);
      setShowProductStarter(true);
    });
  }

  function startAddProduct() {
    if (categories.length === 0) {
      setShowCategoryManager(true);
      return;
    }
    // Second click while the starter is open → jump straight to a blank product.
    if (showProductStarter && defaultCategory) {
      requestLeave(() => openNewEditor(defaultCategory));
      return;
    }
    openAddProducts(defaultCategory);
  }

  const activeCategory = categories.find((c) => c.slug === filterCategory) ?? categories[0] ?? null;
  const activeCategoryCount = activeCategory
    ? (itemCountByCategory.get(activeCategory.slug) ?? 0)
    : 0;

  const existingItemSlugs = useMemo(
    () => new Set(items.map((item) => item.slug)),
    [items],
  );

  const upsellOptions = useMemo(
    () =>
      items
        .filter((item) => item.slug !== editing?.slug)
        .map((item) => ({
          slug: item.slug,
          name: item.name,
          categoryLabel: categoryLabelBySlug.get(item.categorySlug),
          categorySlug: item.categorySlug,
          priceCents: item.priceCents,
          tags: item.tags,
          specialTags: item.specialTags,
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
      title="Menu"
      eyebrow="Catalog"
    >
      <div className={`mx-auto ${editing ? "max-w-[1280px]" : "max-w-[1200px]"}`}>
        {!editing ? (
        <div className="mb-6 flex flex-col gap-4 border-b border-surface-container-highest pb-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-md text-on-surface-variant">
            Pick a category → add products into it.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setShowProductStarter(false);
                setShowCategoryManager((v) => !v);
              }}
              className={`inline-flex items-center gap-2 border px-4 py-2 font-body-md transition-colors ${
                showCategoryManager
                  ? "border-primary bg-surface-container-low text-primary"
                  : "border-primary text-primary hover:bg-surface-container-low"
              }`}
            >
              <Icon name="category" className="text-[18px]" />
              Categories
            </button>
            <button
              type="button"
              onClick={() => setShowTranslations((v) => !v)}
              className={`inline-flex items-center gap-2 border px-4 py-2 font-body-md transition-colors ${
                showTranslations
                  ? "border-primary bg-surface-container-low text-primary"
                  : "border-primary text-primary hover:bg-surface-container-low"
              }`}
            >
              <Icon name="translate" className="text-[18px]" />
              Translate
            </button>
          </div>
        </div>
        ) : null}

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800">
            {error}
          </div>
        )}

        {loading && <p className="text-body-md text-on-surface-variant">Loading…</p>}

        {!loading && categories.length === 0 && !showCategoryManager && (
          <div className="border border-surface-container-highest bg-surface-container-lowest px-8 py-12 text-center">
            <p className="font-display text-headline-sm text-primary">Add categories first</p>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Coffee, Brunch, Pastries — then products go inside each one.
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setShowCategoryManager(true);
              }}
              className="mt-6 inline-flex items-center gap-2 bg-[#1a3d2e] px-5 py-2.5 font-display text-headline-sm text-white"
            >
              <Icon name="add" />
              Add categories
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
          <MenuCategoryManager
            categories={categories}
            itemCountByCategory={itemCountByCategory}
            saving={savingCategory}
            deletingSlug={deletingCategory}
            onClose={() => {
              setError(null);
              setShowCategoryManager(false);
            }}
            onCreate={createCategories}
            onRemove={(category) => void removeCategory(category)}
          />
        )}

        {!loading && categories.length > 0 && !showCategoryManager && editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveItem(editing).catch(() => {});
            }}
          >
            <ProductEditorShell
              isNewItem={isNewItem}
              productName={editing.name}
              categoryLabel={editingCategory?.label ?? null}
              currency={currency}
              active={editing.active}
              onActiveChange={(next) => setEditing({ ...editing, active: next })}
              completing={completingProduct}
              completeHint={completeHint}
              onCompleteWithAi={() => void completeProductWithAi()}
              onCancel={closeEditor}
              onSubmit={() => void saveItem(editing).catch(() => {})}
              onPreview={openProductPreview}
              onDuplicate={isNewItem ? undefined : () => duplicateEditingItem()}
              detailSlot={
                <MenuDetailTemplateEditor
                  value={detailDraft}
                  onChange={setDetailDraft}
                  categoryLabel={editingCategory?.label ?? null}
                  kcal={kcalInput}
                />
              }
              name={editing.name}
              onNameChange={(value) =>
                setEditing({
                  ...editing,
                  name: value,
                  nameI18n: {
                    ...(editing.nameI18n ?? { en: editing.name }),
                    en: value,
                  },
                })
              }
              priceInput={priceInput}
              onPriceChange={setPriceInput}
              onPriceBlur={() =>
                setPriceInput(centsToPriceInput(parsePriceToCents(priceInput)))
              }
              categorySlug={editing.categorySlug}
              categories={categories}
              onCategoryChange={(slug) => {
                const cat = categories.find((c) => c.slug === slug);
                const enteringCoffee = isCoffeeMenuCategory(slug, cat?.label);
                const enteringSimple = resolveSimpleCategory(slug, cat?.label);
                if (enteringCoffee || enteringSimple) {
                  if (enteringCoffee) {
                    setCoffeeProfile(emptyCoffeeProfile());
                  }
                  if (enteringSimple) {
                    setSimpleProfile(createEmptySimpleCategoryProfile(enteringSimple));
                  }
                  if (modifierGroups.length === 0) {
                    setModifierGroups(modifiersForCategory(slug, cat?.label, currency));
                  }
                } else if (editingCoffee || editingSimpleKind) {
                  setCoffeeProfile(emptyCoffeeProfile());
                  setSimpleProfile(createEmptySimpleCategoryProfile("brunch"));
                }
                setEditing({ ...editing, categorySlug: slug });
              }}
              description={editing.description ?? ""}
              onDescriptionChange={(value) =>
                setEditing({
                  ...editing,
                  description: value,
                  descriptionI18n: {
                    ...(editing.descriptionI18n ?? { en: editing.description ?? "" }),
                    en: value,
                  },
                })
              }
              descriptionLocaleTabs={
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
                  onEnglishNameChange={(value) =>
                    setEditing({
                      ...editing,
                      name: value,
                      nameI18n: {
                        ...(editing.nameI18n ?? { en: editing.name }),
                        en: value,
                      },
                    })
                  }
                  onEnglishDescriptionChange={(value) =>
                    setEditing({
                      ...editing,
                      description: value,
                      descriptionI18n: {
                        ...(editing.descriptionI18n ?? { en: editing.description ?? "" }),
                        en: value,
                      },
                    })
                  }
                />
              }
              imageUrl={editing.imageUrl}
              uploadingPhoto={uploadingPhoto}
              fileInputRef={fileInputRef}
              onPickPhoto={() => fileInputRef.current?.click()}
              onPhotoSelected={(file) => void uploadPhoto(file)}
              onRemovePhoto={() => setEditing({ ...editing, imageUrl: null })}
              availableDineIn={availableDineIn}
              availableTakeaway={availableTakeaway}
              onToggleDineIn={() => {
                if (availableDineIn && !availableTakeaway) return;
                setAvailableDineIn(!availableDineIn);
              }}
              onToggleTakeaway={() => {
                if (availableTakeaway && !availableDineIn) return;
                const next = !availableTakeaway;
                setAvailableTakeaway(next);
                if (!next) {
                  setTakeawayCharge({ ...takeawayCharge, enabled: false });
                } else if (!takeawayCharge.enabled) {
                  setTakeawayCharge(emptyTakeawayCharge());
                }
              }}
              takeawayChargeSlot={
                <MenuTakeawayChargeEditor
                  value={takeawayCharge}
                  onChange={setTakeawayCharge}
                  currency={currency}
                />
              }
              availabilitySlot={
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
              }
              modifiersSlot={
                <div className="flex flex-col gap-5">
                  {editingCoffee ? (
                    <MenuCoffeeProfileEditor
                      value={coffeeProfile}
                      onChange={setCoffeeProfile}
                    />
                  ) : null}
                  {editingSimpleKind ? (
                    <MenuSimpleCategoryEditor
                      kind={editingSimpleKind}
                      value={simpleProfile}
                      onChange={(next) => {
                        const simpleNext = { ...next, detailLevel: "simple" as const };
                        setSimpleProfile(simpleNext);
                        setModifierGroups((prev) =>
                          ensureSimpleCategoryModifiers(
                            editingSimpleKind,
                            prev,
                            currency,
                            simpleNext,
                          ),
                        );
                      }}
                    />
                  ) : null}

                  {(editingCoffee ||
                    editingSimpleKind ||
                    editableModifierGroups.length > 0) && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                        {editingSimpleDrinkMode || editingSimpleCategoryMode
                          ? "Extra add-ons"
                          : "Order options"}
                      </p>
                      <p className="mt-0.5 mb-3 text-[12px] text-on-surface-variant">
                        {editingSimpleDrinkMode
                          ? `${managedModifierSummary} are already included from the defaults above. Add milk, syrups, or paid extras here only if needed.`
                          : editingSimpleCategoryMode && managedModifierSummary
                            ? `${managedModifierSummary} are already included from the defaults above. Add paid extras here only if needed.`
                            : "Size, add-ons, and other choices diners pick when ordering."}
                      </p>
                      <MenuModifierEditor
                        hideHeader
                        groups={editableModifierGroups}
                        onChange={updateEditableModifierGroups}
                        currency={currency}
                      />
                    </div>
                  )}

                  {!editingCoffee &&
                    !editingSimpleKind &&
                    editableModifierGroups.length === 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setModifierGroups([
                            {
                              name: "Add-on",
                              required: false,
                              minSelect: 0,
                              maxSelect: 1,
                              options: [
                                {
                                  name: "Standard",
                                  priceDeltaCents: 0,
                                  maxQuantity: 1,
                                  isDefault: true,
                                },
                              ],
                            },
                          ])
                        }
                        className="font-mono text-[11px] uppercase tracking-wider text-primary underline"
                      >
                        + Add order options
                      </button>
                    )}
                </div>
              }
              mainIngredientsSlot={
                productDetailKind === "food" ? (
                  <MainIngredientPicker
                    compact
                    selected={mainIngredientIds}
                    onChange={(ids) => {
                      setMainIngredientIds(ids);
                      setMainIngredientManual(true);
                      setMainIngredientHint(ids.length ? "Edited by you" : null);
                    }}
                    suggesting={mainIngredientSuggesting}
                    hint={mainIngredientHint}
                    showSuggest={false}
                  />
                ) : undefined
              }
              dietarySlot={
                <div className="flex flex-col gap-5">
                  <MenuItemIngredientPicker
                    compact
                    presets={
                      productDetailKind === "drink"
                        ? filterIngredientPresetsForDrinkProduct(ingredientPresets)
                        : filterIngredientPresetsForFoodProduct(ingredientPresets)
                    }
                    productKind={productDetailKind}
                    selectedIds={ingredientIds}
                    customIngredients={customIngredients}
                    kcal={kcalInput}
                    sugarG={sugarGInput}
                    notes={itemNotesInput}
                    kcalHint={kcalHint}
                    generating={kcalAsking || completingProduct}
                    onSelectedIdsChange={setIngredientIds}
                    onCustomIngredientsChange={updateCustomIngredients}
                    onKcalChange={setKcalFromUser}
                    onSugarGChange={setSugarGInput}
                    onNotesChange={updateItemNotes}
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
                    onChange={updateDetailTranslations}
                    onEnglishCustomIngredientsChange={updateCustomIngredients}
                    onEnglishItemNotesChange={updateItemNotes}
                  />
                </div>
              }
              badgesSlot={
                <div className="flex flex-col gap-4">
                  <MenuProductBadgePicker
                    catalog={badgeCatalog}
                    value={specialTags}
                    onChange={setSpecialTags}
                    onCustomize={() => setShowBadgeManager(true)}
                  />
                  <label>
                    <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
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
              }
              upsellsSlot={
                <UpsellRuleEditor
                  key={editing.slug}
                  options={upsellOptions}
                  value={upsellLinks}
                  onChange={setUpsellLinks}
                  currency={currency}
                />
              }
            />
          </form>
        )}

        {productPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6">
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Close preview"
              onClick={() => setProductPreview(null)}
            />
            <div className="relative flex h-[min(880px,94vh)] w-full max-w-mobile flex-col overflow-hidden border border-surface-container-highest bg-surface shadow-2xl">
              <div className="flex items-center justify-between border-b border-surface-container-highest bg-surface-container-lowest px-4 py-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Storefront preview · product page
                </span>
                <button
                  type="button"
                  onClick={() => setProductPreview(null)}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center text-on-surface-variant hover:text-primary"
                >
                  <Icon name="close" className="text-[18px]" />
                </button>
              </div>
              <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <ProductDetailView
                  item={productPreview}
                  preview
                  currency={currency}
                  categoryLabel={editingCategory?.label ?? null}
                  badgeCatalog={badgeCatalog}
                  ingredientCatalog={ingredientPresets}
                  contextLabel="Table 01 · Dine-in"
                  pairings={previewPairings()}
                  onBack={() => setProductPreview(null)}
                />
              </div>
            </div>
          </div>
        )}

        {!loading && categories.length > 0 && !showCategoryManager && !editing && (
          <>
            <div className="mb-6 grid gap-0 border border-surface-container-highest bg-surface-container-lowest lg:grid-cols-[220px_1fr]">
              <aside className="border-b border-surface-container-highest lg:border-b-0 lg:border-r">
                <div className="border-b border-surface-container-highest px-4 py-3">
                  <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                    Categories
                  </p>
                </div>
                <div className="lg:hidden">
                  <HorizontalScrollCue
                    className="px-3 py-3"
                    contentClassName="items-center gap-1"
                    ariaLabel="Menu categories"
                  >
                    {categories.map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => {
                          requestLeave(() => {
                            setShowProductStarter(false);
                            setFilterCategory(cat.slug);
                          });
                        }}
                        className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-1 font-body-md transition-colors ${
                          (filterCategory || categories[0]?.slug) === cat.slug
                            ? "border-primary text-primary"
                            : "border-transparent text-on-surface-variant"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </HorizontalScrollCue>
                </div>
                <nav className="hidden max-h-[28rem] flex-col overflow-y-auto lg:flex" aria-label="Menu categories">
                  {categories.map((cat) => {
                    const count = itemCountByCategory.get(cat.slug) ?? 0;
                    const selected = (filterCategory || categories[0]?.slug) === cat.slug;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => {
                          requestLeave(() => {
                            setShowProductStarter(false);
                            setFilterCategory(cat.slug);
                          });
                        }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                          selected
                            ? "bg-[#1a3d2e] text-white"
                            : "text-on-surface hover:bg-surface-container-low"
                        }`}
                      >
                        <span className="font-body-md">{cat.label}</span>
                        <span
                          className={`font-mono text-label-mono ${
                            selected ? "text-white/70" : "text-on-surface-variant"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              <div className="min-w-0 p-4 sm:p-6">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-headline-sm text-primary">
                      {activeCategory?.label ?? "Products"}
                    </p>
                    <p className="mt-0.5 font-mono text-label-mono text-on-surface-variant">
                      {activeCategoryCount} product{activeCategoryCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[10rem] flex-1 sm:w-48 sm:flex-none">
                      <Icon
                        name="search"
                        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
                      />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search…"
                        className="w-full border-0 border-b border-surface-container-highest bg-transparent py-1.5 pl-7 pr-2 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductStarter(false);
                        setShowCatalogImport((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 border border-primary px-4 py-2 font-body-md font-medium text-primary"
                    >
                      <Icon name="download" className="text-[18px]" />
                      Import catalog
                    </button>
                    <button
                      type="button"
                      onClick={startAddProduct}
                      className="inline-flex items-center gap-1.5 bg-primary px-4 py-2 font-body-md font-medium text-on-primary"
                    >
                      <Icon name="add" className="text-[18px]" />
                      Add product
                    </button>
                  </div>
                </div>

                {importNotice && (
                  <p className="mb-4 flex items-center gap-2 border border-surface-container-highest bg-surface-container-low px-4 py-3 text-body-md text-on-surface">
                    <Icon name="check_circle" className="text-[18px] text-manus" />
                    {importNotice}
                  </p>
                )}

                {showCatalogImport && (
                  <MenuCatalogImportPanel
                    merchantSlug={merchantSlug}
                    onClose={() => setShowCatalogImport(false)}
                    onImported={(result) => {
                      setShowCatalogImport(false);
                      setImportNotice(
                        `Imported ${result.productsUpserted} products across ${
                          result.categoriesCreated + result.categoriesReused
                        } categories (${result.categoriesCreated} new).`,
                      );
                      void load();
                    }}
                  />
                )}

                {showProductStarter && defaultCategory && (
                  <MenuProductStarter
                    key={defaultCategory}
                    categories={categories}
                    existingItemSlugs={existingItemSlugs}
                    categorySlug={defaultCategory}
                    currency={currency}
                    saving={savingProducts}
                    error={error}
                    onClose={() => setShowProductStarter(false)}
                    onAddPresets={addPresetProducts}
                    onCustom={(categorySlug) => openNewEditor(categorySlug)}
                  />
                )}

            {!editing && !showProductStarter && (
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
                              onClick={() => requestLeave(() => openEditor(item))}
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
            )}
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
