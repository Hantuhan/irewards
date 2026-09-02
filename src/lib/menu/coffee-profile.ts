export type CoffeeProductKind = "drink" | "retail_beans";

export type CoffeeRoastLevel = "light" | "medium" | "medium_dark" | "dark";

export type CoffeeProcessMethod = "washed" | "natural" | "honey" | "other";

export type FlavorIntensity = 1 | 2 | 3 | 4 | 5;

export type CoffeeFlavorProfile = {
  acidity?: FlavorIntensity;
  body?: FlavorIntensity;
  sweetness?: FlavorIntensity;
};

export type CoffeeDetailLevel = "simple" | "advanced";

export type CoffeeProfile = {
  detailLevel?: CoffeeDetailLevel;
  kind?: CoffeeProductKind;
  defaultTemperature?: "hot" | "cold";
  roastLevel?: CoffeeRoastLevel | null;
  tastingNotes?: string[];
  origin?: string;
  processMethod?: CoffeeProcessMethod | null;
  beanVariety?: string;
  flavorProfile?: CoffeeFlavorProfile;
};

export const COFFEE_ROAST_OPTIONS: Array<{ value: CoffeeRoastLevel; label: string }> = [
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "medium_dark", label: "Medium-dark" },
  { value: "dark", label: "Dark" },
];

export const COFFEE_PROCESS_OPTIONS: Array<{ value: CoffeeProcessMethod; label: string }> = [
  { value: "washed", label: "Washed" },
  { value: "natural", label: "Natural" },
  { value: "honey", label: "Honey" },
  { value: "other", label: "Other" },
];

export const COFFEE_TASTING_NOTE_SUGGESTIONS = [
  "Chocolate",
  "Citrus",
  "Caramel",
  "Berry",
  "Floral",
  "Nutty",
  "Spice",
  "Honey",
  "Stone fruit",
  "Tropical",
];

export function emptyCoffeeProfile(): CoffeeProfile {
  return {
    detailLevel: "simple",
    kind: "drink",
    tastingNotes: [],
    flavorProfile: {},
  };
}

export function parseCoffeeProfile(raw: unknown): CoffeeProfile {
  if (!raw || typeof raw !== "object") return emptyCoffeeProfile();
  const row = raw as Record<string, unknown>;
  const flavorRaw =
    row.flavorProfile && typeof row.flavorProfile === "object"
      ? (row.flavorProfile as Record<string, unknown>)
      : {};

  const clampIntensity = (v: unknown): FlavorIntensity | undefined => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n < 1 || n > 5) return undefined;
    return Math.round(n) as FlavorIntensity;
  };

  const tastingNotes = Array.isArray(row.tastingNotes)
    ? row.tastingNotes
        .filter((n): n is string => typeof n === "string")
        .map((n) => n.trim())
        .filter(Boolean)
    : [];

  const kind = row.kind === "retail_beans" ? "retail_beans" : "drink";
  const defaultTemperature =
    row.defaultTemperature === "hot" || row.defaultTemperature === "cold"
      ? row.defaultTemperature
      : undefined;

  const roastLevel = COFFEE_ROAST_OPTIONS.some((o) => o.value === row.roastLevel)
    ? (row.roastLevel as CoffeeRoastLevel)
    : null;

  const processMethod = COFFEE_PROCESS_OPTIONS.some((o) => o.value === row.processMethod)
    ? (row.processMethod as CoffeeProcessMethod)
    : null;

  const detailLevel: CoffeeDetailLevel =
    row.detailLevel === "advanced" ? "advanced" : "simple";

  return {
    detailLevel,
    kind,
    defaultTemperature,
    roastLevel,
    tastingNotes,
    origin: typeof row.origin === "string" ? row.origin.trim() : "",
    processMethod,
    beanVariety: typeof row.beanVariety === "string" ? row.beanVariety.trim() : "",
    flavorProfile: {
      acidity: clampIntensity(flavorRaw.acidity),
      body: clampIntensity(flavorRaw.body),
      sweetness: clampIntensity(flavorRaw.sweetness),
    },
  };
}

export function coffeeProfileHasDisplay(profile: CoffeeProfile): boolean {
  if (profile.detailLevel !== "advanced") return false;
  return Boolean(
    profile.roastLevel ||
      profile.tastingNotes?.length ||
      profile.origin ||
      profile.processMethod ||
      profile.beanVariety ||
      profile.flavorProfile?.acidity ||
      profile.flavorProfile?.body ||
      profile.flavorProfile?.sweetness,
  );
}

export function roastLevelLabel(level: CoffeeRoastLevel): string {
  return COFFEE_ROAST_OPTIONS.find((o) => o.value === level)?.label ?? level;
}

export function processMethodLabel(method: CoffeeProcessMethod): string {
  return COFFEE_PROCESS_OPTIONS.find((o) => o.value === method)?.label ?? method;
}
