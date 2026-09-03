export type SimpleCategoryKind = "juice" | "brunch" | "mains" | "pastries";

export type SimpleCategoryProfile = {
  kind: SimpleCategoryKind;
  detailLevel?: "simple" | "advanced";
  defaults: Record<string, string>;
  notes?: string[];
  serveNote?: string;
};

export function emptySimpleCategoryProfile(
  kind: SimpleCategoryKind,
  defaults: Record<string, string>,
): SimpleCategoryProfile {
  return {
    kind,
    detailLevel: "simple",
    defaults,
    notes: [],
    serveNote: "",
  };
}

export function parseSimpleCategoryProfile(
  kind: SimpleCategoryKind,
  raw: unknown,
  fallbackDefaults: Record<string, string>,
): SimpleCategoryProfile {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawDefaults =
    row.defaults && typeof row.defaults === "object"
      ? (row.defaults as Record<string, unknown>)
      : {};
  const defaults: Record<string, string> = { ...fallbackDefaults };
  for (const [key, value] of Object.entries(rawDefaults)) {
    if (typeof value === "string" && value.trim()) defaults[key] = value.trim();
  }
  const notes = Array.isArray(row.notes)
    ? row.notes.filter((n): n is string => typeof n === "string").map((n) => n.trim()).filter(Boolean)
    : [];

  return {
    kind,
    detailLevel: "simple",
    defaults,
    notes,
    serveNote: typeof row.serveNote === "string" ? row.serveNote.trim() : "",
  };
}

export function simpleCategoryProfileHasDisplay(profile: SimpleCategoryProfile): boolean {
  return Boolean(profile.notes?.length || profile.serveNote);
}
