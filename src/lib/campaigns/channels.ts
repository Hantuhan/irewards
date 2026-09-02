export type CampaignChannel = "banner" | "whatsapp" | "sms" | "auto";

/** Channels merchants can create today. SMS is kept in the type for legacy rows only. */
export const CAMPAIGN_CHANNELS: {
  id: Exclude<CampaignChannel, "auto" | "sms">;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "banner",
    label: "Menu promo photo",
    description: "Promo photo at the top of the table menu when someone scans the QR.",
    icon: "view_carousel",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Message to members who agreed to hear from you.",
    icon: "chat",
  },
];

export function campaignChannelLabel(channel: string): string {
  if (channel === "auto") return "Automated";
  if (channel === "sms") return "SMS (paused)";
  return CAMPAIGN_CHANNELS.find((c) => c.id === channel)?.label ?? channel;
}

/** True when a campaign can still be created / edited as a messaging channel. */
export function isActiveCampaignChannel(channel: string): channel is "banner" | "whatsapp" {
  return channel === "banner" || channel === "whatsapp";
}
