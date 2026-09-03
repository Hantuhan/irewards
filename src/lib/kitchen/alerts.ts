/**
 * Safety alerts for the kitchen display.
 *
 * Follows the KDS convention of scanning special instructions and modifiers for
 * allergy keywords and surfacing them at the top of the ticket rather than
 * inline, where they get missed on a busy pass.
 *
 * Calibration matters more than coverage here. We match on the diner's *intent*
 * ("peanut allergy", "no nuts", "gluten-free"), never on bare ingredient words,
 * because a cafe menu is full of ingredients a diner is deliberately ordering.
 * "Extra toasted almonds" is an upsell, not an allergy, and a board that cries
 * wolf on every almond croissant trains staff to ignore the banner.
 */

export type KitchenAlertLevel = "allergy" | "diet";

export type KitchenAlert = {
  level: KitchenAlertLevel;
  /** The keyword that classified it, e.g. "allergy". Used for grouping. */
  keyword: string;
  /**
   * The full instruction that triggered it. The banner shows this, not the
   * keyword — "peanut allergy, separate utensils" is actionable, "allergy" is
   * not, and staff should never have to hunt the line for the detail.
   */
  text: string;
};

/**
 * Explicit allergy statements. Word-boundary matched, case-insensitive.
 * "gluten free" is treated as an allergy, not a preference, because coeliac
 * disease carries the same cross-contamination risk as a nut allergy.
 */
const ALLERGY_PATTERNS: RegExp[] = [
  /\ballerg(?:y|ies|en|ens|ic)\b/i,
  /\banaphyla(?:xis|ctic)\b/i,
  /\bintoleran(?:ce|t)\b/i,
  /\b(?:coeliac|celiac)\b/i,
  /\bepipen\b/i,
  // "no nuts", "without dairy", "free from gluten", "nut-free", "dairy free"
  /\b(?:no|without|avoid|omit|exclude|free\s+from)\s+(?:any\s+|all\s+)?(?:tree\s+)?(?:nuts?|peanuts?|dairy|milk|lactose|gluten|wheat|eggs?|shellfish|prawns?|shrimps?|crabs?|seafood|fish|soy(?:a|bean)?|sesame|cheese)\b/i,
  /\b(?:nut|peanut|dairy|milk|lactose|gluten|wheat|egg|shellfish|seafood|fish|soy|sesame)[\s-]?free\b/i,
];

/** Dietary requirements. Real prep constraints, but not life-threatening. */
const DIET_PATTERNS: RegExp[] = [
  /\bvegans?\b/i,
  /\bvegetarians?\b/i,
  /\bhalal\b/i,
  /\b(?:no|without|avoid)\s+(?:pork|lard|alcohol|beef)\b/i,
  /\bpork[\s-]?free\b/i,
];

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const found = pattern.exec(text);
    if (found) return found[0];
  }
  return null;
}

/** Longest sensible banner line before it stops being scannable. */
const MAX_ALERT_TEXT = 90;

function tidy(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > MAX_ALERT_TEXT ? `${clean.slice(0, MAX_ALERT_TEXT - 1).trimEnd()}…` : clean;
}

/** Highest-severity alert in a single string, or null. */
export function detectKitchenAlert(text: string | null | undefined): KitchenAlert | null {
  const value = (text ?? "").trim();
  if (!value) return null;

  const allergy = firstMatch(value, ALLERGY_PATTERNS);
  if (allergy) return { level: "allergy", keyword: allergy, text: tidy(value) };

  const diet = firstMatch(value, DIET_PATTERNS);
  if (diet) return { level: "diet", keyword: diet, text: tidy(value) };

  return null;
}

export type KitchenAlertSource = {
  /** Diner's free-text note for the line. */
  note?: string | null;
  /** Chosen modifier option names, e.g. "No Egg (Strict Vegan Prep)". */
  modifierNames?: string[];
};

/**
 * Ticket-level alerts, deduplicated, allergies first.
 * The product name is deliberately not scanned — see the note above.
 */
export function collectKitchenAlerts(sources: KitchenAlertSource[]): KitchenAlert[] {
  const byText = new Map<string, KitchenAlert>();

  for (const source of sources) {
    const candidates = [source.note ?? "", ...(source.modifierNames ?? [])];
    for (const candidate of candidates) {
      const alert = detectKitchenAlert(candidate);
      if (!alert) continue;
      const key = alert.text.toLowerCase();
      const existing = byText.get(key);
      if (!existing || (existing.level === "diet" && alert.level === "allergy")) {
        byText.set(key, alert);
      }
    }
  }

  return [...byText.values()].sort((a, b) =>
    a.level === b.level ? 0 : a.level === "allergy" ? -1 : 1,
  );
}

/** True when any alert on the ticket is a hard allergy rather than a preference. */
export function hasAllergyAlert(alerts: KitchenAlert[]): boolean {
  return alerts.some((a) => a.level === "allergy");
}

/**
 * Modifiers that remove or substitute something are the ones most often missed,
 * so the board gives them heavier weight than additions.
 */
export function isRemovalModifier(name: string): boolean {
  return /^\s*(?:no|without|hold|omit|skip|less|minus)\b/i.test(name);
}
