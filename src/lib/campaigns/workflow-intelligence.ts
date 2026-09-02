import {
  createNode,
  findNodeDefinition,
  nodeSummary,
  type CampaignNode,
  type CampaignWorkflow,
  type NodeConfig,
} from "@/lib/campaigns/workflow-spec";

export type WorkflowHintSeverity = "fix" | "tip";

export type WorkflowHint = {
  id: string;
  severity: WorkflowHintSeverity;
  message: string;
  /** One-click repair, when we can do it safely. */
  fixLabel?: string;
};

export type WorkflowSuggestion = {
  id: string;
  title: string;
  reason: string;
  /** Replaces conditions + actions; keeps the current trigger type. */
  build: (trigger: CampaignNode) => Pick<CampaignWorkflow, "conditions" | "actions" | "elseActions">;
};

function node(type: string, config: NodeConfig = {}): CampaignNode {
  const created = createNode(type);
  return { ...created, config: { ...created.config, ...config } };
}

function hasCondition(workflow: CampaignWorkflow, type: string): boolean {
  return workflow.conditions.some((c) => c.type === type);
}

function hasAction(workflow: CampaignWorkflow, type: string): boolean {
  return workflow.actions.some((a) => a.type === type);
}

function sendsMessage(workflow: CampaignWorkflow): boolean {
  return workflow.actions.some((a) => a.type === "send_whatsapp" || a.type === "send_sms");
}

function waitDurationHours(action: CampaignNode): number {
  const amount = Math.max(0, Number(action.config.amount ?? 0));
  const unit = String(action.config.unit ?? "hours");
  if (unit === "minutes") return amount / 60;
  if (unit === "days") return amount * 24;
  return amount;
}

function waitBeforeSend(workflow: CampaignWorkflow): boolean {
  const waitIdx = workflow.actions.findIndex((a) => a.type === "wait");
  const sendIdx = workflow.actions.findIndex(
    (a) => a.type === "send_whatsapp" || a.type === "send_sms",
  );
  return waitIdx !== -1 && sendIdx !== -1 && waitIdx < sendIdx;
}

function hoursBeforeFirstSend(workflow: CampaignWorkflow): number {
  let hours = 0;
  for (const action of workflow.actions) {
    if (action.type === "wait") {
      hours += waitDurationHours(action);
      continue;
    }
    if (action.type === "send_whatsapp" || action.type === "send_sms") return hours;
  }
  return hours;
}

/** Hours of Wait between consecutive Send steps (0 if none / adjacent). */
function minHoursBetweenSends(workflow: CampaignWorkflow): number | null {
  const gaps: number[] = [];
  let pending: number | null = null;
  let gapHours = 0;
  for (const action of workflow.actions) {
    if (action.type === "send_whatsapp" || action.type === "send_sms") {
      if (pending !== null) gaps.push(gapHours);
      pending = 1;
      gapHours = 0;
      continue;
    }
    if (pending !== null && action.type === "wait") {
      gapHours += waitDurationHours(action);
    }
  }
  if (gaps.length === 0) return null;
  return Math.min(...gaps);
}

function voucherAfterSend(workflow: CampaignWorkflow): boolean {
  const voucherIdx = workflow.actions.findIndex((a) => a.type === "issue_voucher");
  const sendIdx = workflow.actions.findIndex(
    (a) => a.type === "send_whatsapp" || a.type === "send_sms",
  );
  return voucherIdx !== -1 && sendIdx !== -1 && voucherIdx > sendIdx;
}

/** Soft coaching tips — do not block go-live (validateWorkflow still owns blockers). */
export function analyzeWorkflow(workflow: CampaignWorkflow, channel: string): WorkflowHint[] {
  const hints: WorkflowHint[] = [];
  const trigger = workflow.trigger.type;

  if ((channel === "whatsapp" || channel === "sms") && sendsMessage(workflow)) {
    if (!hasCondition(workflow, "marketing_opted_in")) {
      hints.push({
        id: "add-opt-in",
        severity: "fix",
        message: "Add “Marketing opt-in” so you only message people who agreed (PDPA).",
        fixLabel: "Add opt-in check",
      });
    }
    if (!hasCondition(workflow, "has_phone")) {
      hints.push({
        id: "add-phone",
        severity: "tip",
        message: "Add “Has phone number” — skips members with no number on file.",
        fixLabel: "Add phone check",
      });
    }
  }

  if (hasAction(workflow, "send_sms")) {
    hints.push({
      id: "wrong-sms",
      severity: "fix",
      message: "SMS is paused for now — replace the SMS step with Send WhatsApp.",
    });
  }
  if (channel === "banner" && sendsMessage(workflow)) {
    hints.push({
      id: "banner-message",
      severity: "fix",
      message: "Banner campaigns show on the menu — use “Show promo on menu”, not a message send.",
    });
  }

  const sendCount = workflow.actions.filter(
    (a) => a.type === "send_whatsapp" || a.type === "send_sms",
  ).length;
  if (sendCount > 1) {
    const gap = minHoursBetweenSends(workflow);
    if (gap !== null && gap < 48) {
      hints.push({
        id: "space-sends",
        severity: "tip",
        message:
          "Space WhatsApp nurture messages at least 48 hours apart — closer spacing raises blocks and STOP replies.",
        fixLabel: "Add 48h Wait between sends",
      });
    } else {
      hints.push({
        id: "duplicate-send",
        severity: "tip",
        message: "Two message steps will send twice. Prefer one Send unless this is a deliberate drip.",
      });
    }
  }

  if (
    sendsMessage(workflow) &&
    (trigger === "order_paid" || trigger === "first_visit" || trigger === "member_joined") &&
    !waitBeforeSend(workflow)
  ) {
    hints.push({
      id: "add-wait",
      severity: "tip",
      message:
        trigger === "member_joined"
          ? "A short Wait (e.g. 5 minutes) feels less pushy right after someone joins."
          : "A Wait after the visit usually converts better than messaging instantly.",
      fixLabel: "Add Wait before send",
    });
  }

  if (sendsMessage(workflow) && trigger === "first_visit" && waitBeforeSend(workflow)) {
    const hours = hoursBeforeFirstSend(workflow);
    if (hours > 0 && hours < 1) {
      hints.push({
        id: "longer-welcome-wait",
        severity: "tip",
        message: "Welcome messages work better after ~1 hour — gives them time to leave the cafe.",
        fixLabel: "Set Wait to 1 hour",
      });
    }
  }

  if (sendsMessage(workflow) && trigger === "order_paid" && waitBeforeSend(workflow)) {
    const hours = hoursBeforeFirstSend(workflow);
    if (hours > 0 && hours < 12) {
      hints.push({
        id: "longer-review-wait",
        severity: "tip",
        message: "Review nudges convert better the next day — try waiting ~24 hours.",
        fixLabel: "Set Wait to 24 hours",
      });
    }
  }

  if (trigger === "no_visit_days") {
    const days = Math.max(1, Number(workflow.trigger.config.days ?? 30));
    if (days < 21) {
      hints.push({
        id: "winback-window",
        severity: "tip",
        message: `Win-back at ${days} days is aggressive for cafes — 30 days is the usual sweet spot (60–90 for quiet members).`,
        fixLabel: "Set to 30 days",
      });
    }
    if (sendsMessage(workflow) && !hasAction(workflow, "issue_voucher")) {
      hints.push({
        id: "winback-voucher",
        severity: "tip",
        message: "Win-backs convert better with a voucher — add Issue voucher and put {code} in the message.",
        fixLabel: "Add voucher step",
      });
    }
  }

  if (voucherAfterSend(workflow)) {
    hints.push({
      id: "voucher-before-send",
      severity: "fix",
      message: "Move Issue voucher above Send so {code} is ready when the message goes out.",
      fixLabel: "Put voucher before Send",
    });
  }

  if (hasAction(workflow, "issue_voucher") && !sendsMessage(workflow) && channel !== "banner") {
    hints.push({
      id: "voucher-needs-send",
      severity: "fix",
      message: "Issue voucher creates a code — add Send WhatsApp/SMS with {code} so members get it.",
    });
  }

  if (trigger === "manual" && (channel === "whatsapp" || channel === "sms")) {
    hints.push({
      id: "broadcast-frequency",
      severity: "tip",
      message:
        "Keep promo broadcasts to about 2–4 per month per segment — more often hurts WhatsApp quality rating.",
    });
  }

  if (workflow.actions.length === 0) {
    hints.push({
      id: "empty-actions",
      severity: "fix",
      message: "Add a “Then” step — right now this campaign does nothing when it fires.",
    });
  }

  return hints;
}

/** Recommended next path for the current trigger + channel. */
export function suggestPathForTrigger(
  triggerType: string,
  channel: string,
): WorkflowSuggestion | null {
  if (channel === "banner") {
    if (triggerType === "storefront_opened") {
      return {
        id: "banner-weekend",
        title: "Weekend menu promo",
        reason: "Show a weekend promo photo when someone opens the table menu.",
        build: () => ({
          conditions: [node("day_of_week", { days: "weekend" })],
          actions: [
            node("show_banner", {
              title: "Weekend special",
              text: "20% off this Sat–Sun",
            }),
          ],
          elseActions: [],
        }),
      };
    }
    return null;
  }

  if (channel !== "whatsapp") return null;

  const sendType = "send_whatsapp";
  const guards = [node("marketing_opted_in"), node("has_phone")];

  if (triggerType === "first_visit") {
    return {
      id: "welcome-path",
      title: "Welcome after 1st visit",
      reason: "Wait 1 hour, then send a welcome — usual cafe post-visit hello.",
      build: () => ({
        conditions: guards,
        actions: [node("wait", { amount: 1, unit: "hours" }), node(sendType)],
        elseActions: [],
      }),
    };
  }

  if (triggerType === "order_paid") {
    return {
      id: "review-path",
      title: "Review nudge · 24h",
      reason: "Wait a day after payment, then ask for a Google review.",
      build: () => ({
        conditions: guards,
        actions: [node("wait", { amount: 24, unit: "hours" }), node(sendType)],
        elseActions: [],
      }),
    };
  }

  if (triggerType === "no_visit_days") {
    return {
      id: "winback-path",
      title: "Win-back with voucher",
      reason: "Issue a 20% come-back code, then WhatsApp it — voucher before send.",
      build: () => ({
        conditions: guards,
        actions: [
          node("issue_voucher", { name: "Come back", discountPercent: 20, expiryDays: 14 }),
          node(sendType),
        ],
        elseActions: [],
      }),
    };
  }

  if (triggerType === "member_joined") {
    return {
      id: "join-path",
      title: "Welcome on join",
      reason: "Short wait, then welcome them into the rewards club.",
      build: () => ({
        conditions: guards,
        actions: [node("wait", { amount: 5, unit: "minutes" }), node(sendType)],
        elseActions: [],
      }),
    };
  }

  if (triggerType === "points_milestone") {
    return {
      id: "milestone-path",
      title: "Celebrate the milestone",
      reason: "Congratulate them and award a small bonus.",
      build: () => ({
        conditions: guards,
        actions: [
          node("award_points", { points: 50, reason: "milestone_bonus" }),
          node(sendType),
        ],
        elseActions: [],
      }),
    };
  }

  if (triggerType === "manual") {
    return {
      id: "broadcast-path",
      title: "Broadcast blast",
      reason: "Opt-in + phone checks, then send when you press Send (keep blasts to 2–4×/month).",
      build: () => ({
        conditions: guards,
        actions: [node(sendType)],
        elseActions: [],
      }),
    };
  }

  return null;
}

/** True when the canvas is still a thin starter flow — safe to overwrite with a suggestion. */
export function isThinWorkflow(workflow: CampaignWorkflow, channel: string): boolean {
  if (workflow.elseActions.length > 0) return false;
  if (workflow.conditions.length > 2) return false;
  if (workflow.actions.length > 2) return false;
  if (channel === "banner") {
    return (
      workflow.actions.every((a) => a.type === "show_banner") &&
      workflow.conditions.every((c) => c.type === "day_of_week" || c.type === "marketing_opted_in")
    );
  }
  const known = new Set([
    "marketing_opted_in",
    "has_phone",
    "wait",
    "send_whatsapp",
    "send_sms",
    "issue_voucher",
    "award_points",
  ]);
  return (
    workflow.conditions.every((c) => known.has(c.type)) &&
    workflow.actions.every((a) => known.has(a.type))
  );
}

/** Hide Apply when the canvas already matches the suggested shape. */
export function workflowMatchesSuggestion(
  workflow: CampaignWorkflow,
  suggestion: WorkflowSuggestion,
): boolean {
  const built = suggestion.build(workflow.trigger);
  const sameTypes = (a: CampaignNode[], b: CampaignNode[]) =>
    a.length === b.length && a.every((node, i) => node.type === b[i]?.type);
  return (
    sameTypes(workflow.conditions, built.conditions) &&
    sameTypes(workflow.actions, built.actions) &&
    workflow.elseActions.length === 0
  );
}

export function applyWorkflowSuggestion(
  workflow: CampaignWorkflow,
  suggestion: WorkflowSuggestion,
): CampaignWorkflow {
  const built = suggestion.build(workflow.trigger);
  return normalizeWorkflow({
    ...workflow,
    conditions: built.conditions,
    actions: built.actions,
    elseActions: built.elseActions,
  });
}

/** Put voucher before Send; keep other step order stable. */
export function normalizeWorkflow(workflow: CampaignWorkflow): CampaignWorkflow {
  if (!voucherAfterSend(workflow)) return workflow;
  const actions = [...workflow.actions];
  const voucherIdx = actions.findIndex((a) => a.type === "issue_voucher");
  const sendIdx = actions.findIndex((a) => a.type === "send_whatsapp" || a.type === "send_sms");
  if (voucherIdx === -1 || sendIdx === -1 || voucherIdx < sendIdx) return workflow;
  const [voucher] = actions.splice(voucherIdx, 1);
  const newSendIdx = actions.findIndex((a) => a.type === "send_whatsapp" || a.type === "send_sms");
  actions.splice(newSendIdx, 0, voucher);
  return { ...workflow, actions };
}

/** Auto-insert PDPA / phone guards when a messaging action is added. */
export function withMessagingGuards(
  workflow: CampaignWorkflow,
  channel: string,
): CampaignWorkflow {
  const next = normalizeWorkflow(workflow);
  if (channel !== "whatsapp" && channel !== "sms") return next;
  if (!sendsMessage(next)) return next;

  const conditions = [...next.conditions];
  if (!conditions.some((c) => c.type === "marketing_opted_in")) {
    conditions.unshift(node("marketing_opted_in"));
  }
  if (!conditions.some((c) => c.type === "has_phone")) {
    const optInIdx = conditions.findIndex((c) => c.type === "marketing_opted_in");
    conditions.splice(optInIdx + 1, 0, node("has_phone"));
  }
  return { ...next, conditions };
}

export function applyWorkflowHintFix(
  workflow: CampaignWorkflow,
  hintId: string,
  channel: string,
): CampaignWorkflow | null {
  if (hintId === "add-opt-in") {
    if (hasCondition(workflow, "marketing_opted_in")) return workflow;
    return {
      ...workflow,
      conditions: [node("marketing_opted_in"), ...workflow.conditions],
    };
  }
  if (hintId === "add-phone") {
    if (hasCondition(workflow, "has_phone")) return workflow;
    const conditions = [...workflow.conditions];
    const optInIdx = conditions.findIndex((c) => c.type === "marketing_opted_in");
    conditions.splice(optInIdx === -1 ? 0 : optInIdx + 1, 0, node("has_phone"));
    return { ...workflow, conditions };
  }
  if (hintId === "add-wait") {
    if (waitBeforeSend(workflow)) return workflow;
    const sendIdx = workflow.actions.findIndex(
      (a) => a.type === "send_whatsapp" || a.type === "send_sms",
    );
    const wait = node("wait", {
      amount: workflow.trigger.type === "member_joined" ? 5 : workflow.trigger.type === "order_paid" ? 24 : 1,
      unit: workflow.trigger.type === "member_joined" ? "minutes" : "hours",
    });
    if (sendIdx === -1) {
      return { ...workflow, actions: [wait, ...workflow.actions] };
    }
    const actions = [...workflow.actions];
    actions.splice(sendIdx, 0, wait);
    return { ...workflow, actions };
  }
  if (hintId === "longer-welcome-wait" || hintId === "longer-review-wait") {
    const actions = workflow.actions.map((action) => {
      if (action.type !== "wait") return action;
      if (hintId === "longer-welcome-wait") {
        return { ...action, config: { ...action.config, amount: 1, unit: "hours" } };
      }
      return { ...action, config: { ...action.config, amount: 24, unit: "hours" } };
    });
    return { ...workflow, actions };
  }
  if (hintId === "winback-window") {
    return {
      ...workflow,
      trigger: {
        ...workflow.trigger,
        config: { ...workflow.trigger.config, days: 30 },
      },
    };
  }
  if (hintId === "space-sends") {
    const actions: CampaignNode[] = [];
    let sawSend = false;
    for (const action of workflow.actions) {
      if (
        sawSend &&
        (action.type === "send_whatsapp" || action.type === "send_sms")
      ) {
        actions.push(node("wait", { amount: 48, unit: "hours" }));
      }
      actions.push(action);
      if (action.type === "send_whatsapp" || action.type === "send_sms") sawSend = true;
    }
    return { ...workflow, actions };
  }
  if (hintId === "voucher-before-send") {
    return normalizeWorkflow(workflow);
  }
  if (hintId === "winback-voucher") {
    if (hasAction(workflow, "issue_voucher")) return workflow;
    return normalizeWorkflow({
      ...workflow,
      actions: [
        node("issue_voucher", { name: "Come back", discountPercent: 20, expiryDays: 14 }),
        ...workflow.actions,
      ],
    });
  }
  if (hintId === "empty-actions") {
    const suggestion = suggestPathForTrigger(workflow.trigger.type, channel);
    if (!suggestion) return null;
    return applyWorkflowSuggestion(workflow, suggestion);
  }
  return null;
}

export function suggestionSummary(workflow: CampaignWorkflow): string {
  return `When: ${nodeSummary(workflow.trigger)}`;
}

export function isAllowedNodeForChannel(type: string, channel: string): boolean {
  const def = findNodeDefinition(type);
  if (!def) return false;
  if (def.comingSoon) return false;
  if (!def.channels) return true;
  return def.channels.includes(channel as "whatsapp" | "sms" | "banner");
}
