import { KURA_KITCHEN_TEMPLATE } from "@/lib/menu/catalog-templates/kura-kitchen";
import {
  summarizeCatalogTemplate,
  type CatalogTemplate,
  type CatalogTemplateSummary,
} from "@/lib/menu/catalog-templates/types";

export type {
  CatalogTemplate,
  CatalogTemplateCategory,
  CatalogTemplateGroup,
  CatalogTemplateOption,
  CatalogTemplateProduct,
  CatalogTemplateSummary,
} from "@/lib/menu/catalog-templates/types";

/** Registry of importable catalogs. Add new templates here. */
export const CATALOG_TEMPLATES: CatalogTemplate[] = [KURA_KITCHEN_TEMPLATE];

export function listCatalogTemplates(): CatalogTemplateSummary[] {
  return CATALOG_TEMPLATES.map(summarizeCatalogTemplate);
}

export function getCatalogTemplate(id: string): CatalogTemplate | null {
  return CATALOG_TEMPLATES.find((t) => t.id === id) ?? null;
}
