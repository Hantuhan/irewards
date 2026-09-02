import { asWorkflow, validateWorkflow } from "@/lib/campaigns/workflow-spec";
import { getLatestTemplateForCampaign } from "@/lib/db/whatsapp-template-repository";
import { updateCampaign, updateCampaignStatus } from "@/lib/db/merchant-repository";
import type { CampaignRow } from "@/lib/db/types";
import { getCampaignById } from "@/lib/services/campaign-send";
import { isTemplateSendable } from "@/lib/whatsapp/template-spec";
import { summarizeTemplate } from "@/lib/whatsapp/templates";

export class CampaignStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignStatusError";
  }
}

/**
 * Why a campaign cannot go live right now, or null when it can. Shared by the
 * dashboard API and the AI assistant so both enforce the same rules: a
 * complete workflow, and a Meta-approved template for WhatsApp copy.
 */
export async function goLiveBlocker(
  campaign: CampaignRow,
  overrides: { workflow?: unknown; messageBody?: string | null } = {},
): Promise<string | null> {
  const issues = validateWorkflow(
    asWorkflow(overrides.workflow ?? campaign.workflow, campaign.channel),
    campaign.channel,
  );
  if (issues.length > 0) return `Fix the workflow before going live: ${issues[0]}`;

  if (campaign.channel === "whatsapp") {
    const latest = await getLatestTemplateForCampaign(campaign.id);
    const messageBody =
      overrides.messageBody !== undefined ? overrides.messageBody : campaign.message_body;
    if (!isTemplateSendable(summarizeTemplate(latest, messageBody))) {
      return "This WhatsApp campaign can't go live until Meta approves its message template. Submit it for approval in the workflow builder.";
    }
  }
  return null;
}

/** Sets a campaign live or paused, enforcing the go-live rules. */
export async function setCampaignStatus(
  merchantId: string,
  campaignId: string,
  status: CampaignRow["status"],
): Promise<CampaignRow> {
  const campaign = await getCampaignById(merchantId, campaignId);
  if (!campaign) throw new CampaignStatusError("Campaign not found");

  if (status === "active") {
    const blocker = await goLiveBlocker(campaign);
    if (blocker) throw new CampaignStatusError(blocker);
  }
  const updated = await updateCampaignStatus(merchantId, campaignId, status);
  return updated.status_reason ? updateCampaign(merchantId, campaignId, { status_reason: null }) : updated;
}
