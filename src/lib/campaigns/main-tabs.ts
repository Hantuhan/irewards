/** Tabs on the Campaigns hub. Plain module so server pages can validate `?tab=`. */
export type CampaignsMainTab = "campaigns" | "promos";

export const CAMPAIGNS_MAIN_TABS: { id: CampaignsMainTab; label: string; icon: string }[] = [
  { id: "campaigns", label: "Campaigns", icon: "campaign" },
  { id: "promos", label: "Vouchers", icon: "confirmation_number" },
];

/** Old links (`?tab=bots`, `?tab=automations`, `?tab=retention`, `/automation`) land on Campaigns. */
export function normalizeCampaignsTab(value: unknown): CampaignsMainTab {
  return value === "promos" ? "promos" : "campaigns";
}
