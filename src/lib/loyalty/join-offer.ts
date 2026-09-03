import { FIRST_JOIN_BONUS_POINTS } from "@/lib/loyalty/points";
import type { CampaignRow } from "@/lib/db/types";
import {
  asWhatsAppTemplate,
  asWorkflow,
  type CampaignNode,
} from "@/lib/campaigns/workflow-spec";

export type JoinOffer = {
  /** Customer-facing headline on thank-you (never internal campaign names). */
  headline: string;
  /** Short supporting pitch. */
  subtitle: string;
  /** Compact offer chip, e.g. "+50 pts" or "20% off". */
  badge: string;
  /** Primary button label. */
  ctaLabel: string;
  campaignId: string | null;
  campaignName: string | null;
};

const DEFAULT_HEADLINE = "Don't leave empty-handed";
const DEFAULT_SUBTITLE =
  "Join free on WhatsApp in 10 seconds — unlock points, stamps, and member-only drops.";
const DEFAULT_CTA = "Join free on WhatsApp";
const OPT_OUT_LINE = /\s*Reply STOP to opt out\.?\s*$/i;
const PLACEHOLDER = /\{\s*[\w.]+\s*\}/g;

/** Internal / ops campaign titles that must never show to diners. */
const INTERNAL_NAME =
  /\b(churn|win[- ]?back|retention|broadcast|test|draft|automation|workflow|segment|nudge|drip)\b/i;

const WELCOME_TRIGGERS = new Set(["member_joined", "first_visit"]);

function allActions(campaign: CampaignRow): CampaignNode[] {
  const workflow = asWorkflow(campaign.workflow, campaign.channel);
  return [...workflow.actions, ...workflow.elseActions];
}

function whatsappBody(campaign: CampaignRow, actions: CampaignNode[]): string {
  const send = actions.find((a) => a.type === "send_whatsapp");
  if (send) {
    const body = asWhatsAppTemplate(send.config.template).body.trim();
    if (body) return body;
  }
  return (campaign.message_body ?? "").trim();
}

/** First readable sentence from campaign copy — no template vars / opt-out. */
export function pitchFromMessage(body: string): string | null {
  const cleaned = body
    .replace(OPT_OUT_LINE, "")
    .replace(PLACEHOLDER, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim() ?? cleaned;
  if (sentence.length <= 120) return sentence;
  return `${sentence.slice(0, 117).trimEnd()}…`;
}

function badgeFromActions(actions: CampaignNode[], fallbackPoints: number): string {
  const voucher = actions.find((a) => a.type === "issue_voucher");
  if (voucher) {
    const pct = Number(voucher.config.discountPercent ?? 20);
    if (Number.isFinite(pct) && pct > 0) return `${Math.round(pct)}% off`;
  }

  const award = actions.find((a) => a.type === "award_points");
  if (award) {
    const pts = Number(award.config.points ?? 0);
    if (Number.isFinite(pts) && pts > 0) return `+${Math.round(pts)} pts`;
  }

  const pts = Math.max(1, Math.round(fallbackPoints));
  return pts === 1 ? "+1 pt" : `+${pts} pts`;
}

function salesHeadline(badge: string, merchantName?: string | null): string {
  const cafe = merchantName?.trim();
  const pct = badge.match(/(\d+)\s*%\s*off/i);
  if (pct) {
    return cafe
      ? `Get ${pct[1]}% off your next visit at ${cafe}`
      : `Get ${pct[1]}% off your next visit`;
  }
  const pts = badge.match(/\+(\d+)\s*pts?/i);
  if (pts) {
    return `Claim ${pts[1]} free points — join in seconds`;
  }
  return cafe ? `Become a ${cafe} member — free` : DEFAULT_HEADLINE;
}

function salesSubtitle(pitch: string | null, badge: string): string {
  if (pitch && pitch.length > 8 && !INTERNAL_NAME.test(pitch)) {
    return pitch;
  }
  if (/\d+\s*%\s*off/i.test(badge)) {
    return "Join free on WhatsApp now. Your welcome gift unlocks the moment you send the message.";
  }
  if (/\+\d+\s*pts?/i.test(badge)) {
    return "Free to join. Points land on your WhatsApp membership — use them next time you scan the table.";
  }
  return DEFAULT_SUBTITLE;
}

/**
 * Prefer an active WhatsApp welcome journey (`member_joined` / `first_visit`),
 * then any active campaign whose name looks like a welcome series.
 * Never pick churn / retention journeys for the post-pay join card.
 */
export function pickWelcomeCampaign(campaigns: CampaignRow[]): CampaignRow | null {
  const active = campaigns.filter(
    (c) =>
      c.status === "active" &&
      (c.channel === "whatsapp" || c.channel === "auto") &&
      !INTERNAL_NAME.test(c.name),
  );
  if (active.length === 0) return null;

  const byTrigger = active.find((c) => {
    const trigger =
      c.trigger_type ?? asWorkflow(c.workflow, c.channel).trigger.type;
    return WELCOME_TRIGGERS.has(trigger);
  });
  if (byTrigger) return byTrigger;

  const byName = active.find((c) => /welcome|join|first.?visit|member.?gift/i.test(c.name));
  return byName ?? null;
}

/**
 * Thank-you join CTA copy — always diner-facing sales language.
 * Campaign data only supplies offer badge + optional pitch; never raw ops names.
 */
export function buildJoinOffer(input: {
  campaign: CampaignRow | null;
  /** Base-level welcome points when the campaign has no award/voucher. */
  fallbackWelcomePoints?: number;
  merchantName?: string | null;
}): JoinOffer {
  const fallbackPoints =
    input.fallbackWelcomePoints && input.fallbackWelcomePoints > 0
      ? input.fallbackWelcomePoints
      : FIRST_JOIN_BONUS_POINTS;

  if (!input.campaign) {
    const badge = badgeFromActions([], fallbackPoints);
    return {
      headline: salesHeadline(badge, input.merchantName),
      subtitle: salesSubtitle(null, badge),
      badge,
      ctaLabel: DEFAULT_CTA,
      campaignId: null,
      campaignName: null,
    };
  }

  const actions = allActions(input.campaign);
  const badge = badgeFromActions(actions, fallbackPoints);
  const pitch = pitchFromMessage(whatsappBody(input.campaign, actions));
  const name = input.campaign.name.trim();

  return {
    headline: salesHeadline(badge, input.merchantName),
    subtitle: salesSubtitle(pitch, badge),
    badge,
    ctaLabel: /%\s*off/i.test(badge)
      ? `Claim ${badge} on WhatsApp`
      : /\+\d+/i.test(badge)
        ? `Claim ${badge} on WhatsApp`
        : DEFAULT_CTA,
    campaignId: input.campaign.id,
    campaignName: name || null,
  };
}
