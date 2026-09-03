/**
 * Declarative catalog for the campaign workflow builder.
 *
 * The same catalog drives three things, so adding a trigger/condition/action
 * here is all that is needed to expose it in the visual editor, persist it, and
 * execute it at runtime:
 *   - the toolbox + inspector fields in CampaignVisualEditor
 *   - zod validation on the campaigns API
 *   - condition evaluation and action dispatch in workflow-runtime
 */

import { lintWhatsAppTemplate, type ComplianceReport } from "@/lib/whatsapp/meta-compliance";

export type CampaignTriggerType =
  | "member_joined"
  | "storefront_opened"
  | "order_paid"
  | "first_visit"
  | "no_visit_days"
  | "points_milestone"
  | "manual";

export type CampaignConditionType =
  | "member_tier"
  | "spend_amount"
  | "visit_count"
  | "lifetime_points"
  | "has_phone"
  | "marketing_opted_in"
  | "day_of_week";

export type CampaignActionType =
  | "send_whatsapp"
  | "send_sms"
  | "award_points"
  | "issue_voucher"
  | "show_banner"
  | "wait";

export type NodeKind = "trigger" | "condition" | "action";

export type NodeConfig = Record<string, unknown>;

export type CampaignNode = {
  id: string;
  kind: NodeKind;
  type: string;
  config: NodeConfig;
};

export type CampaignWorkflow = {
  version: 1;
  trigger: CampaignNode;
  /** All conditions must pass for `actions` to run. */
  conditions: CampaignNode[];
  actions: CampaignNode[];
  /** Runs instead of `actions` when any condition fails. */
  elseActions: CampaignNode[];
};

/* -------------------------------------------------------------------------- */
/* Field definitions — the inspector renders these generically                */
/* -------------------------------------------------------------------------- */

export type FieldSpec =
  | { key: string; label: string; type: "text"; default: string; placeholder?: string; help?: string }
  | { key: string; label: string; type: "textarea"; default: string; placeholder?: string; help?: string; rows?: number }
  | { key: string; label: string; type: "number"; default: number; min?: number; max?: number; suffix?: string; help?: string }
  | { key: string; label: string; type: "money"; default: number; help?: string }
  | { key: string; label: string; type: "toggle"; default: boolean; help?: string }
  | {
      key: string;
      label: string;
      type: "select";
      default: string;
      options: { value: string; label: string }[];
      /** Editor replaces `options` with live merchant data when set. */
      optionsSource?: "tiers";
      help?: string;
    }
  | { key: string; label: string; type: "image"; default: null; help?: string }
  | { key: string; label: string; type: "whatsapp_template"; default: null; help?: string };

export type NodeDefinition = {
  type: string;
  kind: NodeKind;
  label: string;
  icon: string;
  /** One-line explanation shown in the toolbox and inspector. */
  description: string;
  fields: FieldSpec[];
  /** Renders the node title on the canvas from its saved config. */
  summary: (config: NodeConfig) => string;
  /** Channels this node makes sense for; omit for "all". */
  channels?: ("whatsapp" | "sms" | "banner")[];
  /** Defined in the spec but not yet dispatched by the runtime — shown disabled in the toolbox. */
  comingSoon?: boolean;
};

const COMPARATOR_FIELD = (label: string): FieldSpec => ({
  key: "comparator",
  label,
  type: "select",
  default: "gte",
  options: [
    { value: "gte", label: "is at least" },
    { value: "lte", label: "is at most" },
  ],
});

function num(config: NodeConfig, key: string, fallback: number): number {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(config: NodeConfig, key: string, fallback: string): string {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function comparatorWord(config: NodeConfig): string {
  return str(config, "comparator", "gte") === "lte" ? "≤" : "≥";
}

/* -------------------------------------------------------------------------- */
/* Triggers                                                                    */
/* -------------------------------------------------------------------------- */

export const TRIGGER_DEFINITIONS: NodeDefinition[] = [
  {
    type: "member_joined",
    kind: "trigger",
    label: "Member opted in",
    icon: "person_add",
    description: "Someone joins your rewards club from the table menu and agrees to hear from you.",
    fields: [
      {
        key: "source",
        label: "Where they joined",
        type: "select",
        default: "any",
        options: [
          { value: "any", label: "Anywhere" },
          { value: "storefront", label: "Table menu" },
          { value: "receipt", label: "Receipt / WhatsApp" },
        ],
      },
      {
        key: "firstTimeOnly",
        label: "First-time members only",
        type: "toggle",
        default: true,
        help: "Skip guests who re-join after opting out.",
      },
    ],
    summary: (c) =>
      str(c, "source", "any") === "any"
        ? "Member opted in"
        : `Member opted in · ${str(c, "source", "any") === "storefront" ? "table menu" : "receipt"}`,
  },
  {
    type: "storefront_opened",
    kind: "trigger",
    label: "Guest opens table menu",
    icon: "qr_code_scanner",
    description: "Someone scans the table QR or opens the menu link on their phone.",
    fields: [
      {
        key: "newVisitorsOnly",
        label: "First-time guests only",
        type: "toggle",
        default: false,
        help: "Only show the promo to phones that have not opened your menu before.",
      },
    ],
    summary: (c) =>
      c.newVisitorsOnly ? "Guest opens table menu · first-timers only" : "Guest opens table menu",
  },
  {
    type: "order_paid",
    kind: "trigger",
    label: "Payment completed",
    icon: "payments",
    description: "After a diner pays for an order.",
    fields: [
      { key: "minSpend", label: "Minimum order total", type: "money", default: 0 },
    ],
    summary: (c) =>
      num(c, "minSpend", 0) > 0
        ? `Payment over ${(num(c, "minSpend", 0) / 100).toFixed(0)}`
        : "Payment completed",
  },
  {
    type: "first_visit",
    kind: "trigger",
    label: "1st visit completed",
    icon: "flag",
    description: "The member's very first paid visit is complete.",
    fields: [],
    summary: () => "1st visit completed",
  },
  {
    type: "no_visit_days",
    kind: "trigger",
    label: "No visit for N days",
    icon: "schedule",
    description: "A member has not visited for a while — checked once a day, one message per quiet spell.",
    fields: [
      { key: "days", label: "Days without a visit", type: "number", default: 30, min: 1, max: 365, suffix: "days" },
    ],
    summary: (c) => `No visit for ${num(c, "days", 30)} days`,
  },
  {
    type: "points_milestone",
    kind: "trigger",
    label: "Points milestone",
    icon: "military_tech",
    description: "A member's lifetime points cross a threshold — runs once per member.",
    fields: [
      { key: "points", label: "Points reached", type: "number", default: 500, min: 1, suffix: "pts" },
    ],
    summary: (c) => `Reaches ${num(c, "points", 500)} points`,
  },
  {
    type: "manual",
    kind: "trigger",
    label: "You press Send",
    icon: "send",
    description: "No automatic timing — you choose when to send.",
    fields: [],
    summary: () => "You press Send",
  },
];

/* -------------------------------------------------------------------------- */
/* Conditions                                                                  */
/* -------------------------------------------------------------------------- */

export const CONDITION_DEFINITIONS: NodeDefinition[] = [
  {
    type: "member_tier",
    kind: "condition",
    label: "Member level",
    icon: "workspace_premium",
    description: "Only continue for members on a given reward level.",
    fields: [
      {
        key: "tier",
        label: "Reward level",
        type: "select",
        default: "",
        options: [{ value: "", label: "Any level" }],
        optionsSource: "tiers",
      },
    ],
    summary: (c) => (str(c, "tier", "") ? `Member level is ${str(c, "tier", "")}` : "Member level is any"),
  },
  {
    type: "spend_amount",
    kind: "condition",
    label: "Spend amount",
    icon: "account_balance_wallet",
    description: "Compare the member's lifetime spend.",
    fields: [
      COMPARATOR_FIELD("Lifetime spend"),
      { key: "amount", label: "Amount", type: "money", default: 5000 },
    ],
    summary: (c) => `Spend ${comparatorWord(c)} ${(num(c, "amount", 5000) / 100).toFixed(0)}`,
  },
  {
    type: "visit_count",
    kind: "condition",
    label: "Visit count",
    icon: "repeat",
    description: "Compare how many times the member has visited.",
    fields: [
      COMPARATOR_FIELD("Visits"),
      { key: "count", label: "Visits", type: "number", default: 3, min: 0, suffix: "visits" },
    ],
    summary: (c) => `Visits ${comparatorWord(c)} ${num(c, "count", 3)}`,
  },
  {
    type: "lifetime_points",
    kind: "condition",
    label: "Lifetime points",
    icon: "stars",
    description: "Compare the member's lifetime points earned.",
    fields: [
      COMPARATOR_FIELD("Points"),
      { key: "points", label: "Points", type: "number", default: 200, min: 0, suffix: "pts" },
    ],
    summary: (c) => `Points ${comparatorWord(c)} ${num(c, "points", 200)}`,
  },
  {
    type: "has_phone",
    kind: "condition",
    label: "Has phone number",
    icon: "smartphone",
    description: "Required before any WhatsApp or SMS action can run.",
    fields: [],
    summary: () => "Has a phone number",
  },
  {
    type: "marketing_opted_in",
    kind: "condition",
    label: "Marketing opt-in",
    icon: "verified_user",
    description: "Member has not replied STOP or unsubscribed (PDPA).",
    fields: [],
    summary: () => "Still opted in to marketing",
  },
  {
    type: "day_of_week",
    kind: "condition",
    label: "Day of week",
    icon: "calendar_month",
    description: "Only run on certain days.",
    fields: [
      {
        key: "days",
        label: "Runs on",
        type: "select",
        default: "any",
        options: [
          { value: "any", label: "Any day" },
          { value: "weekday", label: "Weekdays (Mon–Fri)" },
          { value: "weekend", label: "Weekends (Sat–Sun)" },
        ],
      },
    ],
    summary: (c) => {
      const days = str(c, "days", "any");
      if (days === "weekday") return "On weekdays";
      if (days === "weekend") return "On weekends";
      return "On any day";
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

export const ACTION_DEFINITIONS: NodeDefinition[] = [
  {
    type: "send_whatsapp",
    kind: "action",
    label: "Send WhatsApp",
    icon: "chat",
    description: "Send a WhatsApp template message to the member.",
    channels: ["whatsapp"],
    fields: [{ key: "template", label: "WhatsApp template", type: "whatsapp_template", default: null }],
    summary: () => "Send WhatsApp",
  },
  {
    type: "send_sms",
    kind: "action",
    label: "Send SMS",
    icon: "sms",
    description: "SMS is paused for now — use WhatsApp instead.",
    // Hidden from the toolbox; kept so legacy SMS campaigns still render.
    channels: [],
    fields: [
      { key: "body", label: "Message", type: "textarea", default: "", rows: 4, placeholder: "Hi {name}, ..." },
      { key: "includeOptOut", label: "Append opt-out line", type: "toggle", default: true },
    ],
    summary: () => "Send SMS (paused)",
  },
  {
    type: "award_points",
    kind: "action",
    label: "Award points",
    icon: "emoji_events",
    description: "Add bonus loyalty points to the member's balance.",
    fields: [
      { key: "points", label: "Points", type: "number", default: 50, min: 1, suffix: "pts" },
      { key: "reason", label: "Note (for your records)", type: "text", default: "campaign_bonus" },
    ],
    summary: (c) => `Award ${num(c, "points", 50)} points`,
  },
  {
    type: "issue_voucher",
    kind: "action",
    label: "Issue voucher",
    icon: "confirmation_number",
    description: "Creates a discount code for this campaign; put {code} in the message to deliver it.",
    fields: [
      { key: "name", label: "Voucher name", type: "text", default: "Campaign perk" },
      { key: "discountPercent", label: "Discount", type: "number", default: 20, min: 1, max: 100, suffix: "%" },
      { key: "expiryDays", label: "Valid for", type: "number", default: 14, min: 1, max: 365, suffix: "days" },
    ],
    summary: (c) => `Issue ${num(c, "discountPercent", 20)}% voucher`,
  },
  {
    type: "show_banner",
    kind: "action",
    label: "Show promo on menu",
    icon: "view_carousel",
    description:
      "Show a promo photo at the top of the table menu when someone opens it. Headline and caption are optional overlays.",
    channels: ["banner"],
    fields: [
      {
        key: "imageUrl",
        label: "Promo photo",
        type: "image",
        default: null,
        help: "Upload your weekend offer or promo artwork — this is what diners see on the menu.",
      },
      {
        key: "title",
        label: "Headline (optional)",
        type: "text",
        default: "",
        placeholder: "e.g. Weekend special",
        help: "Short label over the photo. Leave blank for photo-only.",
      },
      {
        key: "text",
        label: "Caption (optional)",
        type: "textarea",
        default: "",
        rows: 2,
        placeholder: "e.g. 20% off all drinks this Sat–Sun",
        help: "One line under the headline. Leave blank for photo-only.",
      },
      {
        key: "linkUrl",
        label: "Tap-through link (optional)",
        type: "text",
        default: "",
        placeholder: "https://",
      },
    ],
    summary: (c) => str(c, "title", "Promo banner"),
  },
  {
    type: "wait",
    kind: "action",
    label: "Wait",
    icon: "hourglass_empty",
    description: "Pause before the next step runs.",
    fields: [
      { key: "amount", label: "Delay", type: "number", default: 1, min: 1, max: 90 },
      {
        key: "unit",
        label: "Unit",
        type: "select",
        default: "hours",
        options: [
          { value: "minutes", label: "Minutes" },
          { value: "hours", label: "Hours" },
          { value: "days", label: "Days" },
        ],
      },
    ],
    summary: (c) => `Wait ${num(c, "amount", 1)} ${str(c, "unit", "hours")}`,
  },
];

export const ALL_NODE_DEFINITIONS = [
  ...TRIGGER_DEFINITIONS,
  ...CONDITION_DEFINITIONS,
  ...ACTION_DEFINITIONS,
];

/** One-line labels for setup agents that suggest workflows but do not build them. */
export const WORKFLOW_CAPABILITY_SUMMARY = {
  triggers: TRIGGER_DEFINITIONS.filter((d) => !d.comingSoon).map((d) => d.label),
  conditions: CONDITION_DEFINITIONS.filter((d) => !d.comingSoon).map((d) => d.label),
  actions: ACTION_DEFINITIONS.filter((d) => !d.comingSoon).map((d) => d.label),
} as const;

export function findNodeDefinition(type: string): NodeDefinition | null {
  return ALL_NODE_DEFINITIONS.find((d) => d.type === type) ?? null;
}

export function nodeSummary(node: CampaignNode): string {
  const definition = findNodeDefinition(node.type);
  if (!definition) return node.type;
  return definition.summary(node.config);
}

export function defaultConfigFor(type: string): NodeConfig {
  const definition = findNodeDefinition(type);
  if (!definition) return {};
  const config: NodeConfig = {};
  for (const field of definition.fields) {
    config[field.key] = field.type === "whatsapp_template" ? defaultWhatsAppTemplate() : field.default;
  }
  return config;
}

let nodeCounter = 0;

export function createNode(type: string): CampaignNode {
  const definition = findNodeDefinition(type);
  nodeCounter += 1;
  return {
    id: `${type}-${Date.now().toString(36)}-${nodeCounter}`,
    kind: definition?.kind ?? "action",
    type,
    config: defaultConfigFor(type),
  };
}

/* -------------------------------------------------------------------------- */
/* WhatsApp template                                                           */
/* -------------------------------------------------------------------------- */

export type WhatsAppButtonType = "quick_reply" | "url" | "phone";

export type WhatsAppButton = {
  id: string;
  type: WhatsAppButtonType;
  label: string;
  value: string;
};

export type WhatsAppTemplate = {
  headerType: "none" | "text" | "image";
  headerText: string;
  headerImageUrl: string | null;
  body: string;
  footer: string;
  includeOptOut: boolean;
  buttons: WhatsAppButton[];
};

export const WHATSAPP_MAX_BUTTONS = 3;
export const WHATSAPP_FOOTER_LIMIT = 60;

export function defaultWhatsAppTemplate(): WhatsAppTemplate {
  return {
    headerType: "none",
    headerText: "",
    headerImageUrl: null,
    body: "",
    footer: "",
    includeOptOut: true,
    buttons: [],
  };
}

export function asWhatsAppTemplate(value: unknown): WhatsAppTemplate {
  const base = defaultWhatsAppTemplate();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<WhatsAppTemplate>;
  return {
    headerType: raw.headerType === "text" || raw.headerType === "image" ? raw.headerType : "none",
    headerText: typeof raw.headerText === "string" ? raw.headerText : "",
    headerImageUrl: typeof raw.headerImageUrl === "string" ? raw.headerImageUrl : null,
    body: typeof raw.body === "string" ? raw.body : "",
    footer: typeof raw.footer === "string" ? raw.footer : "",
    includeOptOut: raw.includeOptOut !== false,
    buttons: Array.isArray(raw.buttons)
      ? raw.buttons.slice(0, WHATSAPP_MAX_BUTTONS).map((button, index) => ({
          id: typeof button?.id === "string" ? button.id : `btn-${index}`,
          type:
            button?.type === "url" || button?.type === "phone" ? button.type : "quick_reply",
          label: typeof button?.label === "string" ? button.label : "",
          value: typeof button?.value === "string" ? button.value : "",
        }))
      : [],
  };
}

/* -------------------------------------------------------------------------- */
/* Workflow helpers                                                            */
/* -------------------------------------------------------------------------- */

export function defaultWorkflowForChannel(channel: string): CampaignWorkflow {
  if (channel === "banner") {
    return {
      version: 1,
      trigger: createNode("storefront_opened"),
      conditions: [],
      actions: [createNode("show_banner")],
      elseActions: [],
    };
  }
  return {
    version: 1,
    trigger: createNode("member_joined"),
    conditions: [createNode("marketing_opted_in")],
    actions: [createNode("send_whatsapp")],
    elseActions: [],
  };
}

/** Coerces anything read from the database into a usable workflow. */
export function asWorkflow(value: unknown, channel: string): CampaignWorkflow {
  if (!value || typeof value !== "object") return defaultWorkflowForChannel(channel);
  const raw = value as Partial<CampaignWorkflow>;
  if (!raw.trigger || typeof raw.trigger !== "object") return defaultWorkflowForChannel(channel);

  const coerceList = (list: unknown, kind: NodeKind): CampaignNode[] =>
    Array.isArray(list)
      ? list
          .filter((node): node is CampaignNode => Boolean(node) && typeof node === "object")
          .map((node) => ({
            id: typeof node.id === "string" ? node.id : `${node.type}-${Math.random().toString(36).slice(2)}`,
            kind,
            type: String(node.type),
            config: { ...defaultConfigFor(String(node.type)), ...(node.config ?? {}) },
          }))
          .filter((node) => findNodeDefinition(node.type) !== null)
      : [];

  const triggerType = String(raw.trigger.type);
  return {
    version: 1,
    trigger: {
      id: typeof raw.trigger.id === "string" ? raw.trigger.id : `trigger-${triggerType}`,
      kind: "trigger",
      type: findNodeDefinition(triggerType) ? triggerType : "manual",
      config: { ...defaultConfigFor(triggerType), ...(raw.trigger.config ?? {}) },
    },
    conditions: coerceList(raw.conditions, "condition"),
    actions: coerceList(raw.actions, "action"),
    elseActions: coerceList(raw.elseActions, "action"),
  };
}

/** Blocking problems that must be fixed before a campaign can go live. */
export function validateWorkflow(workflow: CampaignWorkflow, channel: string): string[] {
  const issues: string[] = [];

  if (channel === "sms") {
    issues.push("SMS campaigns are paused for now — recreate as WhatsApp or keep this one paused.");
  }

  if (workflow.actions.length === 0) {
    issues.push("Add a “Then” step — right now the campaign does nothing.");
  }

  for (const action of workflow.actions) {
    const def = findNodeDefinition(action.type);
    if (action.type === "send_sms") {
      issues.push("SMS is paused for now — replace this step with Send WhatsApp.");
      continue;
    }
    if (def?.channels && def.channels.length > 0 && !def.channels.includes(channel as "whatsapp" | "banner")) {
      issues.push(
        `“${def.label}” does not belong on a ${channel} campaign — remove it or change the channel.`,
      );
    }
    if (action.type === "send_whatsapp") {
      // Meta's own rules are the blocking ones here; the same linter runs on
      // AI drafts, in the editor and again on the server before submission.
      const report = whatsAppCompliance(asWhatsAppTemplate(action.config.template));
      for (const blocker of report.blockers) issues.push(blocker.message);
    }
    if (action.type === "show_banner" && !String(action.config.title ?? "").trim()) {
      issues.push("Add a headline for the promo photo.");
    }
  }

  const sendsMessage = workflow.actions.some(
    (a) => a.type === "send_whatsapp" || a.type === "send_sms",
  );
  const issuesVoucher = workflow.actions.some((a) => a.type === "issue_voucher");
  const body = workflowMessageBody(workflow) ?? "";
  if (issuesVoucher && (channel === "whatsapp" || channel === "sms")) {
    if (!sendsMessage) {
      issues.push("Add a Send WhatsApp step so members actually receive the voucher code.");
    } else if (!/\{code\}/i.test(body)) {
      issues.push("Add {code} to the message so the member receives their voucher code.");
    }
  } else if (/\{code\}/i.test(body) && !issuesVoucher) {
    issues.push("Your message mentions {code} but there's no Issue voucher step — add one, or take {code} out of the message.");
  }
  if (sendsMessage && (channel === "whatsapp" || channel === "sms")) {
    const hasOptInGuard = workflow.conditions.some((c) => c.type === "marketing_opted_in");
    if (!hasOptInGuard) {
      issues.push(
        "Add the “Marketing opt-in” condition so you only message members who agreed to hear from you (PDPA).",
      );
    }
  }

  return issues;
}

/** The storefront reads banner copy from the campaign row; keep it in sync with the action. */
export function workflowBannerFields(workflow: CampaignWorkflow): {
  banner_title: string | null;
  banner_text: string | null;
  banner_image_url: string | null;
  link_url: string | null;
} | null {
  const banner = workflow.actions.find((a) => a.type === "show_banner");
  if (!banner) return null;
  const text = (key: string) => {
    const value = banner.config[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  return {
    banner_title: text("title"),
    banner_text: text("text"),
    banner_image_url: text("imageUrl"),
    link_url: text("linkUrl"),
  };
}

/** Flattens a workflow's message action into the legacy message_body column. */
export function workflowMessageBody(workflow: CampaignWorkflow): string | null {
  for (const action of workflow.actions) {
    if (action.type === "send_whatsapp") {
      return renderWhatsAppTemplate(asWhatsAppTemplate(action.config.template));
    }
    if (action.type === "send_sms") {
      const body = String(action.config.body ?? "").trim();
      if (!body) return null;
      return action.config.includeOptOut === false ? body : `${body}\n\nReply STOP to opt out.`;
    }
  }
  return null;
}

/** Meta compliance report for one template; `merchantName` only sharpens the sender-identity check. */
export function whatsAppCompliance(template: WhatsAppTemplate, merchantName?: string): ComplianceReport {
  return lintWhatsAppTemplate({
    body: template.body,
    headerType: template.headerType,
    headerText: template.headerText,
    footer: template.footer,
    includeOptOut: template.includeOptOut,
    buttons: template.buttons,
    merchantName,
  });
}

/** Compliance for the workflow's WhatsApp step, or null when it has none. */
export function workflowWhatsAppCompliance(
  workflow: CampaignWorkflow,
  merchantName?: string,
): ComplianceReport | null {
  const action = workflow.actions.find((a) => a.type === "send_whatsapp");
  if (!action) return null;
  return whatsAppCompliance(asWhatsAppTemplate(action.config.template), merchantName);
}

/** Renders a template to the plain-text body that is actually sent. */
export function renderWhatsAppTemplate(template: WhatsAppTemplate): string {
  const parts: string[] = [];
  if (template.headerType === "text" && template.headerText.trim()) {
    parts.push(`*${template.headerText.trim()}*`);
  }
  if (template.body.trim()) parts.push(template.body.trim());
  if (template.footer.trim()) parts.push(template.footer.trim());

  const urlButtons = template.buttons.filter((b) => b.type === "url" && b.value.trim());
  for (const button of urlButtons) {
    parts.push(`${button.label.trim() || "Open"}: ${button.value.trim()}`);
  }

  const quickReplies = template.buttons.filter((b) => b.type === "quick_reply" && b.label.trim());
  if (quickReplies.length > 0) {
    parts.push(quickReplies.map((b, i) => `${i + 1}. ${b.label.trim()}`).join("\n"));
  }

  if (template.includeOptOut) parts.push("Reply STOP to opt out.");

  return parts.join("\n\n");
}
