import type { ProgramLanguage } from "@/lib/i18n/program-locale";

export type MenuIngredientPreset = {
  id: string;
  label: string;
  labelI18n?: Partial<Record<string, string>>;
  group: string;
};

const PRESET_LABEL_ZH: Record<string, string> = {
  milk: "牛奶",
  oat_milk: "燕麦奶",
  butter: "黄油",
  eggs: "鸡蛋",
  wheat_flour: "小麦粉",
  espresso: "浓缩咖啡",
  contains_nuts: "含坚果",
  contains_dairy: "含乳制品",
  contains_egg: "含鸡蛋",
  contains_shellfish: "含贝类",
  contains_pork: "含猪肉",
  gluten_free: "无麸质",
  vegan: "纯素",
  halal: "清真",
  contains_fish_bone: "可能有鱼骨",
  spicy: "辣",
  spicy_mild: "微辣",
  spicy_medium: "中辣",
  spicy_hot: "大辣",
};

const PRESET_LABEL_MS: Record<string, string> = {
  milk: "Susu",
  oat_milk: "Susu oat",
  butter: "Mentega",
  eggs: "Telur",
  wheat_flour: "Tepung wheat",
  espresso: "Espresso",
  contains_nuts: "Mengandungi kacang",
  contains_dairy: "Mengandungi dairy",
  contains_egg: "Mengandungi telur",
  contains_shellfish: "Mengandungi shellfish",
  contains_pork: "Mengandungi daging babi",
  gluten_free: "Bebas gluten",
  vegan: "Vegan",
  halal: "Halal",
  contains_fish_bone: "Mungkin ada tulang ikan",
  spicy: "Pedas",
  spicy_mild: "Pedas ringan",
  spicy_medium: "Pedas sederhana",
  spicy_hot: "Pedas sangat",
};

function withPresetI18n(preset: MenuIngredientPreset): MenuIngredientPreset {
  return {
    ...preset,
    labelI18n: {
      en: preset.label,
      ...(PRESET_LABEL_ZH[preset.id] ? { zh: PRESET_LABEL_ZH[preset.id] } : {}),
      ...(PRESET_LABEL_MS[preset.id] ? { ms: PRESET_LABEL_MS[preset.id] } : {}),
    },
  };
}

export const INGREDIENT_GROUP_OPTIONS = [
  "Dairy",
  "Protein",
  "Grains",
  "Coffee",
  "Syrups",
  "Produce",
  "Allergens",
  "Dietary",
  "Warnings",
  "Spice level",
  "Other",
] as const;

/** Ingredient groups reserved for coffee products — hidden on pastries, mains, etc. */
export const COFFEE_ONLY_INGREDIENT_GROUPS = new Set<string>(["Coffee", "Syrups"]);

/** Ingredient chips that cannot be selected together on one product. */
export const INGREDIENT_CONFLICTS: Record<string, string[]> = {
  contains_pork: ["halal"],
  halal: ["contains_pork"],
};

export const PORK_INGREDIENT_ID = "contains_pork";
export const HALAL_INGREDIENT_ID = "halal";

export function sanitizeIngredientIds(ids: string[]): string[] {
  if (ids.includes(PORK_INGREDIENT_ID) && ids.includes(HALAL_INGREDIENT_ID)) {
    return ids.filter((id) => id !== HALAL_INGREDIENT_ID);
  }
  return ids;
}

export function isIngredientOptionDisabled(id: string, selectedIds: string[]): boolean {
  if (selectedIds.includes(id)) return false;
  for (const selected of selectedIds) {
    const blocked = INGREDIENT_CONFLICTS[selected] ?? [];
    if (blocked.includes(id)) return true;
  }
  return false;
}

export function toggleIngredientId(selectedIds: string[], id: string): string[] {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((x) => x !== id);
  }
  const conflicts = INGREDIENT_CONFLICTS[id] ?? [];
  const withoutConflicts = selectedIds.filter((x) => !conflicts.includes(x));
  return sanitizeIngredientIds([...withoutConflicts, id]);
}

export function ingredientConflictHint(id: string, selectedIds: string[]): string | null {
  if (!isIngredientOptionDisabled(id, selectedIds)) return null;
  if (id === HALAL_INGREDIENT_ID && selectedIds.includes(PORK_INGREDIENT_ID)) {
    return "Remove Contains pork to mark this item Halal.";
  }
  if (id === PORK_INGREDIENT_ID && selectedIds.includes(HALAL_INGREDIENT_ID)) {
    return "Remove Halal to mark this item as containing pork.";
  }
  return "Conflicts with another selected chip.";
}

export function isCoffeeOnlyIngredientPreset(preset: MenuIngredientPreset): boolean {
  return COFFEE_ONLY_INGREDIENT_GROUPS.has(preset.group);
}

/** Non-coffee menu items: dairy, allergens, spice — not espresso / bean chips. */
export function filterIngredientPresetsForNonCoffeeProduct(
  catalog: MenuIngredientPreset[],
): MenuIngredientPreset[] {
  return catalog.filter((p) => !isCoffeeOnlyIngredientPreset(p));
}

export function stripCoffeeIngredientIds(
  ids: string[],
  catalog: MenuIngredientPreset[],
): string[] {
  const coffeeIds = new Set(
    catalog.filter(isCoffeeOnlyIngredientPreset).map((p) => p.id),
  );
  return ids.filter((id) => !coffeeIds.has(id));
}

/** Groups merchants can pick when adding presets on non-coffee products. */
export function ingredientGroupOptionsForNonCoffeeProduct(): string[] {
  return INGREDIENT_GROUP_OPTIONS.filter((g) => !COFFEE_ONLY_INGREDIENT_GROUPS.has(g));
}

export function findIngredientPresetByLabel(
  catalog: MenuIngredientPreset[],
  label: string,
): MenuIngredientPreset | undefined {
  const needle = label.trim().toLowerCase();
  return catalog.find((p) => p.label.trim().toLowerCase() === needle);
}

export function addIngredientPresetToCatalog(
  catalog: MenuIngredientPreset[],
  input: { label: string; group: string },
): { catalog: MenuIngredientPreset[]; preset: MenuIngredientPreset } {
  const label = input.label.trim();
  const group = input.group.trim() || "Other";
  const existing = findIngredientPresetByLabel(catalog, label);
  if (existing) {
    return { catalog, preset: existing };
  }

  let id = slugifyIngredientId(label);
  let suffix = 0;
  while (catalog.some((p) => p.id === id)) {
    suffix += 1;
    id = `${slugifyIngredientId(label)}_${suffix}`;
  }

  const preset: MenuIngredientPreset = {
    id,
    label,
    group,
    labelI18n: { en: label },
  };
  return { catalog: [...catalog, preset], preset };
}

export const DEFAULT_MENU_INGREDIENT_PRESETS: MenuIngredientPreset[] = [
  { id: "milk", label: "Milk", group: "Dairy" },
  { id: "oat_milk", label: "Oat milk", group: "Dairy" },
  { id: "butter", label: "Butter", group: "Dairy" },
  { id: "eggs", label: "Eggs", group: "Protein" },
  { id: "wheat_flour", label: "Wheat flour", group: "Grains" },
  { id: "espresso", label: "Espresso", group: "Coffee" },
  { id: "contains_nuts", label: "Contains nuts", group: "Allergens" },
  { id: "contains_dairy", label: "Contains dairy", group: "Allergens" },
  { id: "contains_egg", label: "Contains egg", group: "Allergens" },
  { id: "contains_shellfish", label: "Contains shellfish", group: "Allergens" },
  { id: "contains_pork", label: "Contains pork", group: "Warnings" },
  { id: "contains_fish_bone", label: "Got fish bone", group: "Warnings" },
  { id: "gluten_free", label: "Gluten-free", group: "Dietary" },
  { id: "vegan", label: "Vegan", group: "Dietary" },
  { id: "halal", label: "Halal", group: "Dietary" },
  { id: "spicy", label: "Spicy", group: "Spice level" },
  { id: "spicy_mild", label: "Mild spicy", group: "Spice level" },
  { id: "spicy_medium", label: "Medium spicy", group: "Spice level" },
  { id: "spicy_hot", label: "Extra spicy", group: "Spice level" },
];

/** Add standard chips (spicy, fish bone, allergens) missing from a merchant library. */
export function mergeStandardIngredientPresets(
  catalog: MenuIngredientPreset[],
): MenuIngredientPreset[] {
  const seen = new Set(catalog.map((p) => p.id));
  const merged = [...catalog];
  for (const preset of DEFAULT_MENU_INGREDIENT_PRESETS) {
    if (seen.has(preset.id)) continue;
    merged.push(withPresetI18n(preset));
    seen.add(preset.id);
  }
  return merged;
}

export function parseMenuIngredientPresets(raw: unknown): MenuIngredientPreset[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_MENU_INGREDIENT_PRESETS.map(withPresetI18n);
  }

  const parsed: MenuIngredientPreset[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const group =
      typeof row.group === "string" && row.group.trim() ? row.group.trim() : "Other";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    const labelI18n =
      row.labelI18n && typeof row.labelI18n === "object"
        ? (row.labelI18n as Record<string, string>)
        : undefined;
    parsed.push({
      id,
      label,
      labelI18n: labelI18n ?? {
        en: label,
        zh: PRESET_LABEL_ZH[id],
        ms: PRESET_LABEL_MS[id],
      },
      group,
    });
  }

  return parsed.length > 0 ? parsed : DEFAULT_MENU_INGREDIENT_PRESETS.map(withPresetI18n);
}

export function ingredientLabel(
  id: string,
  catalog: MenuIngredientPreset[],
  lang?: ProgramLanguage,
): string {
  const preset = catalog.find((p) => p.id === id);
  if (!preset) return id.replace(/_/g, " ");
  if (!lang || lang === "en") return preset.label;
  const localized = preset.labelI18n?.[lang]?.trim();
  if (localized) return localized;
  if (lang === "zh" && PRESET_LABEL_ZH[id]) return PRESET_LABEL_ZH[id];
  if (lang === "ms" && PRESET_LABEL_MS[id]) return PRESET_LABEL_MS[id];
  return preset.label;
}

export function normalizeIngredientIds(
  ids: string[],
  catalog: MenuIngredientPreset[] = DEFAULT_MENU_INGREDIENT_PRESETS,
): string[] {
  const allowed = new Set(catalog.map((p) => p.id));
  return [...new Set(ids.filter((id) => allowed.has(id)))];
}

export function slugifyIngredientId(label: string): string {
  const base =
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "ingredient";
  return `${base}_${Date.now().toString(36)}`;
}

export function groupIngredientPresets(
  catalog: MenuIngredientPreset[],
): Map<string, MenuIngredientPreset[]> {
  const map = new Map<string, MenuIngredientPreset[]>();
  for (const preset of catalog) {
    const list = map.get(preset.group) ?? [];
    list.push(preset);
    map.set(preset.group, list);
  }
  return map;
}

export function formatIngredientList(
  ids: string[],
  catalog: MenuIngredientPreset[],
  customText?: string | null,
  lang?: ProgramLanguage,
  customTextI18n?: Record<string, string> | null,
): string | null {
  const labels = ids.map((id) => ingredientLabel(id, catalog, lang));
  let custom = customText?.trim() ?? "";
  if (lang && lang !== "en" && customTextI18n?.[lang]?.trim()) {
    custom = customTextI18n[lang]!.trim();
  }
  const parts = [...labels, custom].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
