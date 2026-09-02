import { z } from "zod";
import { createCampaign, listCampaigns, updateMerchant } from "@/lib/db/merchant-repository";
import { getMerchantBySlug } from "@/lib/db/repository";
import { CampaignStatusError, setCampaignStatus } from "@/lib/services/campaign-status";
import { parseJsonFromModel } from "@/lib/ai/deepseek";

export const updatePointsSettingsActionSchema = z.object({
  type: z.literal("update_points_settings"),
  pointsPerRinggit: z.number().positive().optional(),
  pointsRedeemCentsPerPoint: z.number().int().positive().optional(),
  birthdayBonusPoints: z.number().int().min(0).optional(),
  pointsExpiryDays: z.number().int().min(0).optional(),
});

export const createCampaignActionSchema = z.object({
  type: z.literal("create_campaign"),
  name: z.string().min(1).max(120),
  channel: z.enum(["banner", "whatsapp"]),
  messageBody: z.string().max(2000).nullable().optional(),
  bannerTitle: z.string().max(200).nullable().optional(),
  bannerText: z.string().max(500).nullable().optional(),
  status: z.enum(["draft", "active"]).default("draft"),
});

export const setCampaignStatusActionSchema = z.object({
  type: z.literal("set_campaign_status"),
  /** Campaign name, matched case-insensitively (partial match allowed). */
  campaignName: z.string().min(1).max(120),
  status: z.enum(["active", "paused"]),
});

export const agentActionSchema = z.discriminatedUnion("type", [
  updatePointsSettingsActionSchema,
  createCampaignActionSchema,
  setCampaignStatusActionSchema,
]);

export type AgentAction = z.infer<typeof agentActionSchema>;

export type PendingAgentAction = {
  id: string;
  summary: string;
  action: AgentAction;
};

const modelResponseSchema = z.object({
  reply: z.string().min(1),
  action: agentActionSchema.nullable().optional(),
});

export function describeAgentAction(action: AgentAction, currency = "MYR"): string {
  switch (action.type) {
    case "update_points_settings": {
      const parts: string[] = [];
      if (action.pointsPerRinggit !== undefined) {
        parts.push(`earn rate → ${action.pointsPerRinggit} pts/${currency === "SGD" ? "SGD" : "RM"}`);
      }
      if (action.pointsRedeemCentsPerPoint !== undefined) {
        parts.push(`redeem value → ${action.pointsRedeemCentsPerPoint} sen/pt`);
      }
      if (action.birthdayBonusPoints !== undefined) {
        parts.push(`birthday bonus → ${action.birthdayBonusPoints} pts`);
      }
      if (action.pointsExpiryDays !== undefined) {
        parts.push(
          action.pointsExpiryDays === 0
            ? "point expiry → never"
            : `point expiry → ${action.pointsExpiryDays} days`,
        );
      }
      return `Update points program: ${parts.join(", ")}`;
    }
    case "create_campaign":
      return `Create ${action.channel} campaign "${action.name}" (${action.status})`;
    case "set_campaign_status":
      return action.status === "active"
        ? `Set campaign "${action.campaignName}" live`
        : `Pause campaign "${action.campaignName}"`;
    default:
      return "Apply dashboard change";
  }
}

export function parseAgentModelResponse(raw: string): {
  reply: string;
  pendingAction: PendingAgentAction | null;
} {
  const parsed = parseJsonFromModel<unknown>(raw);
  if (!parsed) {
    return { reply: raw, pendingAction: null };
  }

  const result = modelResponseSchema.safeParse(parsed);
  if (!result.success) {
    return { reply: raw, pendingAction: null };
  }

  const { reply, action } = result.data;
  if (!action) {
    return { reply, pendingAction: null };
  }

  return {
    reply,
    pendingAction: {
      id: crypto.randomUUID(),
      summary: describeAgentAction(action),
      action,
    },
  };
}

const ACTION_INTENT =
  /\b(set|change|update|create|enable|disable|turn on|turn off|make|switch|adjust|increase|decrease|raise|lower|go live|activate|launch)\b/i;

export function messageRequestsAction(message: string): boolean {
  return ACTION_INTENT.test(message);
}

/** Rule-based action proposals when DeepSeek is unavailable. */
export function detectFallbackAction(
  message: string,
  _current: { pointsPerRinggit: number; pointsRedeemCentsPerPoint: number },
): PendingAgentAction | null {
  if (!messageRequestsAction(message)) return null;

  const lower = message.toLowerCase();

  const ptsMatch =
    lower.match(/(?:earn|points?\s*(?:per|\/)\s*(?:rm|ringgit|sgd)?|pts\s*(?:per|\/)\s*rm)\s*(?:to|=)?\s*(\d+(?:\.\d+)?)/i) ??
    lower.match(/(\d+(?:\.\d+)?)\s*pts?\s*(?:per|\/)\s*rm/i);
  const redeemMatch = lower.match(/redeem(?:\s*value)?\s*(?:to|=)?\s*(\d+)\s*sen/i);

  if (ptsMatch || redeemMatch) {
    const action = updatePointsSettingsActionSchema.parse({
      type: "update_points_settings",
      ...(ptsMatch ? { pointsPerRinggit: Number(ptsMatch[1]) } : {}),
      ...(redeemMatch ? { pointsRedeemCentsPerPoint: Number(redeemMatch[1]) } : {}),
    });
    return {
      id: crypto.randomUUID(),
      summary: describeAgentAction(action),
      action,
    };
  }

  const campaignMatch = lower.match(
    /create\s+(?:a\s+)?(whatsapp|banner)\s+campaign(?:\s+(?:called|named)\s+["']?([^"']+)["']?)?/i,
  );
  if (campaignMatch) {
    const action = createCampaignActionSchema.parse({
      type: "create_campaign",
      channel: campaignMatch[1].toLowerCase() as "whatsapp" | "banner",
      name: campaignMatch[2]?.trim() || "New campaign",
      status: lower.includes("live") || lower.includes("active") ? "active" : "draft",
    });
    return {
      id: crypto.randomUUID(),
      summary: describeAgentAction(action),
      action,
    };
  }

  const statusMatch = lower.match(
    /(?:enable|turn on|go live with|activate|set live|pause|turn off|disable|stop)\s+(?:the\s+)?(?:campaign\s+)?["']?([^"'.,]+?)["']?(?:\s+campaign)?(?:\s+live)?$/i,
  );
  if (statusMatch) {
    const wantsPause = /\b(pause|turn off|disable|stop)\b/i.test(lower);
    const action = setCampaignStatusActionSchema.parse({
      type: "set_campaign_status",
      campaignName: statusMatch[1].trim(),
      status: wantsPause ? "paused" : "active",
    });
    return {
      id: crypto.randomUUID(),
      summary: describeAgentAction(action),
      action,
    };
  }
  return null;
}

export async function executeAgentAction(
  merchantSlug: string,
  action: AgentAction,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const merchant = await getMerchantBySlug(merchantSlug);
  if (!merchant) {
    return { ok: false, error: "Merchant not found" };
  }

  try {
    switch (action.type) {
      case "update_points_settings": {
        const fields = Object.fromEntries(
          Object.entries({
            points_per_ringgit: action.pointsPerRinggit,
            points_redeem_cents_per_point: action.pointsRedeemCentsPerPoint,
            birthday_bonus_points: action.birthdayBonusPoints,
            points_expiry_days: action.pointsExpiryDays,
          }).filter(([, v]) => v !== undefined),
        );
        if (Object.keys(fields).length === 0) {
          return { ok: false, error: "No points fields to update" };
        }
        await updateMerchant(merchant.id, fields);
        return { ok: true, message: `Points program updated — ${describeAgentAction(action, merchant.currency)}.` };
      }
      case "create_campaign": {
        const campaign = await createCampaign(merchant.id, {
          name: action.name,
          channel: action.channel,
          status: action.status,
          messageBody: action.messageBody ?? null,
          bannerTitle: action.bannerTitle ?? null,
          bannerText: action.bannerText ?? null,
          linkUrl: null,
        });
        return {
          ok: true,
          message: `Campaign "${campaign.name}" created as ${action.status}. View it in **Campaigns**.`,
        };
      }
      case "set_campaign_status": {
        const wanted = action.campaignName.trim().toLowerCase();
        const campaigns = await listCampaigns(merchant.id);
        const target =
          campaigns.find((c) => c.name.toLowerCase() === wanted) ??
          campaigns.find((c) => c.name.toLowerCase().includes(wanted));
        if (!target) {
          return { ok: false, error: `No campaign called "${action.campaignName}" — check the name in **Campaigns**.` };
        }
        try {
          await setCampaignStatus(merchant.id, target.id, action.status);
        } catch (err) {
          if (err instanceof CampaignStatusError) return { ok: false, error: err.message };
          throw err;
        }
        return {
          ok: true,
          message:
            action.status === "active"
              ? `**${target.name}** is live. Track it under **Campaigns**.`
              : `**${target.name}** is paused.`,
        };
      }
      default:
        return { ok: false, error: "Unsupported action" };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Action failed",
    };
  }
}

export const ACTION_PROPOSAL_RULES = `
## Proposing dashboard changes (mandatory)
When the merchant asks you to SET, CHANGE, CREATE, ENABLE, DISABLE, or GO LIVE with something in iRewards, you MUST respond with **JSON only** (no markdown fences):
{"reply":"Your explanation in markdown","action":{...} or null}

Rules:
- NEVER claim you already applied a change. The merchant must tap **Confirm** first.
- Put the human explanation in "reply". Put the machine payload in "action".
- If only answering a question (no change requested), set "action" to null.
- Only propose actions you can express with the schemas below.

### Action: update_points_settings
{"type":"update_points_settings","pointsPerRinggit":0.15,"pointsRedeemCentsPerPoint":10,"birthdayBonusPoints":50,"pointsExpiryDays":0}
Include only fields being changed.

### Action: create_campaign
{"type":"create_campaign","name":"Weekend promo","channel":"whatsapp","messageBody":"...","status":"draft"}
channel: banner | whatsapp. Default status draft unless they ask to go live.

### Action: set_campaign_status
{"type":"set_campaign_status","campaignName":"Review nudge","status":"active"}
status: active | paused. Automated journeys (review nudge, win-back, bounce-back, welcome) are campaigns too. WhatsApp campaigns need Meta template approval before they can go live — say so if it fails.
`;
