/**
 * WhatsApp template lifecycle against Meta's Business Management API:
 * submit a campaign's copy for review, poll or receive the verdict, and
 * resolve which approved template a send should use.
 */

import type { CampaignRow, MerchantRow, WhatsAppTemplateRow } from "@/lib/db/types";
import {
  countTemplatesForCampaign,
  createWhatsAppTemplate,
  getLatestTemplateForCampaign,
  listStaleApprovedTemplates,
  listTemplatesByStatus,
  updateWhatsAppTemplate,
} from "@/lib/db/whatsapp-template-repository";
import { getMetaAppConfig, graphFetch, isWhatsAppDevMode, MetaApiError } from "@/lib/meta/client";
import { findMetaConfigForMerchant, getMetaConfigForMerchant } from "@/lib/meta/merchant-config";
import { asWhatsAppTemplate, asWorkflow, whatsAppCompliance } from "@/lib/campaigns/workflow-spec";
import { describeBlockers, lintWhatsAppTemplate, type ComplianceReport } from "@/lib/whatsapp/meta-compliance";
import { adminDb } from "@/lib/db/admin";
import {
  buildTemplateComponents,
  statusFromMeta,
  TEMPLATE_LANGUAGE,
  templateMatchesMessage,
  toMetaBody,
  toTemplateName,
  type CampaignTemplateSummary,
  type TemplateToken,
} from "@/lib/whatsapp/template-spec";

export function summarizeTemplate(
  row: WhatsAppTemplateRow | null | undefined,
  currentMessageBody: string | null,
): CampaignTemplateSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    language: row.language,
    status: row.status,
    rejectionReason: row.rejection_reason,
    qualityRating: row.quality_rating ?? null,
    metaTemplateId: row.meta_template_id,
    provider: row.provider,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    statusCheckedAt: row.status_checked_at,
    bodyText: row.body_text,
    matchesCurrentMessage: templateMatchesMessage(row.body_text, currentMessageBody),
  };
}

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

/**
 * Image headers need a media handle from Meta's resumable upload API, not a
 * URL. Two calls: open an upload session on the app, then push the bytes.
 */
async function uploadHeaderImage(imageUrl: string, accessToken: string): Promise<string> {
  const { appId } = getMetaAppConfig();
  if (!appId) {
    throw new Error("META_APP_ID is required to submit templates with an image header");
  }

  const source = await fetch(absoluteUrl(imageUrl));
  if (!source.ok) throw new Error(`Could not fetch header image (${source.status})`);
  const bytes = await source.arrayBuffer();
  const fileType = source.headers.get("content-type")?.split(";")[0] || "image/jpeg";

  const session = await graphFetch<{ id: string }>(`${appId}/uploads`, {
    method: "POST",
    accessToken,
    query: { file_length: String(bytes.byteLength), file_type: fileType },
  });

  const upload = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v21.0"}/${session.id}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      file_offset: "0",
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });
  const result = (await upload.json().catch(() => ({}))) as { h?: string; error?: { message?: string } };
  if (!upload.ok || !result.h) {
    throw new Error(result.error?.message || `Header image upload failed (${upload.status})`);
  }
  return result.h;
}

/**
 * Snapshot the campaign's current copy, create the template on the WABA and
 * request review. Every call creates a new versioned row so the history of
 * what Meta reviewed is kept.
 */
export async function submitCampaignTemplate(
  merchant: MerchantRow,
  campaign: CampaignRow,
): Promise<WhatsAppTemplateRow> {
  if (campaign.channel !== "whatsapp") {
    throw new Error("Only WhatsApp campaigns need Meta template approval");
  }
  const messageBody = campaign.message_body?.trim() ?? "";
  if (!messageBody) throw new Error("Write the WhatsApp message before submitting for approval");

  // Last line of defence: the editor and the AI planner run the same checks,
  // but only this one guarantees Meta never sees copy it would reject.
  const compliance = campaignCompliance(campaign, merchant.name);
  if (!compliance.ok) {
    throw new Error(
      `Meta would reject this message. Change these in the message step, then submit again:\n${describeBlockers(compliance)}`,
    );
  }

  const latest = await getLatestTemplateForCampaign(campaign.id);
  if (latest?.status === "pending" && templateMatchesMessage(latest.body_text, messageBody)) {
    throw new Error("This message is already awaiting Meta review");
  }
  if (latest?.status === "approved" && templateMatchesMessage(latest.body_text, messageBody)) {
    throw new Error("This message is already approved — no resubmission needed");
  }

  const version = (await countTemplatesForCampaign(campaign.id)) + 1;
  const { text: bodyText, variables } = toMetaBody(messageBody);
  const headerImageUrl = campaign.banner_image_url?.trim() || null;
  const dev = isWhatsAppDevMode();

  let headerHandle: string | null = null;
  if (headerImageUrl && !dev) {
    const { accessToken } = await getMetaConfigForMerchant(merchant.id);
    headerHandle = await uploadHeaderImage(headerImageUrl, accessToken);
  }

  const components = buildTemplateComponents({ bodyText, variables, headerHandle });

  const row = await createWhatsAppTemplate({
    merchantId: merchant.id,
    campaignId: campaign.id,
    name: toTemplateName(campaign.name, campaign.id, version),
    language: TEMPLATE_LANGUAGE,
    bodyText: messageBody,
    variables,
    headerImageUrl,
    components,
    provider: dev ? "dev" : "meta",
  });

  const now = new Date().toISOString();

  if (dev) {
    console.info("[whatsapp:dev] template submitted →", row.name, components);
    return updateWhatsAppTemplate(row.id, {
      meta_template_id: `dev-${row.id.slice(0, 8)}`,
      status: "pending",
      submitted_at: now,
      status_checked_at: now,
    });
  }

  try {
    const { wabaId, accessToken } = await getMetaConfigForMerchant(merchant.id);
    const created = await graphFetch<{ id: string; status?: string; category?: string }>(
      `${wabaId}/message_templates`,
      {
        method: "POST",
        accessToken,
        body: {
          name: row.name,
          language: row.language,
          category: row.category,
          allow_category_change: true,
          components,
        },
      },
    );
    return updateWhatsAppTemplate(row.id, {
      meta_template_id: created.id,
      // Approvals belong to the WABA they were granted on, so a template
      // approved for one merchant says nothing about another's.
      waba_id: wabaId,
      status: statusFromMeta(created.status ?? "PENDING"),
      submitted_at: now,
      status_checked_at: now,
      ...(created.category && { category: created.category as WhatsAppTemplateRow["category"] }),
    });
  } catch (error) {
    const message =
      error instanceof MetaApiError ? error.message : error instanceof Error ? error.message : "Meta rejected the request";
    return updateWhatsAppTemplate(row.id, {
      status: "failed",
      rejection_reason: message,
      submitted_at: now,
      status_checked_at: now,
    });
  }
}

/**
 * Meta compliance for a campaign's WhatsApp copy. Prefers the structured
 * template in the workflow; campaigns that predate the builder only have the
 * rendered message_body (which already carries its opt-out line).
 */
export function campaignCompliance(campaign: CampaignRow, merchantName: string): ComplianceReport {
  const workflow = asWorkflow(campaign.workflow, campaign.channel);
  const action = workflow.actions.find((a) => a.type === "send_whatsapp");
  const template = action ? asWhatsAppTemplate(action.config.template) : null;
  if (template && template.body.trim()) return whatsAppCompliance(template, merchantName);
  return lintWhatsAppTemplate({
    body: campaign.message_body ?? "",
    includeOptOut: false,
    merchantName,
  });
}

/** Ask Meta for the current verdict on one template and store it. */
export async function refreshTemplateStatus(row: WhatsAppTemplateRow): Promise<WhatsAppTemplateRow> {
  const now = new Date().toISOString();

  if (row.provider === "dev" || !row.meta_template_id) {
    if (row.status !== "pending") return row;
    // Simulated review so the flow can be exercised locally end to end.
    return updateWhatsAppTemplate(row.id, {
      status: "approved",
      rejection_reason: null,
      reviewed_at: now,
      status_checked_at: now,
    });
  }

  // Poll on the account that owns the template.
  const config = await findMetaConfigForMerchant(row.merchant_id);
  if (!config) return row;

  const remote = await graphFetch<{ status?: string; rejected_reason?: string; category?: string }>(
    row.meta_template_id,
    {
      accessToken: config.accessToken,
      query: { fields: "name,status,category,rejected_reason,language" },
    },
  );

  const status = statusFromMeta(remote.status);
  const changed = status !== row.status;
  const updated = await updateWhatsAppTemplate(row.id, {
    status,
    rejection_reason:
      status === "rejected" && remote.rejected_reason && remote.rejected_reason !== "NONE"
        ? remote.rejected_reason
        : status === "rejected"
          ? row.rejection_reason
          : null,
    ...(changed && status !== "pending" && { reviewed_at: now }),
    status_checked_at: now,
    ...(remote.category && { category: remote.category as WhatsAppTemplateRow["category"] }),
  });
  if (changed) await pauseCampaignsForTemplate(updated, verdictReason(updated));
  return updated;
}

const BLOCKING_STATUSES = new Set<WhatsAppTemplateRow["status"]>(["paused", "disabled", "rejected"]);

/**
 * Meta pulled an approved template (quality pause, disable, late rejection).
 * Pause every live campaign that depends on it and record why, so the
 * merchant sees a reason instead of a trickle of failed sends.
 */
export async function pauseCampaignsForTemplate(row: WhatsAppTemplateRow, reasonText: string) {
  if (!row.campaign_id || !BLOCKING_STATUSES.has(row.status)) return;
  const db = adminDb();
  const { data } = await db
    .from("campaigns")
    .select("id, status")
    .eq("id", row.campaign_id)
    .maybeSingle();
  const campaign = data as { id: string; status: string } | null;
  if (!campaign || campaign.status !== "active") return;

  await db
    .from("campaigns")
    .update({ status: "paused", status_reason: reasonText })
    .eq("id", campaign.id);
}

export function verdictReason(row: WhatsAppTemplateRow): string {
  switch (row.status) {
    case "paused":
      return "Meta paused this message template because of low quality ratings (too many blocks or reports). Revise the copy and submit a new version.";
    case "disabled":
      return "Meta disabled this message template after repeated quality pauses. Write new copy and submit it for approval.";
    case "rejected":
      return `Meta rejected this message template${row.rejection_reason ? ` (${row.rejection_reason})` : ""}. Edit the copy and submit again.`;
    default:
      return "";
  }
}

/** Store Meta's quality score for a template (webhook `message_template_quality_update`). */
export async function recordTemplateQuality(row: WhatsAppTemplateRow, quality: string) {
  await updateWhatsAppTemplate(row.id, {
    quality_rating: quality.toUpperCase(),
    status_checked_at: new Date().toISOString(),
  });
}

/** Cron: poll everything still under review. Webhooks usually get there first. */
export async function refreshPendingTemplates(limit = 50): Promise<{ checked: number; updated: number }> {
  const pending = [
    ...(await listTemplatesByStatus("pending", limit)),
    // Approved templates can be paused later; re-check them once a day.
    ...(await listStaleApprovedTemplates(limit)),
  ];
  let updated = 0;
  for (const row of pending) {
    try {
      const next = await refreshTemplateStatus(row);
      if (next.status !== row.status) updated += 1;
    } catch (error) {
      console.error("Template status refresh failed:", row.name, error);
    }
  }
  return { checked: pending.length, updated };
}

/** Applies a `message_template_status_update` webhook event. */
export async function applyTemplateStatusEvent(
  row: WhatsAppTemplateRow,
  event: { event: string; reason?: string | null },
): Promise<WhatsAppTemplateRow> {
  const status = statusFromMeta(event.event);
  const now = new Date().toISOString();
  const updated = await updateWhatsAppTemplate(row.id, {
    status,
    rejection_reason: status === "rejected" ? event.reason ?? row.rejection_reason : null,
    ...(status !== "pending" && { reviewed_at: now }),
    status_checked_at: now,
  });
  await pauseCampaignsForTemplate(updated, verdictReason(updated));
  return updated;
}

export type ResolvedTemplate = {
  name: string;
  language: string;
  variables: TemplateToken[];
  headerImageUrl: string | null;
};

/**
 * The approved template a send may use for this campaign, or null when the
 * campaign has none / the copy changed since approval.
 */
export async function resolveApprovedTemplate(
  campaignId: string,
  currentMessageBody: string | null,
): Promise<ResolvedTemplate | null> {
  const row = await getLatestTemplateForCampaign(campaignId);
  if (!row || row.status !== "approved") return null;
  if (!templateMatchesMessage(row.body_text, currentMessageBody)) return null;
  return {
    name: row.name,
    language: row.language,
    variables: (row.variables ?? []) as TemplateToken[],
    headerImageUrl: row.header_image_url,
  };
}
