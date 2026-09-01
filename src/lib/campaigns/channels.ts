export type CampaignChannel = "banner" | "whatsapp" | "sms" | "auto";

export const CAMPAIGN_CHANNELS: {
  id: CampaignChannel;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "banner",
    label: "Storefront banner",
    description: "Promo strip on the diner menu when they scan the table QR.",
    icon: "view_carousel",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Broadcast or journey message to opted-in members.",
    icon: "chat",
  },
  {
    id: "sms",
    label: "SMS",
    description: "Text message blast to members with a phone number on file.",
    icon: "sms",
  },
];

export function campaignChannelLabel(channel: string): string {
  return CAMPAIGN_CHANNELS.find((c) => c.id === channel)?.label ?? channel;
}
