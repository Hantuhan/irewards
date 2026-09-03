/** Level gifts are stored in perk_description as newline-separated lines (DB-compatible). */

const GIFT_SPLIT = /\r?\n|\s*[·|]\s*/;

export function parseLevelGifts(perkDescription: string | null | undefined): string[] {
  if (!perkDescription?.trim()) return [];
  return perkDescription
    .split(GIFT_SPLIT)
    .map((g) => g.trim())
    .filter(Boolean);
}

export function joinLevelGifts(gifts: string[]): string {
  return gifts.map((g) => g.trim()).filter(Boolean).join("\n");
}

export function formatGiftsForDisplay(
  perkDescription: string | null | undefined,
  separator = " · ",
): string {
  return parseLevelGifts(perkDescription).join(separator);
}

export function countLevelGifts(perkDescription: string | null | undefined): number {
  return parseLevelGifts(perkDescription).length;
}
