import { createInsforgeAdmin } from "@/lib/insforge/client";
import type { WhatsAppTemplateRow, WhatsAppTemplateStatus } from "@/lib/db/types";

function db() {
  return createInsforgeAdmin().database;
}

export async function createWhatsAppTemplate(input: {
  merchantId: string;
  campaignId: string | null;
  name: string;
  language: string;
  category?: WhatsAppTemplateRow["category"];
  bodyText: string;
  variables: string[];
  headerImageUrl: string | null;
  components: unknown[];
  provider: WhatsAppTemplateRow["provider"];
}): Promise<WhatsAppTemplateRow> {
  const { data, error } = await db()
    .from("whatsapp_templates")
    .insert([
      {
        merchant_id: input.merchantId,
        campaign_id: input.campaignId,
        name: input.name,
        language: input.language,
        category: input.category ?? "MARKETING",
        body_text: input.bodyText,
        variables: input.variables,
        header_image_url: input.headerImageUrl,
        components: input.components,
        provider: input.provider,
        status: "draft",
      },
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as WhatsAppTemplateRow;
}

export async function updateWhatsAppTemplate(
  id: string,
  patch: Partial<
    Pick<
      WhatsAppTemplateRow,
      | "meta_template_id"
      | "status"
      | "rejection_reason"
      | "submitted_at"
      | "reviewed_at"
      | "status_checked_at"
      | "category"
      | "quality_rating"
    >
  >,
): Promise<WhatsAppTemplateRow> {
  const { data, error } = await db()
    .from("whatsapp_templates")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as WhatsAppTemplateRow;
}

export async function getWhatsAppTemplateById(
  merchantId: string,
  id: string,
): Promise<WhatsAppTemplateRow | null> {
  const { data, error } = await db()
    .from("whatsapp_templates")
    .select("*")
    .eq("id", id)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as WhatsAppTemplateRow | null) ?? null;
}

/** Newest submission for a campaign — the one the UI and the sender consult. */
export async function getLatestTemplateForCampaign(
  campaignId: string,
): Promise<WhatsAppTemplateRow | null> {
  const { data, error } = await db()
    .from("whatsapp_templates")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as WhatsAppTemplateRow | null) ?? null;
}

export async function countTemplatesForCampaign(campaignId: string): Promise<number> {
  const { data, error } = await db()
    .from("whatsapp_templates")
    .select("id")
    .eq("campaign_id", campaignId);

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/** Latest submission per campaign for a merchant, keyed by campaign id. */
export async function listLatestTemplatesByCampaign(
  merchantId: string,
): Promise<Map<string, WhatsAppTemplateRow>> {
  const { data, error } = await db()
    .from("whatsapp_templates")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const latest = new Map<string, WhatsAppTemplateRow>();
  for (const row of (data ?? []) as WhatsAppTemplateRow[]) {
    if (row.campaign_id && !latest.has(row.campaign_id)) latest.set(row.campaign_id, row);
  }
  return latest;
}

export async function listTemplatesByStatus(
  status: WhatsAppTemplateStatus,
  limit = 100,
): Promise<WhatsAppTemplateRow[]> {
  const { data, error } = await db()
    .from("whatsapp_templates")
    .select("*")
    .eq("status", status)
    .order("submitted_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as WhatsAppTemplateRow[];
}

/** Meta webhooks identify templates by id (and name+language as a fallback). */
export async function findTemplateByMetaId(
  metaTemplateId: string | null,
  fallback?: { name: string; language: string },
): Promise<WhatsAppTemplateRow | null> {
  if (metaTemplateId) {
    const { data, error } = await db()
      .from("whatsapp_templates")
      .select("*")
      .eq("meta_template_id", metaTemplateId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as WhatsAppTemplateRow;
  }

  if (fallback) {
    const { data, error } = await db()
      .from("whatsapp_templates")
      .select("*")
      .eq("name", fallback.name)
      .eq("language", fallback.language)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WhatsAppTemplateRow | null) ?? null;
  }

  return null;
}

/** Approved templates not re-checked with Meta in the last day (quality pauses arrive late). */
export async function listStaleApprovedTemplates(limit = 50): Promise<WhatsAppTemplateRow[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db()
    .from("whatsapp_templates")
    .select("*")
    .eq("status", "approved")
    .eq("provider", "meta")
    .or(`status_checked_at.is.null,status_checked_at.lt.${since}`)
    .order("status_checked_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as WhatsAppTemplateRow[];
}
