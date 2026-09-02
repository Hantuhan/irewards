/** Shared styling for live / active campaigns and promos (Manus-style: soft pills + ring). */
export const CAMPAIGN_ACTIVE = {
  badge: "border border-emerald-300 bg-emerald-50 text-emerald-800",
  card: "ring-2 ring-emerald-500/25 shadow-sm",
  dot: "bg-emerald-500",
  toggle: "border-emerald-600 text-emerald-700",
  text: "text-emerald-700",
} as const;

export function campaignStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Live";
    case "paused":
      return "Paused";
    case "scheduled":
      return "Scheduled";
    case "draft":
      return "Draft";
    default:
      return status;
  }
}

export function campaignStatusBadgeClass(status: string): string {
  if (status === "active") return CAMPAIGN_ACTIVE.badge;
  if (status === "scheduled") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
  return "bg-surface-container-high text-on-surface-variant ring-1 ring-surface-container-highest";
}

export function campaignCardClass(status: string): string {
  return status === "active"
    ? CAMPAIGN_ACTIVE.card
    : "ring-1 ring-surface-container-highest";
}

export function promoActiveToggleClass(active: boolean): string {
  return active ? CAMPAIGN_ACTIVE.toggle : "border-surface-container-highest text-on-surface-variant";
}

export function isCampaignActive(status: string): boolean {
  return status === "active";
}
