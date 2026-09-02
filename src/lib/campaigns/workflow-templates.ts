import type { CampaignChannel } from "@/lib/campaigns/channels";
import {
  createNode,
  defaultWhatsAppTemplate,
  type CampaignNode,
  type CampaignWorkflow,
  type NodeConfig,
} from "@/lib/campaigns/workflow-spec";
import {
  resolveLocalized,
  type LocalizedMap,
  type ProgramLanguage,
} from "@/lib/i18n/program-locale";

export type TemplateCategory = "retention" | "acquisition" | "loyalty";

export type CampaignWorkflowTemplate = {
  id: string;
  category: TemplateCategory;
  title: string;
  description: string;
  icon: string;
  channel: Exclude<CampaignChannel, "auto">;
  defaultName: string;
  /** English fallback; prefer `defaultMessageI18n` when building workflows. */
  defaultMessage: string;
  /** EN / ZH / MS copy for the phone preview language switcher. */
  defaultMessageI18n?: LocalizedMap;
  triggerLabel: string;
  delayLabel?: string;
  voucherHint?: string;
  /** Trigger + steps the builder opens with. Fresh node ids on every call. */
  workflow: (lang?: ProgramLanguage) => CampaignWorkflow;
};

function node(type: string, config: NodeConfig = {}): CampaignNode {
  const created = createNode(type);
  return { ...created, config: { ...created.config, ...config } };
}

function whatsapp(body: string): CampaignNode {
  return node("send_whatsapp", {
    template: { ...defaultWhatsAppTemplate(), body, includeOptOut: true },
  });
}

/** Templates carry "Reply STOP to opt out." in copy; the template flag adds it, so strip it here. */
function stripOptOut(body: string): string {
  return body.replace(/\s*Reply STOP to opt out\.?$/i, "").trim();
}

function workflowOf(
  trigger: CampaignNode,
  actions: CampaignNode[],
  conditions: CampaignNode[] = [node("marketing_opted_in")],
): CampaignWorkflow {
  return { version: 1, trigger, conditions, actions, elseActions: [] };
}

function bodyFor(template: CampaignWorkflowTemplate, lang: ProgramLanguage = "en"): string {
  return stripOptOut(resolveLocalized(template.defaultMessageI18n, lang, template.defaultMessage));
}

export const TEMPLATE_CATEGORIES: { id: TemplateCategory | "all"; label: string }[] = [
  { id: "all", label: "All loops" },
  { id: "retention", label: "Retention" },
  { id: "acquisition", label: "Acquisition" },
  { id: "loyalty", label: "Loyalty" },
];

export const CAMPAIGN_WORKFLOW_TEMPLATES: CampaignWorkflowTemplate[] = [
  {
    id: "welcome-series",
    category: "acquisition",
    title: "The Welcome Series",
    description:
      "WhatsApp welcome after a member's first visit — introduce your club and first reward.",
    icon: "route",
    channel: "whatsapp",
    defaultName: "Welcome series",
    defaultMessage:
      "Hi {name}, welcome to {merchant}! Thanks for visiting today. You're now on our rewards list — show this message on your next visit for a little thank-you treat. Reply STOP to opt out.",
    defaultMessageI18n: {
      en: "Hi {name}, welcome to {merchant}! Thanks for visiting today. You're now on our rewards list — show this message on your next visit for a little thank-you treat. Reply STOP to opt out.",
      zh: "你好 {name}，欢迎加入 {merchant}！感谢今天光临。你已加入我们的会员奖励 — 下次到店出示这条信息可领取小礼物。回复 STOP 退订。",
      ms: "Hi {name}, selamat datang ke {merchant}! Terima kasih kerana datang hari ini. Anda kini dalam senarai ganjaran — tunjuk mesej ini pada lawatan seterusnya untuk hadiah kecil. Balas STOP untuk berhenti.",
    },
    triggerLabel: "1st visit completed",
    delayLabel: "Wait 1 hour",
    voucherHint: "Welcome perk",
    workflow: (lang = "en") =>
      workflowOf(node("first_visit"), [
        node("wait", { amount: 1, unit: "hours" }),
        whatsapp(bodyFor(CAMPAIGN_WORKFLOW_TEMPLATES[0], lang)),
      ]),
  },
  {
    id: "winback-loop",
    category: "retention",
    title: "The Winback Loop",
    description: "Re-engage members who have not returned in 30 days with a limited-time offer.",
    icon: "schedule",
    channel: "whatsapp",
    defaultName: "Churn win-back · 30 days",
    defaultMessage:
      "Hi {name}, we miss you at {merchant}! Come back this week and enjoy 20% off — no min spend. Reply STOP to opt out.",
    defaultMessageI18n: {
      en: "Hi {name}, we miss you at {merchant}! Come back this week and enjoy 20% off — no min spend. Reply STOP to opt out.",
      zh: "你好 {name}，我们很想你回来 {merchant}！本周到店享 20% 折扣 — 无最低消费。回复 STOP 退订。",
      ms: "Hi {name}, kami rindu anda di {merchant}! Kembali minggu ini dan nikmati diskaun 20% — tiada belanja minimum. Balas STOP untuk berhenti.",
    },
    triggerLabel: "No visit 30 days",
    delayLabel: "On schedule",
    voucherHint: "20% off return visit",
    workflow: (lang = "en") =>
      workflowOf(node("no_visit_days", { days: 30 }), [
        node("issue_voucher", { name: "Come back", discountPercent: 20, expiryDays: 14 }),
        whatsapp(bodyFor(CAMPAIGN_WORKFLOW_TEMPLATES[1], lang)),
      ]),
  },
  {
    id: "weekend-boost",
    category: "loyalty",
    title: "Weekend Boost",
    description: "One-time broadcast to loyal members for a weekend promo or limited drop.",
    icon: "campaign",
    channel: "whatsapp",
    defaultName: "Weekend promo boost",
    defaultMessage:
      "Hi {name}, this weekend only at {merchant}! Show this message for your member perk. See you soon! Reply STOP to opt out.",
    defaultMessageI18n: {
      en: "Hi {name}, this weekend only at {merchant}! Show this message for your member perk. See you soon! Reply STOP to opt out.",
      zh: "你好 {name}，本周末限定 {merchant}！出示这条信息领取会员礼遇。期待见面！回复 STOP 退订。",
      ms: "Hi {name}, hujung minggu ini sahaja di {merchant}! Tunjuk mesej ini untuk keistimewaan ahli. Jumpa sebentar lagi! Balas STOP untuk berhenti.",
    },
    triggerLabel: "You press Send",
    voucherHint: "Weekend perk",
    workflow: (lang = "en") =>
      workflowOf(node("manual"), [whatsapp(bodyFor(CAMPAIGN_WORKFLOW_TEMPLATES[2], lang))]),
  },
  {
    id: "storefront-banner",
    category: "acquisition",
    title: "Menu promo spotlight",
    description: "Promo photo at the top of the table menu when someone scans the QR.",
    icon: "view_carousel",
    channel: "banner",
    defaultName: "Weekend promo photo",
    defaultMessage: "",
    triggerLabel: "Guest opens table menu",
    workflow: () =>
      workflowOf(
        node("storefront_opened"),
        [node("show_banner", { title: "Weekend special", text: "20% off this Sat–Sun" })],
        [node("day_of_week", { days: "weekend" })],
      ),
  },
  {
    id: "review-nudge",
    category: "retention",
    title: "Review Nudge",
    description: "Ask for a Google review 24 hours after a paid order.",
    icon: "star",
    channel: "whatsapp",
    defaultName: "Review nudge · 24h",
    defaultMessage:
      "Hi {name}, thanks for dining at {merchant}! If you enjoyed your visit, we'd love a quick Google review. It helps us loads. Reply STOP to opt out.",
    defaultMessageI18n: {
      en: "Hi {name}, thanks for dining at {merchant}! If you enjoyed your visit, we'd love a quick Google review. It helps us loads. Reply STOP to opt out.",
      zh: "你好 {name}，感谢光临 {merchant}！如果体验不错，欢迎给我们一条 Google 好评，对我们帮助很大。回复 STOP 退订。",
      ms: "Hi {name}, terima kasih menjamu selera di {merchant}! Jika anda suka, kami amat menghargai ulasan Google ringkas. Ia sangat membantu. Balas STOP untuk berhenti.",
    },
    triggerLabel: "Payment completed",
    delayLabel: "Wait 24 hours",
    workflow: (lang = "en") =>
      workflowOf(node("order_paid"), [
        node("wait", { amount: 24, unit: "hours" }),
        whatsapp(bodyFor(CAMPAIGN_WORKFLOW_TEMPLATES[4], lang)),
      ]),
  },
];
