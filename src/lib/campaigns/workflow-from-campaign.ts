import type { Campaign } from "@/components/admin/campaigns/types";
import {
  asWhatsAppTemplate,
  asWorkflow,
  type CampaignWorkflow,
} from "@/lib/campaigns/workflow-spec";

const OPT_OUT_LINE = /\s*Reply STOP to opt out\.?\s*$/i;

/**
 * The workflow a campaign opens with in the builder. Campaigns created before
 * the builder existed only have the flat message / banner columns, so seed the
 * default workflow's action from those instead of showing an empty step.
 */
export function workflowFromCampaign(campaign: Campaign): CampaignWorkflow {
  const workflow = asWorkflow(campaign.workflow, campaign.channel);

  for (const action of workflow.actions) {
    if (action.type === "send_whatsapp") {
      const template = asWhatsAppTemplate(action.config.template);
      if (!template.body.trim() && campaign.messageBody?.trim()) {
        action.config.template = {
          ...template,
          body: campaign.messageBody.replace(OPT_OUT_LINE, "").trim(),
          includeOptOut: OPT_OUT_LINE.test(campaign.messageBody),
        };
      }
    }
    if (action.type === "send_sms" && !String(action.config.body ?? "").trim() && campaign.messageBody) {
      action.config.body = campaign.messageBody.replace(OPT_OUT_LINE, "").trim();
    }
    if (action.type === "show_banner" && !String(action.config.title ?? "").trim()) {
      action.config.title = campaign.bannerTitle ?? "";
      action.config.text = campaign.bannerText ?? "";
      action.config.imageUrl = campaign.bannerImageUrl;
      action.config.linkUrl = campaign.linkUrl ?? "";
    }
  }

  return workflow;
}
