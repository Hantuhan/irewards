/**
 * Product detail page template fields.
 *
 * Every product renders through the same storefront detail template; these
 * optional fields let a merchant fill the template's editorial slots
 * (eyebrow category line, hero caption bar, spec stats, kitchen-note prompt).
 * Stored on `menu_items.detail_json`.
 */

export type MenuItemDetailStat = { label: string; value: string };

export type MenuItemDetail = {
  /** Small uppercase line above the product name, e.g. "Viennoiserie Classique". */
  eyebrow: string;
  /** Left text of the caption bar under the hero photo, e.g. "Baked fresh daily at 07:30". */
  heroNote: string;
  /** Right text of the caption bar, e.g. "Batch No. #042". */
  heroNoteRight: string;
  /** Up to 3 spec stats shown in a row under the price (Prep time, Serving, Energy…). */
  stats: MenuItemDetailStat[];
  /** Placeholder for the diner's kitchen / barista note field. */
  notesPlaceholder: string;
};

export const MAX_DETAIL_STATS = 3;

export function emptyMenuItemDetail(): MenuItemDetail {
  return { eyebrow: "", heroNote: "", heroNoteRight: "", stats: [], notesPlaceholder: "" };
}

function cleanText(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseMenuItemDetail(raw: unknown): MenuItemDetail {
  const base = emptyMenuItemDetail();
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Record<string, unknown>;
  const stats: MenuItemDetailStat[] = [];
  if (Array.isArray(row.stats)) {
    for (const entry of row.stats) {
      if (!entry || typeof entry !== "object") continue;
      const stat = entry as Record<string, unknown>;
      const label = cleanText(stat.label, 40);
      const value = cleanText(stat.value, 60);
      if (!label || !value) continue;
      stats.push({ label, value });
      if (stats.length >= MAX_DETAIL_STATS) break;
    }
  }
  return {
    eyebrow: cleanText(row.eyebrow, 60),
    heroNote: cleanText(row.heroNote, 80),
    heroNoteRight: cleanText(row.heroNoteRight, 40),
    stats,
    notesPlaceholder: cleanText(row.notesPlaceholder, 160),
  };
}

/** True when any template slot is filled (used to skip empty sections). */
export function menuItemDetailHasContent(detail: MenuItemDetail | null | undefined): boolean {
  if (!detail) return false;
  return Boolean(
    detail.eyebrow ||
      detail.heroNote ||
      detail.heroNoteRight ||
      detail.stats.length > 0 ||
      detail.notesPlaceholder,
  );
}

/** Serialise for storage, dropping empty slots so the JSON stays tidy. */
export function menuItemDetailToJson(detail: MenuItemDetail): Record<string, unknown> {
  const parsed = parseMenuItemDetail(detail);
  const json: Record<string, unknown> = {};
  if (parsed.eyebrow) json.eyebrow = parsed.eyebrow;
  if (parsed.heroNote) json.heroNote = parsed.heroNote;
  if (parsed.heroNoteRight) json.heroNoteRight = parsed.heroNoteRight;
  if (parsed.stats.length > 0) json.stats = parsed.stats;
  if (parsed.notesPlaceholder) json.notesPlaceholder = parsed.notesPlaceholder;
  return json;
}

/**
 * Stats row for the detail page: merchant-entered stats first, then energy
 * from the nutrition field if there is still a free slot.
 */
export function detailStatsForDisplay(
  detail: MenuItemDetail | null | undefined,
  nutrition: { kcal?: number | null; energyLabel?: string },
): MenuItemDetailStat[] {
  const stats = [...(detail?.stats ?? [])].slice(0, MAX_DETAIL_STATS);
  const hasEnergy = stats.some((s) => /kcal|energy|calories/i.test(`${s.label} ${s.value}`));
  if (!hasEnergy && nutrition.kcal != null && stats.length < MAX_DETAIL_STATS) {
    stats.push({ label: nutrition.energyLabel ?? "Energy", value: `${nutrition.kcal} kcal` });
  }
  return stats;
}

/**
 * Colour semantics for allergen / dietary chips on the detail page.
 * alert = contains-allergen warning, positive = dietary benefit, info = neutral.
 */
export type DisclosureLevel = "alert" | "positive" | "info";

export function disclosureLevelForPreset(preset: { id: string; group: string; label: string }): DisclosureLevel {
  const group = preset.group.toLowerCase();
  const id = preset.id.toLowerCase();
  if (group === "dietary") return "positive";
  if (group === "allergens" || group === "warnings" || group === "spice level") return "alert";
  if (/^contains_/.test(id)) return "alert";
  return "info";
}
