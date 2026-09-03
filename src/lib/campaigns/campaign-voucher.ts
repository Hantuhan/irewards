/**
 * Campaign ↔ voucher coupling.
 *
 * Invariant: if a campaign's workflow has `issue_voucher`, that campaign owns
 * one linked promo code. The code is auto-created (or reactivated) on go-live
 * and again when the workflow fires. Merchants cannot revoke the voucher while
 * the campaign is still active — pause the campaign first (or pause both).
 */

import {
  asWorkflow,
  type CampaignNode,
  type CampaignWorkflow,
} from "@/lib/campaigns/workflow-spec";
import {
  createPromo,
  getPromoByCode,
  getPromoById,
  listPromosForCampaign,
  updatePromo,
} from "@/lib/db/merchant-repository";
import type { CampaignRow, PromoRow } from "@/lib/db/types";
import { getCampaignById } from "@/lib/services/campaign-send";

export class CampaignVoucherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignVoucherError";
  }
}

/** The first `issue_voucher` action in the workflow, if any. */
export function workflowVoucherAction(
  workflow: CampaignWorkflow | unknown,
  channel = "whatsapp",
): CampaignNode | null {
  const wf =
    workflow && typeof workflow === "object" && "trigger" in (workflow as object)
      ? (workflow as CampaignWorkflow)
      : asWorkflow(workflow, channel);
  return (
    wf.actions.find((a) => a.type === "issue_voucher") ??
    wf.elseActions.find((a) => a.type === "issue_voucher") ??
    null
  );
}

/**
 * Short, readable code: voucher-name letters + discount % + campaign id fragment.
 * Stable per campaign so later runs reuse the same promo.
 */
export function campaignVoucherCode(campaign: CampaignRow, action: CampaignNode): string {
  const name =
    String(action.config.name ?? "")
      .replace(/[^a-z]/gi, "")
      .toUpperCase()
      .slice(0, 8) || "PERK";
  const discount = Math.round(Number(action.config.discountPercent ?? 20));
  const short = campaign.id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${name}${discount}${short}`;
}

/**
 * Total redemptions allowed for a campaign voucher. The merchant can set one
 * on the voucher action; otherwise it is uncapped per-campaign but still
 * one-per-member, which is what stops a leaked code being farmed.
 */
export function campaignVoucherUsageLimit(action: CampaignNode): number | null {
  const raw = Number(action.config.usageLimit ?? 0);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
}

function voucherFields(campaign: CampaignRow, action: CampaignNode) {
  const expiryDays = Math.max(1, Number(action.config.expiryDays ?? 14));
  return {
    name: `${String(action.config.name ?? "Campaign perk").trim() || "Campaign perk"} · ${campaign.name}`,
    code: campaignVoucherCode(campaign, action),
    value: Math.min(100, Math.max(1, Number(action.config.discountPercent ?? 20))),
    expiresAt: new Date(Date.now() + expiryDays * 86_400_000).toISOString(),
  };
}

/**
 * Creates the campaign's promo if missing, or reactivates / resyncs it when the
 * merchant revoked it or changed the discount. Always returns the code members
 * should receive.
 */
export async function ensureCampaignVoucher(
  campaign: CampaignRow,
  action: CampaignNode,
): Promise<{ code: string; promo: PromoRow; created: boolean }> {
  const fields = voucherFields(campaign, action);

  // Prefer the promo already linked to this campaign (even if the code string changed).
  const linked = await listPromosForCampaign(campaign.merchant_id, campaign.id);
  const byLink = linked[0] ?? null;
  const byCode = byLink ? null : await getPromoByCode(campaign.merchant_id, fields.code);
  const existing = byLink ?? byCode;

  if (!existing) {
    const promo = await createPromo(campaign.merchant_id, {
      name: fields.name,
      code: fields.code,
      type: "percentage",
      value: fields.value,
      minSpendCents: null,
      expiresAt: fields.expiresAt,
      campaignId: campaign.id,
      // A campaign code goes out to every member on the list at once. Without
      // a cap, one screenshot in a group chat is unlimited free discount.
      perCustomerLimit: 1,
      usageLimit: campaignVoucherUsageLimit(action),
    });
    return { code: fields.code, promo, created: true };
  }

  const needsReactivate = !existing.active;
  const needsLink = existing.campaign_id !== campaign.id;
  const needsValue = Number(existing.value) !== fields.value;
  const needsName = existing.name !== fields.name;

  let promo = existing;
  if (needsReactivate || needsLink || needsValue || needsName) {
    promo = await updatePromo(campaign.merchant_id, existing.id, {
      ...(needsReactivate && { active: true }),
      ...(needsValue && { value: fields.value }),
      ...(needsName && { name: fields.name }),
      ...(needsLink && { campaign_id: campaign.id }),
      // Keep a usable expiry window when reactivating a dead promo.
      ...(needsReactivate && { expires_at: fields.expiresAt }),
    });
  }

  return { code: existing.code?.trim() || fields.code, promo, created: false };
}

/**
 * Before a campaign goes live: if it issues a voucher, the promo must exist and
 * be active. Auto-creates when missing.
 */
export async function ensureCampaignVoucherForGoLive(
  campaign: CampaignRow,
  workflowOverride?: unknown,
): Promise<string | null> {
  const action = workflowVoucherAction(
    workflowOverride ?? campaign.workflow,
    campaign.channel,
  );
  if (!action) return null;
  const { code } = await ensureCampaignVoucher(campaign, action);
  return code;
}

/**
 * Why a promo cannot be deactivated right now, or null when it is safe.
 * Active campaigns that still issue this voucher must be paused first.
 */
export async function promoDeactivateBlocker(
  merchantId: string,
  promoId: string,
): Promise<string | null> {
  const promo = await getPromoById(merchantId, promoId);
  if (!promo) return "Voucher not found";
  if (!promo.campaign_id) return null;

  const campaign = await getCampaignById(merchantId, promo.campaign_id);
  if (!campaign) return null;
  if (campaign.status !== "active") return null;

  const stillIssues = Boolean(workflowVoucherAction(campaign.workflow, campaign.channel));
  if (!stillIssues) return null;

  return (
    `“${promo.code ?? promo.name}” is used by the live campaign “${campaign.name}”. ` +
    `Pause that campaign first (or remove the Issue voucher step), then revoke this code.`
  );
}

/**
 * Pause a live campaign and optionally deactivate its linked voucher in one step.
 * Use when the merchant wants both off together.
 */
export async function pauseCampaignAndVoucher(
  merchantId: string,
  campaignId: string,
  options: { deactivateVoucher?: boolean } = {},
): Promise<{ campaign: CampaignRow; deactivatedPromoIds: string[] }> {
  const { updateCampaignStatus } = await import("@/lib/db/merchant-repository");
  const campaign = await updateCampaignStatus(merchantId, campaignId, "paused");
  const deactivatedPromoIds: string[] = [];

  if (options.deactivateVoucher) {
    const linked = await listPromosForCampaign(merchantId, campaignId);
    for (const promo of linked) {
      if (!promo.active) continue;
      await updatePromo(merchantId, promo.id, { active: false });
      deactivatedPromoIds.push(promo.id);
    }
  }

  return { campaign, deactivatedPromoIds };
}
