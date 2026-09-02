export type MenuBadge = {
  id: string;
  label: string;
  icon: string;
};

export const BADGE_ICON_OPTIONS = [
  "restaurant",
  "trending_up",
  "schedule",
  "star",
  "local_fire_department",
  "eco",
  "favorite",
  "sell",
  "verified",
] as const;

export const DEFAULT_MENU_BADGES: MenuBadge[] = [
  { id: "chef_recommended", label: "Chef Recommended", icon: "restaurant" },
  { id: "best_selling", label: "Best Selling", icon: "trending_up" },
  { id: "limited_time_offer", label: "Limited Time Offer", icon: "schedule" },
];

const LEGACY_ID_MAP: Record<string, string> = {
  chef_recommend: "chef_recommended",
  bestseller: "best_selling",
};

export function parseMenuBadges(raw: unknown): MenuBadge[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_MENU_BADGES];

  const parsed: MenuBadge[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const icon = typeof row.icon === "string" ? row.icon.trim() : "sell";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    parsed.push({ id, label, icon });
  }

  return parsed.length > 0 ? parsed : [...DEFAULT_MENU_BADGES];
}

export function badgeCatalogMap(badges: MenuBadge[]): Map<string, MenuBadge> {
  return new Map(badges.map((b) => [b.id, b]));
}

export function resolveBadge(id: string, catalog: MenuBadge[]): MenuBadge | null {
  const normalized = LEGACY_ID_MAP[id] ?? id;
  return catalog.find((b) => b.id === normalized) ?? null;
}

export function badgeLabel(id: string, catalog: MenuBadge[]): string {
  return resolveBadge(id, catalog)?.label ?? id.replace(/_/g, " ");
}

export function badgeIcon(id: string, catalog: MenuBadge[]): string {
  return resolveBadge(id, catalog)?.icon ?? "sell";
}

export function normalizeSpecialTags(tags: string[], catalog: MenuBadge[] = DEFAULT_MENU_BADGES): string[] {
  const allowed = new Set(catalog.map((b) => b.id));
  return [
    ...new Set(
      tags
        .map((t) => LEGACY_ID_MAP[t] ?? t)
        .filter((t) => allowed.has(t)),
    ),
  ];
}

export function slugifyBadgeId(label: string): string {
  const base =
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "badge";
  return `custom_${base}_${Date.now().toString(36)}`;
}

export function sanitizeMenuBadges(badges: MenuBadge[]): MenuBadge[] {
  return parseMenuBadges(badges).slice(0, 12);
}

// Back-compat re-exports
export const MENU_SPECIAL_TAGS = DEFAULT_MENU_BADGES;
export type MenuSpecialTagId = string;
export function specialTagLabel(id: string, catalog?: MenuBadge[]): string {
  return catalog ? badgeLabel(id, catalog) : badgeLabel(id, DEFAULT_MENU_BADGES);
}
export function specialTagIcon(id: string, catalog?: MenuBadge[]): string {
  return catalog ? badgeIcon(id, catalog) : badgeIcon(id, DEFAULT_MENU_BADGES);
}
