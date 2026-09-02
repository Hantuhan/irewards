import type { CampaignWorkflow } from "@/lib/campaigns/workflow-spec";
import type { CampaignTemplateSummary } from "@/lib/whatsapp/template-spec";

export type Campaign = {
  id: string;
  name: string;
  channel: string;
  channelLabel: string;
  status: string;
  reach: number;
  conversion: string;
  messageBody: string | null;
  bannerTitle: string | null;
  bannerText: string | null;
  bannerImageUrl: string | null;
  linkUrl: string | null;
  createdAt: string | null;
  /** Workflow trigger; "manual" campaigns are sent with the Send broadcast button. */
  triggerType?: string | null;
  /** Set when the system paused the campaign (e.g. Meta paused its template). */
  statusReason?: string | null;
  /** Normalised trigger / conditions / actions graph edited in the builder. */
  workflow?: CampaignWorkflow | null;
  /** Meta template review state — WhatsApp campaigns only. */
  whatsappTemplate?: CampaignTemplateSummary | null;
};
