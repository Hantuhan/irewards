import { deepseekChat, isDeepseekConfigured, parseJsonFromModel } from "@/lib/ai/deepseek";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import { PROGRAM_LANGUAGES } from "@/lib/i18n/program-locale";
import type { LocalizedMap } from "@/lib/i18n/program-locale";

export type MenuTranslationItemSource = {
  slug: string;
  name: string;
  description: string | null;
  customIngredients: string | null;
  itemNotes: string | null;
  ingredientLabels: string[];
};

export type MenuTranslationSource = {
  categories: Array<{ slug: string; label: string }>;
  items: MenuTranslationItemSource[];
};

export type MenuTranslationItemDraft = {
  slug: string;
  nameI18n: LocalizedMap;
  descriptionI18n: LocalizedMap;
  ingredientsI18n: LocalizedMap;
  itemNotesI18n: LocalizedMap;
};

export type MenuTranslationDraft = {
  categories: Array<{ slug: string; labelI18n: LocalizedMap }>;
  items: MenuTranslationItemDraft[];
  source: "deepseek" | "empty";
  message?: string;
};

type AiMenuTranslationPayload = {
  categories?: Array<{ slug: string; labelI18n?: LocalizedMap }>;
  items?: Array<{
    slug: string;
    nameI18n?: LocalizedMap;
    descriptionI18n?: LocalizedMap;
    ingredientsI18n?: LocalizedMap;
    itemNotesI18n?: LocalizedMap;
  }>;
};

type ExistingItemI18n = {
  nameI18n?: LocalizedMap;
  descriptionI18n?: LocalizedMap;
  ingredientsI18n?: LocalizedMap;
  itemNotesI18n?: LocalizedMap;
};

function languageLabel(code: ProgramLanguage): string {
  return PROGRAM_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

function mergeField(
  targets: ProgramLanguage[],
  overwrite: boolean,
  existing: LocalizedMap,
  draft: LocalizedMap,
  english: string,
): LocalizedMap {
  const result: LocalizedMap = { en: english };
  for (const lang of targets) {
    const hasExisting = Boolean(existing[lang]?.trim());
    if (!overwrite && hasExisting) {
      result[lang] = existing[lang]!;
    } else if (draft[lang]?.trim()) {
      result[lang] = draft[lang]!.trim();
    }
  }
  return result;
}

export async function draftMenuTranslations(input: {
  merchantName: string;
  currency: "MYR" | "SGD";
  source: MenuTranslationSource;
  targetLanguages: ProgramLanguage[];
  overwrite: boolean;
  existing?: {
    categories: Array<{ slug: string; labelI18n?: LocalizedMap }>;
    items: Array<{ slug: string } & ExistingItemI18n>;
  };
}): Promise<MenuTranslationDraft> {
  const targets = input.targetLanguages.filter((l) => l !== "en");
  if (targets.length === 0) {
    return {
      categories: [],
      items: [],
      source: "empty",
      message: "Select at least one non-English language.",
    };
  }

  if (!isDeepseekConfigured()) {
    return {
      categories: [],
      items: [],
      source: "empty",
      message: "Add DEEPSEEK_API_KEY in .env.local for AI menu translation.",
    };
  }

  const region = input.currency === "MYR" ? "Malaysia" : "Singapore";
  const targetLabels = targets.map((t) => languageLabel(t)).join(", ");

  const content = await deepseekChat(
    [
      {
        role: "system",
        content: `You translate cafe and F&B menu content for diners in ${region}.
Source language: English.
Target languages: ${targetLabels}.
Return JSON only:
{
  "categories": [{ "slug": string, "labelI18n": { "zh": string, "ms": string } }],
  "items": [{
    "slug": string,
    "nameI18n": { "zh": string, "ms": string },
    "descriptionI18n": { "zh": string, "ms": string },
    "ingredientsI18n": { "zh": string, "ms": string },
    "itemNotesI18n": { "zh": string, "ms": string }
  }]
}
Rules:
- Translate name, short description, custom ingredients line, and item notes for each product.
- Ingredient chip labels listed under a product should inform tone but customIngredientsI18n is only for the free-text custom ingredients field.
- Keep menu tone: short, clear, appetizing. Warnings (fish bone, spice) must stay accurate.
- Use only target keys: ${targets.join(", ")}.
- Empty English field → empty string for that field in each target language.
- Do not translate slugs.`,
      },
      {
        role: "user",
        content: `Merchant: ${input.merchantName}
Categories:
${input.source.categories.map((c) => `- ${c.slug}: ${c.label}`).join("\n")}
Products:
${input.source.items
  .map((i) => {
    const chips =
      i.ingredientLabels.length > 0 ? ` [chips: ${i.ingredientLabels.join(", ")}]` : "";
    const custom = i.customIngredients ? ` | custom ingredients: ${i.customIngredients}` : "";
    const notes = i.itemNotes ? ` | notes: ${i.itemNotes}` : "";
    return `- ${i.slug}: ${i.name}${i.description ? ` — ${i.description}` : ""}${chips}${custom}${notes}`;
  })
  .join("\n")}`,
      },
    ],
    { temperature: 0.3, json: true },
  );

  if (!content) {
    return {
      categories: [],
      items: [],
      source: "empty",
      message: "AI returned no translation. Try again.",
    };
  }

  const parsed = parseJsonFromModel<AiMenuTranslationPayload>(content);
  if (!parsed) {
    return {
      categories: [],
      items: [],
      source: "empty",
      message: "Could not parse AI translation. Try again.",
    };
  }

  const existingCatMap = new Map(
    (input.existing?.categories ?? []).map((c) => [c.slug, c.labelI18n ?? {}]),
  );
  const existingItemMap = new Map(
    (input.existing?.items ?? []).map((i) => [i.slug, i]),
  );

  const categories = (parsed.categories ?? []).map((cat) => {
    const sourceCat = input.source.categories.find((c) => c.slug === cat.slug);
    const existing = existingCatMap.get(cat.slug) ?? {};
    const draft = cat.labelI18n ?? {};
    const labelI18n: LocalizedMap = { en: sourceCat?.label ?? "" };
    for (const lang of targets) {
      const hasExisting = Boolean(existing[lang]?.trim());
      if (!input.overwrite && hasExisting) {
        labelI18n[lang] = existing[lang]!;
      } else if (draft[lang]?.trim()) {
        labelI18n[lang] = draft[lang]!.trim();
      }
    }
    return { slug: cat.slug, labelI18n };
  });

  const items = (parsed.items ?? []).map((item) => {
    const sourceItem = input.source.items.find((i) => i.slug === item.slug);
    const existing: ExistingItemI18n = existingItemMap.get(item.slug) ?? {};
    return {
      slug: item.slug,
      nameI18n: mergeField(
        targets,
        input.overwrite,
        existing.nameI18n ?? {},
        item.nameI18n ?? {},
        sourceItem?.name ?? "",
      ),
      descriptionI18n: mergeField(
        targets,
        input.overwrite,
        existing.descriptionI18n ?? {},
        item.descriptionI18n ?? {},
        sourceItem?.description ?? "",
      ),
      ingredientsI18n: mergeField(
        targets,
        input.overwrite,
        existing.ingredientsI18n ?? {},
        item.ingredientsI18n ?? {},
        sourceItem?.customIngredients ?? "",
      ),
      itemNotesI18n: mergeField(
        targets,
        input.overwrite,
        existing.itemNotesI18n ?? {},
        item.itemNotesI18n ?? {},
        sourceItem?.itemNotes ?? "",
      ),
    };
  });

  return { categories, items, source: "deepseek" };
}
