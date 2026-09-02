"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Campaign } from "@/components/admin/campaigns/types";
import { NodeInspector } from "@/components/admin/campaigns/NodeInspector";
import {
  dotGridClass,
  labelClass,
  WorkflowDropZone,
  WorkflowNodeCard,
  WorkflowToolboxItem,
} from "@/components/admin/campaigns/visual-editor-parts";
import { WhatsAppApprovalPanel } from "@/components/admin/campaigns/WhatsAppApprovalPanel";
import { WhatsAppPhonePreview } from "@/components/admin/campaigns/campaign-review-parts";
import { Icon } from "@/components/ui/Icon";
import {
  isTemplateSendable,
  templateMatchesMessage,
} from "@/lib/whatsapp/template-spec";
import {
  ACTION_DEFINITIONS,
  CONDITION_DEFINITIONS,
  createNode,
  findNodeDefinition,
  nodeSummary,
  TRIGGER_DEFINITIONS,
  validateWorkflow,
  workflowBannerFields,
  workflowMessageBody,
  workflowWhatsAppCompliance,
  type CampaignNode,
  type CampaignWorkflow,
  type NodeConfig,
  type NodeDefinition,
} from "@/lib/campaigns/workflow-spec";
import {
  analyzeWorkflow,
  applyWorkflowHintFix,
  applyWorkflowSuggestion,
  isThinWorkflow,
  suggestPathForTrigger,
  withMessagingGuards,
  workflowMatchesSuggestion,
} from "@/lib/campaigns/workflow-intelligence";
import type { LocalizedMap } from "@/lib/i18n/program-locale";

type Branch = "conditions" | "actions" | "elseActions";

type CampaignVisualEditorProps = {
  campaign: Campaign;
  merchantSlug: string;
  merchantName: string;
  currency: string;
  /** Reward level names for the "Member level" condition. */
  tierOptions: { value: string; label: string }[];
  workflow: CampaignWorkflow;
  onWorkflowChange: (next: CampaignWorkflow) => void;
  name: string;
  onNameChange: (name: string) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  saving?: boolean;
  backLabel?: string;
  continueLabel?: string;
  /** Inside the wizard: no breadcrumb header, tighter height. */
  embedded?: boolean;
  /** Saves the draft, then submits the WhatsApp copy to Meta for template review. */
  onSubmitForApproval?: () => Promise<void>;
  /** Re-checks Meta for a pending review. */
  onRefreshApproval?: () => Promise<void>;
  /** Optional multi-language template bodies for the phone preview switcher. */
  previewMessageBodies?: LocalizedMap | null;
  previewLanguages?: string[];
};

/** Plain words instead of trigger / condition / action — merchants read the canvas as a sentence. */
const KIND_LABEL = { trigger: "When", condition: "Only if", action: "Then" } as const;

/** One-line, plain-English reading of the whole workflow. */
function WorkflowSentence({ workflow }: { workflow: CampaignWorkflow }) {
  const parts: string[] = [`When: ${nodeSummary(workflow.trigger)}`];
  if (workflow.conditions.length > 0) {
    parts.push(`only if ${workflow.conditions.map(nodeSummary).join(" and ")}`);
  }
  parts.push(
    workflow.actions.length > 0
      ? `then ${workflow.actions.map(nodeSummary).join(", then ")}`
      : "then… (add a step)",
  );
  if (workflow.elseActions.length > 0) {
    parts.push(`otherwise ${workflow.elseActions.map(nodeSummary).join(", then ")}`);
  }
  return (
    <p className="mb-4 rounded-md border border-outline-variant/60 bg-white/80 px-3 py-2 text-[12px] leading-relaxed text-on-surface">
      <Icon name="auto_stories" className="mr-1.5 align-[-3px] text-[15px] text-on-surface-variant" />
      {parts.join(" → ")}
    </p>
  );
}

const DRAG_MIME = "application/x-irewards-node";

function FlowConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      {label && (
        <span className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
          {label}
        </span>
      )}
      <span className="h-3 w-px bg-on-surface/20" />
      <Icon name="arrow_downward" className="text-sm text-on-surface-variant" />
    </div>
  );
}

export function LiveMobilePreview({
  merchantName,
  messageBody,
  headerImageUrl,
  channel,
  messageBodies,
  previewLanguages,
}: {
  merchantName: string;
  messageBody: string;
  headerImageUrl: string | null;
  channel: "whatsapp" | "sms";
  messageBodies?: LocalizedMap | null;
  previewLanguages?: string[];
}) {
  return (
    <WhatsAppPhonePreview
      merchantName={merchantName}
      messageBody={messageBody}
      headerImageUrl={headerImageUrl}
      channel={channel}
      title="Live mobile preview"
      widthClassName="w-[220px]"
      messageBodies={messageBodies}
      previewLanguages={previewLanguages}
    />
  );
}

function BannerPreview({ workflow }: { workflow: CampaignWorkflow }) {
  const banner = workflowBannerFields(workflow);
  return (
    <div>
      <p className={labelClass}>Table menu preview</p>
      <div className="mt-3 overflow-hidden border border-surface-container-highest bg-white">
        {banner?.banner_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner.banner_image_url} alt="" className="h-24 w-full object-cover" />
        )}
        <div className="bg-[#1a3d2e] px-3 py-2.5 text-white">
          <p className="text-[12px] font-semibold">{banner?.banner_title || "Your headline"}</p>
          <p className="mt-0.5 text-[10px] opacity-90">
            {banner?.banner_text || "Banner copy shows here when diners open the menu."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CampaignVisualEditor({
  campaign,
  merchantSlug,
  merchantName,
  currency,
  tierOptions,
  workflow,
  onWorkflowChange,
  name,
  onNameChange,
  onBack,
  onSaveDraft,
  onContinue,
  saving = false,
  backLabel = "Back",
  continueLabel = "Continue",
  embedded = false,
  onSubmitForApproval,
  onRefreshApproval,
  previewMessageBodies = null,
  previewLanguages,
}: CampaignVisualEditorProps) {
  const channel = campaign.channel as "whatsapp" | "sms" | "banner";
  const [selectedId, setSelectedId] = useState<string>(workflow.trigger.id);
  const [dragType, setDragType] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  // The "otherwise" path is advanced; keep it out of the way until it is used.
  const [showElse, setShowElse] = useState(workflow.elseActions.length > 0);

  const allNodes = useMemo(
    () => [workflow.trigger, ...workflow.conditions, ...workflow.actions, ...workflow.elseActions],
    [workflow],
  );
  const selected = allNodes.find((n) => n.id === selectedId) ?? null;

  // A removed node must not stay selected.
  useEffect(() => {
    if (!allNodes.some((n) => n.id === selectedId)) setSelectedId(workflow.trigger.id);
  }, [allNodes, selectedId, workflow.trigger.id]);

  const issues = useMemo(() => validateWorkflow(workflow, channel), [workflow, channel]);
  const hints = useMemo(() => analyzeWorkflow(workflow, channel), [workflow, channel]);
  const pathSuggestion = useMemo(
    () => suggestPathForTrigger(workflow.trigger.type, channel),
    [workflow.trigger.type, channel],
  );
  const showPathSuggestion = Boolean(
    pathSuggestion &&
      isThinWorkflow(workflow, channel) &&
      !workflowMatchesSuggestion(workflow, pathSuggestion),
  );
  const messageBody = useMemo(() => workflowMessageBody(workflow) ?? "", [workflow]);
  const metaBlockers = useMemo(
    () =>
      channel === "whatsapp"
        ? (workflowWhatsAppCompliance(workflow, merchantName)?.blockers ?? []).map((b) =>
            b.hint ? `${b.message} ${b.hint}` : b.message,
          )
        : [],
    [workflow, channel, merchantName],
  );
  const headerImageUrl = useMemo(() => {
    const action = workflow.actions.find((a) => a.type === "send_whatsapp");
    const template = action?.config.template as { headerImageUrl?: string | null } | undefined;
    return template?.headerImageUrl ?? null;
  }, [workflow]);

  const metaStatus = useMemo(() => {
    if (channel !== "whatsapp") return null;
    const tpl = campaign.whatsappTemplate;
    const drifted = !!tpl && !templateMatchesMessage(tpl.bodyText, messageBody);
    if (metaBlockers.length > 0) {
      return { tone: "warn" as const, text: "Fix the message before submitting to Meta." };
    }
    if (!tpl || tpl.status === "draft") {
      return { tone: "warn" as const, text: "Submit the message to Meta before this campaign can send." };
    }
    if (tpl.status === "pending" && !drifted) {
      return { tone: "pending" as const, text: "Waiting for Meta approval — can't go live yet." };
    }
    if (drifted) {
      return { tone: "warn" as const, text: "Message changed — submit the updated copy to Meta." };
    }
    if (tpl.status === "rejected" || tpl.status === "failed") {
      return { tone: "bad" as const, text: "Meta declined this message — edit and submit again." };
    }
    if (isTemplateSendable(tpl)) {
      return { tone: "good" as const, text: "Meta approved — ready to go live." };
    }
    return { tone: "warn" as const, text: "Check Meta status before going live." };
  }, [channel, campaign.whatsappTemplate, messageBody, metaBlockers.length]);

  const allowed = useCallback(
    (definition: NodeDefinition) =>
      !definition.comingSoon && (!definition.channels || definition.channels.includes(channel)),
    [channel],
  );

  /* ---- graph edits ------------------------------------------------------ */

  function setTrigger(type: string) {
    const trigger = createNode(type);
    onWorkflowChange({ ...workflow, trigger });
    setSelectedId(trigger.id);
  }

  function addNode(type: string, branch: Branch, insertIndex?: number) {
    const created = createNode(type);
    const list = [...workflow[branch]];
    if (insertIndex === undefined) {
      list.push(created);
    } else {
      list.splice(insertIndex, 0, created);
    }
    const next = withMessagingGuards({ ...workflow, [branch]: list }, channel);
    onWorkflowChange(next);
    setSelectedId(created.id);
  }

  function applyHint(hintId: string) {
    const fixed = applyWorkflowHintFix(workflow, hintId, channel);
    if (!fixed) return;
    onWorkflowChange(withMessagingGuards(fixed, channel));
  }

  function applySuggestion() {
    if (!pathSuggestion) return;
    const next = applyWorkflowSuggestion(workflow, pathSuggestion);
    onWorkflowChange(withMessagingGuards(next, channel));
    setSelectedId(next.trigger.id);
  }

  function branchOf(id: string): Branch | null {
    if (workflow.conditions.some((n) => n.id === id)) return "conditions";
    if (workflow.actions.some((n) => n.id === id)) return "actions";
    if (workflow.elseActions.some((n) => n.id === id)) return "elseActions";
    return null;
  }

  function removeNode(id: string) {
    const branch = branchOf(id);
    if (!branch) return;
    onWorkflowChange({ ...workflow, [branch]: workflow[branch].filter((n) => n.id !== id) });
  }

  function moveNode(id: string, delta: -1 | 1) {
    const branch = branchOf(id);
    if (!branch) return;
    const list = [...workflow[branch]];
    const index = list.findIndex((n) => n.id === id);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    onWorkflowChange({ ...workflow, [branch]: list });
  }

  /** Replace a step with a different one of the same kind, in the same slot. */
  function replaceNodeType(id: string, type: string) {
    const definition = findNodeDefinition(type);
    if (!definition) return;
    const swap = (n: CampaignNode) =>
      n.id === id ? { ...createNode(type), id } : n;
    onWorkflowChange({
      ...workflow,
      trigger: swap(workflow.trigger),
      conditions: workflow.conditions.map(swap),
      actions: workflow.actions.map(swap),
      elseActions: workflow.elseActions.map(swap),
    });
  }

  function updateConfig(id: string, patch: NodeConfig) {
    const apply = (n: CampaignNode) => (n.id === id ? { ...n, config: { ...n.config, ...patch } } : n);
    onWorkflowChange({
      ...workflow,
      trigger: apply(workflow.trigger),
      conditions: workflow.conditions.map(apply),
      actions: workflow.actions.map(apply),
      elseActions: workflow.elseActions.map(apply),
    });
  }

  /** Drop a toolbox item where it belongs: triggers replace, others append or insert. */
  function handleAdd(type: string, preferredBranch?: Branch, insertIndex?: number) {
    const definition = findNodeDefinition(type);
    if (!definition || !allowed(definition)) return;
    if (definition.kind === "trigger") setTrigger(type);
    else if (definition.kind === "condition") addNode(type, "conditions", insertIndex);
    else addNode(type, preferredBranch === "elseActions" ? "elseActions" : "actions", insertIndex);
  }

  /* ---- drag & drop ------------------------------------------------------ */

  function onDragStart(event: React.DragEvent, type: string) {
    event.dataTransfer.setData(DRAG_MIME, type);
    event.dataTransfer.effectAllowed = "copy";
    setDragType(type);
  }

  function dragKind(): NodeDefinition["kind"] | null {
    return dragType ? (findNodeDefinition(dragType)?.kind ?? null) : null;
  }

  function zoneProps(
    zone: string,
    accepts: NodeDefinition["kind"],
    branch?: Branch,
    insertIndex?: number,
  ) {
    return {
      active: activeZone === zone && dragKind() === accepts,
      onDragOver: (event: React.DragEvent) => {
        if (dragKind() !== accepts) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setActiveZone(zone);
      },
      onDragLeave: () => setActiveZone((current) => (current === zone ? null : current)),
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        const type = event.dataTransfer.getData(DRAG_MIME) || dragType;
        setActiveZone(null);
        setDragType(null);
        if (type) handleAdd(type, branch, insertIndex);
      },
    };
  }

  /* ---- render ----------------------------------------------------------- */

  const renderCard = (node: CampaignNode, index: number, list: CampaignNode[]) => {
    const definition = findNodeDefinition(node.type);
    return (
      <WorkflowNodeCard
        key={node.id}
        kind={node.kind}
        kindLabel={KIND_LABEL[node.kind]}
        icon={definition?.icon ?? "help"}
        title={nodeSummary(node)}
        subtitle={definition?.comingSoon ? "Not active yet — coming soon" : undefined}
        selected={selectedId === node.id}
        invalid={!definition}
        onClick={() => setSelectedId(node.id)}
        onRemove={node.kind === "trigger" ? undefined : () => removeNode(node.id)}
        onMoveUp={index > 0 ? () => moveNode(node.id, -1) : undefined}
        onMoveDown={index < list.length - 1 ? () => moveNode(node.id, 1) : undefined}
      />
    );
  };

  const renderBranch = (branch: "actions" | "elseActions", label: string) => {
    const list = workflow[branch];
    const draggingAction = dragKind() === "action";
    return (
      <div className="flex flex-col gap-2">
        {list.map((node, i) => (
          <div key={node.id}>
            {i > 0 && <FlowConnector />}
            {draggingAction && (
              <WorkflowDropZone
                label="Drop to insert here"
                compact
                {...zoneProps(`${branch}-before-${i}`, "action", branch, i)}
              />
            )}
            {renderCard(node, i, list)}
          </div>
        ))}
        <WorkflowDropZone
          label={list.length === 0 ? `Add an action for ${label}` : "Drop to add another action"}
          placeholder={list.length === 0}
          {...zoneProps(`${branch}-end`, "action", branch)}
        />
      </div>
    );
  };

  const toolboxGroups: { title: string; hint: string; definitions: NodeDefinition[]; branch?: Branch }[] = [
    { title: "Start when…", hint: "Pick what kicks this off", definitions: TRIGGER_DEFINITIONS },
    { title: "Only for…", hint: "Optional: narrow who gets it", definitions: CONDITION_DEFINITIONS, branch: "conditions" },
    { title: "Then do…", hint: "What happens, in order", definitions: ACTION_DEFINITIONS, branch: "actions" },
  ];

  const availableCount = toolboxGroups.reduce(
    (sum, group) => sum + group.definitions.filter((definition) => allowed(definition)).length,
    0,
  );

  const renderToolboxItems = (compact: boolean) =>
    toolboxGroups.map((group) => (
      <div key={group.title} className={compact ? "shrink-0" : ""}>
        {!compact && (
          <>
            <p className="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
              {group.title}
            </p>
            <p className="mb-2 text-[10px] text-on-surface-variant/80">{group.hint}</p>
          </>
        )}
        <div className={compact ? "flex gap-2" : "space-y-2"}>
          {group.definitions.map((definition) => (
            <WorkflowToolboxItem
              key={definition.type}
              label={definition.label}
              icon={definition.icon}
              description={definition.description}
              disabled={!allowed(definition)}
              compact={compact}
              onAdd={() => handleAdd(definition.type, group.branch)}
              onDragStart={(event) => onDragStart(event, definition.type)}
            />
          ))}
        </div>
      </div>
    ));

  const triggerZone = zoneProps("trigger", "trigger");

  return (
    <div
      className={`flex flex-col ${embedded ? "max-h-[calc(100dvh-10.5rem)]" : "max-h-[calc(100dvh-8rem)]"}`}
    >
      {!embedded && (
        <div className="mb-4 shrink-0">
          <nav className="flex flex-wrap items-center gap-1 text-body-md text-on-surface-variant">
            <button type="button" onClick={onBack} className="hover:text-primary hover:underline">
              {backLabel}
            </button>
            <Icon name="chevron_right" className="text-sm" />
            <span className="font-medium text-primary">Workflow builder</span>
          </nav>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            aria-label="Campaign name"
            className="mt-2 w-full max-w-xl border-b border-transparent bg-transparent font-display text-headline-md text-primary outline-none hover:border-surface-container-highest focus:border-primary"
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-on-surface/15 bg-surface-container-lowest lg:flex-row">
        {/* Compact toolbox — visible when the sidebar is hidden */}
        <div className="shrink-0 border-b border-surface-container-highest bg-surface-container-low p-3 md:hidden">
          <p className={labelClass}>Building blocks · drag onto the canvas</p>
          <p className="mt-1 text-[10px] text-on-surface-variant">
            {availableCount} steps available for this channel — scroll sideways
          </p>
          <div className="mt-2 flex gap-4 overflow-x-auto pb-1">{renderToolboxItems(true)}</div>
        </div>

        {/* Toolbox */}
        <aside className="hidden w-[272px] shrink-0 overflow-y-auto border-r border-surface-container-highest bg-surface-container-low p-4 md:block">
          <p className={labelClass}>Building blocks</p>
          <p className="mt-1 text-[11px] leading-snug text-on-surface-variant">
            Drag a step onto the canvas, or tap to add it. You can stack multiple conditions and
            actions — drop between steps to insert in the middle.
          </p>
          <p className="mt-2 text-[10px] font-medium text-primary">
            {availableCount} steps for this campaign
          </p>
          <div className="mt-3 space-y-5">{renderToolboxItems(false)}</div>
        </aside>

        {/* Canvas */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto ${dotGridClass} p-6`}
          onDragEnd={() => {
            setDragType(null);
            setActiveZone(null);
          }}
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col">
            {(showPathSuggestion || hints.length > 0) && (
              <div className="mb-4 space-y-2">
                {showPathSuggestion && pathSuggestion && (
                  <div className="flex flex-col gap-2 rounded-lg border border-[#1a3d2e]/20 bg-[#1a3d2e]/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1a3d2e]">
                        <Icon name="auto_awesome" className="text-[16px]" />
                        Suggested path · {pathSuggestion.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-on-surface-variant">
                        {pathSuggestion.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={applySuggestion}
                      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#1a3d2e] px-3 text-[11px] font-medium text-white hover:opacity-90"
                    >
                      <Icon name="bolt" className="text-[14px]" />
                      Apply
                    </button>
                  </div>
                )}
                {hints.slice(0, 3).map((hint) => (
                  <div
                    key={hint.id}
                    className={`flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
                      hint.severity === "fix"
                        ? "border-amber-200 bg-amber-50"
                        : "border-surface-container-highest bg-white/80"
                    }`}
                  >
                    <p
                      className={`flex items-start gap-1.5 text-[11px] leading-snug ${
                        hint.severity === "fix" ? "text-amber-900" : "text-on-surface-variant"
                      }`}
                    >
                      <Icon
                        name={hint.severity === "fix" ? "lightbulb" : "tips_and_updates"}
                        className="mt-px shrink-0 text-[14px]"
                      />
                      {hint.message}
                    </p>
                    {hint.fixLabel && (
                      <button
                        type="button"
                        onClick={() => applyHint(hint.id)}
                        className="inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-on-surface/20 bg-white px-2.5 text-[11px] font-medium text-on-surface hover:bg-surface-container-low"
                      >
                        {hint.fixLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <WorkflowSentence workflow={workflow} />
            <div
              onDragOver={triggerZone.onDragOver}
              onDragLeave={triggerZone.onDragLeave}
              onDrop={triggerZone.onDrop}
              className={triggerZone.active ? "rounded-lg ring-2 ring-[#1a3d2e]/40" : ""}
            >
              {renderCard(workflow.trigger, 0, [workflow.trigger])}
            </div>

            <FlowConnector />

            <div className="flex flex-col gap-2">
              {workflow.conditions.map((node, i) => (
                <div key={node.id}>
                  {i > 0 && <FlowConnector label="and" />}
                  {dragKind() === "condition" && (
                    <WorkflowDropZone
                      label="Drop to insert here"
                      compact
                      {...zoneProps(`conditions-before-${i}`, "condition", "conditions", i)}
                    />
                  )}
                  {renderCard(node, i, workflow.conditions)}
                </div>
              ))}
              <WorkflowDropZone
                label={
                  workflow.conditions.length === 0
                    ? "Optional: only for certain members — pick from “Only for…”"
                    : "Drop to add another check"
                }
                placeholder={workflow.conditions.length === 0}
                {...zoneProps("conditions-end", "condition", "conditions")}
              />
            </div>

            {workflow.conditions.length > 0 && showElse ? (
              <div className="mt-1 grid gap-4 md:grid-cols-2">
                <div>
                  <FlowConnector label="Yes" />
                  {renderBranch("actions", "members who pass the check")}
                </div>
                <div>
                  <FlowConnector label="Otherwise" />
                  {renderBranch("elseActions", "members who don't")}
                  {workflow.elseActions.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setShowElse(false)}
                      className="mt-2 w-full text-center text-[11px] text-on-surface-variant hover:text-on-surface hover:underline"
                    >
                      Hide the “otherwise” path
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <FlowConnector label={workflow.conditions.length > 0 ? "Yes" : undefined} />
                {renderBranch("actions", "this campaign")}
                {workflow.conditions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowElse(true)}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-on-surface hover:underline"
                  >
                    <Icon name="alt_route" className="text-[14px]" />
                    Do something different for members who don&apos;t pass the check
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Inspector */}
        <aside className="min-h-0 w-full shrink-0 overflow-y-auto border-t border-surface-container-highest bg-surface-container-lowest p-4 lg:w-[min(100%,340px)] lg:border-l lg:border-t-0">
          <div className="space-y-5">
            <NodeInspector
              node={selected}
              merchantSlug={merchantSlug}
              merchantName={merchantName}
              currency={currency}
              tierOptions={tierOptions}
              onConfigChange={(patch) => selected && updateConfig(selected.id, patch)}
              typeOptions={
                selected
                  ? (selected.kind === "trigger"
                      ? TRIGGER_DEFINITIONS
                      : selected.kind === "condition"
                        ? CONDITION_DEFINITIONS
                        : ACTION_DEFINITIONS
                    ).filter((d) => allowed(d) || d.type === selected.type)
                  : []
              }
              onTypeChange={(type) => selected && replaceNodeType(selected.id, type)}
            />

            {(channel === "whatsapp" || channel === "sms") && (
              <LiveMobilePreview
                merchantName={merchantName}
                messageBody={messageBody}
                headerImageUrl={headerImageUrl}
                channel={channel}
                messageBodies={previewMessageBodies}
                previewLanguages={previewLanguages}
              />
            )}
            {channel === "banner" && <BannerPreview workflow={workflow} />}

            {channel === "whatsapp" && (
              <WhatsAppApprovalPanel
                campaignId={campaign.id === "wizard-draft" ? null : campaign.id}
                template={campaign.whatsappTemplate}
                messageBody={messageBody}
                busy={saving}
                blockers={metaBlockers}
                onSubmit={onSubmitForApproval}
                onRefresh={onRefreshApproval}
              />
            )}
          </div>
        </aside>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border border-t border-on-surface/15 bg-surface-container-lowest px-4 py-3">
        <div className="min-w-0 flex-1 text-[11px] leading-snug">
          {metaStatus ? (
            <span
              className={`inline-flex items-center gap-1.5 ${
                metaStatus.tone === "good"
                  ? "text-emerald-700"
                  : metaStatus.tone === "bad"
                    ? "text-red-700"
                    : metaStatus.tone === "pending"
                      ? "text-amber-800"
                      : "text-amber-800"
              }`}
            >
              <Icon
                name={
                  metaStatus.tone === "good"
                    ? "verified"
                    : metaStatus.tone === "pending"
                      ? "hourglass_top"
                      : "info"
                }
                className="text-[14px]"
              />
              {metaStatus.text}
            </span>
          ) : issues.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <Icon name="check_circle" className="text-[14px]" />
              Workflow looks good.
            </span>
          ) : (
            <ul className="space-y-0.5 text-amber-800">
              {issues.slice(0, 3).map((issue) => (
                <li key={issue} className="flex items-start gap-1.5">
                  <Icon name="warning" className="mt-px text-[14px]" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving}
            className="h-10 min-w-[120px] border border-on-surface bg-surface-container-lowest px-5 font-mono text-[11px] uppercase tracking-widest hover:bg-surface-container-low disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={saving}
            className="h-10 min-w-[120px] bg-[#1a3d2e] px-5 font-mono text-[11px] uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
