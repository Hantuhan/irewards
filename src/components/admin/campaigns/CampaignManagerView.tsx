"use client";

import { useEffect, useMemo, useState } from "react";
import { CampaignComposerView } from "@/components/admin/campaigns/CampaignComposerView";
import { CampaignDetailReport } from "@/components/admin/campaigns/CampaignDetailReport";
import { CampaignOverviewView } from "@/components/admin/campaigns/CampaignOverviewView";
import { CampaignReviewStep } from "@/components/admin/campaigns/CampaignReviewStep";
import { CreateCampaignChoiceModal } from "@/components/admin/campaigns/CreateCampaignChoiceModal";
import {
  CampaignVisualEditor,
} from "@/components/admin/campaigns/CampaignVisualEditor";
import type { Campaign } from "@/components/admin/campaigns/types";
import { labelClass } from "@/components/admin/campaigns/visual-editor-parts";
import { Icon } from "@/components/ui/Icon";
import type { ComposerPlan } from "@/lib/ai/campaign-composer";
import { CAMPAIGN_CHANNELS, type CampaignChannel, campaignChannelLabel } from "@/lib/campaigns/channels";
import { workflowFromCampaign } from "@/lib/campaigns/workflow-from-campaign";
import {
  defaultWorkflowForChannel,
  validateWorkflow,
  workflowMessageBody,
  workflowWhatsAppCompliance,
  type CampaignWorkflow,
} from "@/lib/campaigns/workflow-spec";
import {
  CAMPAIGN_WORKFLOW_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type CampaignWorkflowTemplate,
  type TemplateCategory,
} from "@/lib/campaigns/workflow-templates";
import { merchantApi } from "@/lib/merchant/fetch";
import type { ProgramLanguage } from "@/lib/i18n/program-locale";
import type { NumberHealthSummary } from "@/lib/whatsapp/number-health";

export type { Campaign } from "@/components/admin/campaigns/types";

type CampaignManagerViewProps = {
  merchantSlug: string;
  merchantName: string;
  currency?: "MYR" | "SGD";
  campaigns: Campaign[];
  onCampaignsChange: () => Promise<void>;
  /** Master switch for triggered campaigns, shown on the overview. */
  automationsEnabled: boolean;
  savingSwitch?: boolean;
  onToggleAutomations: (enabled: boolean) => void;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  sendCapHours?: number;
  onSaveSendHygiene?: (patch: {
    campaignSendWindowStart?: string | null;
    campaignSendWindowEnd?: string | null;
    campaignSendCapHours?: number;
  }) => Promise<void>;
  /** Merchant storefront / program languages for template copy. */
  programLanguages?: string[];
  /** Opens this campaign's report on mount / when it changes (`?campaign=` deep link). */
  openCampaignId?: string | null;
  /** Meta quality rating of the sender number. */
  numberHealth?: NumberHealthSummary | null;
  /** `?compose=1`: open the AI planner instead of the overview. */
  startCompose?: boolean;
};

type ManagerMode = "overview" | "library" | "report" | "wizard" | "visual" | "compose";
type WizardStep = "basics" | "audience" | "content" | "review";

const WIZARD_STEPS: { id: WizardStep; label: string; num: number }[] = [
  { id: "basics", label: "Basics", num: 1 },
  { id: "audience", label: "Audience", num: 2 },
  { id: "content", label: "Workflow", num: 3 },
  { id: "review", label: "Review", num: 4 },
];

type TierOption = { value: string; label: string };
const ANY_TIER: TierOption = { value: "", label: "Any level" };

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-emerald-600"
      : status === "scheduled"
        ? "bg-amber-500"
        : "bg-outline-variant";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />;
}

export function CampaignManagerView({
  merchantSlug,
  merchantName,
  currency = "MYR",
  campaigns,
  onCampaignsChange,
  automationsEnabled,
  savingSwitch = false,
  onToggleAutomations,
  sendWindowStart = "",
  sendWindowEnd = "",
  sendCapHours = 48,
  onSaveSendHygiene,
  programLanguages = ["en"],
  openCampaignId = null,
  numberHealth = null,
  startCompose = false,
}: CampaignManagerViewProps) {
  const [mode, setMode] = useState<ManagerMode>(startCompose ? "compose" : "overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportCampaign, setReportCampaign] = useState<Campaign | null>(null);
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory | "all">("all");
  const [showCreateChoice, setShowCreateChoice] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [tierOptions, setTierOptions] = useState<TierOption[]>([ANY_TIER]);

  // Wizard (new campaign)
  const [wizardStep, setWizardStep] = useState<WizardStep>("basics");
  const [wizardTemplate, setWizardTemplate] = useState<CampaignWorkflowTemplate | null>(null);
  const [wizardForm, setWizardForm] = useState({
    name: "",
    channel: "whatsapp" as CampaignChannel,
    goal: "retention",
  });
  const [wizardWorkflow, setWizardWorkflow] = useState<CampaignWorkflow>(() =>
    defaultWorkflowForChannel("whatsapp"),
  );

  // Builder (existing campaign)
  const [editName, setEditName] = useState("");
  const [editWorkflow, setEditWorkflow] = useState<CampaignWorkflow | null>(null);

  const manualCampaigns = useMemo(
    () => campaigns.filter((c) => c.channel !== "auto"),
    [campaigns],
  );

  const selected = useMemo(
    () => manualCampaigns.find((c) => c.id === selectedId) ?? null,
    [manualCampaigns, selectedId],
  );

  // Reset the builder when a different campaign is opened — not on every
  // reload of the list, which would throw away unsaved edits.
  useEffect(() => {
    if (!selected) {
      setEditWorkflow(null);
      return;
    }
    setEditName(selected.name);
    setEditWorkflow(workflowFromCampaign(selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (!openCampaignId) return;
    const target = campaigns.find((c) => c.id === openCampaignId);
    if (!target) return;
    setSelectedId(target.id);
    setReportCampaign(target);
    setMode("report");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCampaignId, campaigns.length]);

  useEffect(() => {
    let cancelled = false;
    merchantApi<{ levels?: { name: string }[] }>(`/api/merchant/${merchantSlug}/reward-levels`)
      .then((data) => {
        if (cancelled) return;
        const levels = (data.levels ?? []).map((l) => ({ value: l.name, label: l.name }));
        setTierOptions([ANY_TIER, ...levels]);
      })
      .catch(() => {
        /* the condition falls back to "Any level" */
      });
    return () => {
      cancelled = true;
    };
  }, [merchantSlug]);

  const templates = useMemo(() => {
    if (templateCategory === "all") return CAMPAIGN_WORKFLOW_TEMPLATES;
    return CAMPAIGN_WORKFLOW_TEMPLATES.filter((t) => t.category === templateCategory);
  }, [templateCategory]);

  const wizardDraftCampaign = useMemo(
    (): Campaign => ({
      id: "wizard-draft",
      name: wizardForm.name || wizardTemplate?.defaultName || "New campaign",
      channel: wizardForm.channel,
      channelLabel: campaignChannelLabel(wizardForm.channel),
      status: "draft",
      reach: 0,
      conversion: "—",
      messageBody: workflowMessageBody(wizardWorkflow),
      bannerTitle: null,
      bannerText: null,
      bannerImageUrl: null,
      linkUrl: null,
      createdAt: null,
      triggerType: wizardWorkflow.trigger.type,
      workflow: wizardWorkflow,
      whatsappTemplate: null,
    }),
    [wizardForm, wizardTemplate, wizardWorkflow],
  );

  /* ---- actions on existing campaigns ------------------------------------ */

  async function toggleCampaign(campaign: Campaign) {
    const next = campaign.status === "active" ? "paused" : "active";
    setSaving(true);
    setActionError(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/campaigns`, {
        method: "PATCH",
        body: JSON.stringify({ campaignId: campaign.id, status: next }),
      });
      await onCampaignsChange();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update campaign");
    } finally {
      setSaving(false);
    }
  }

  /** Manual broadcasts: queue one message per opted-in member. */
  async function sendCampaign(campaign: Campaign) {
    if (campaign.channel !== "whatsapp") return;
    setSendingId(campaign.id);
    setActionError(null);
    setActionNotice(null);
    try {
      const result = await merchantApi<{ ok: boolean; queued: number; message: string }>(
        `/api/merchant/${merchantSlug}/campaigns/send`,
        { method: "POST", body: JSON.stringify({ campaignId: campaign.id }) },
      );
      setActionNotice(
        result.queued > 0
          ? `Queued ${result.queued} message${result.queued === 1 ? "" : "s"} — they go out over the next few minutes.`
          : "No opted-in members with a phone number to send to yet.",
      );
      await onCampaignsChange();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not send campaign");
    } finally {
      setSendingId(null);
    }
  }

  /** Persists the builder's workflow; the server derives message and banner columns from it. */
  async function saveSelectedEdits(): Promise<boolean> {
    if (!selected || !editWorkflow) return false;
    setSaving(true);
    setActionError(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/campaigns`, {
        method: "PATCH",
        body: JSON.stringify({
          campaignId: selected.id,
          name: editName.trim() || selected.name,
          workflow: editWorkflow,
        }),
      });
      await onCampaignsChange();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save campaign");
      return false;
    } finally {
      setSaving(false);
    }
  }

  /** Save the current copy, then ask Meta to review it as a WhatsApp template. */
  async function submitForApproval() {
    if (!selected || selected.channel !== "whatsapp") return;
    const saved = await saveSelectedEdits();
    if (!saved) return;
    setSaving(true);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/campaigns/whatsapp-template`, {
        method: "POST",
        body: JSON.stringify({ campaignId: selected.id }),
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not submit template");
    } finally {
      setSaving(false);
      await onCampaignsChange();
    }
  }

  async function refreshApproval() {
    if (!selected) return;
    setActionError(null);
    setSaving(true);
    try {
      await merchantApi(
        `/api/merchant/${merchantSlug}/campaigns/whatsapp-template?campaignId=${selected.id}&refresh=1`,
      );
      await onCampaignsChange();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not check status");
    } finally {
      setSaving(false);
    }
  }

  async function continueFromVisual() {
    const saved = await saveSelectedEdits();
    if (!saved) return;
    if (selected) setReportCampaign(selected);
    setMode("report");
  }

  /* ---- wizard ----------------------------------------------------------- */

  function preferredLang(): ProgramLanguage {
    const first = programLanguages[0];
    if (first === "zh" || first === "ms" || first === "en") return first;
    return "en";
  }

  function startWizardFromTemplate(template: CampaignWorkflowTemplate) {
    const lang = preferredLang();
    setWizardTemplate(template);
    setWizardForm({ name: template.defaultName, channel: template.channel, goal: template.category });
    setWizardWorkflow(template.workflow(lang));
    setWizardStep("content");
    setMode("wizard");
  }

  function resetWizardForm() {
    setWizardTemplate(null);
    setWizardForm({ name: "", channel: "whatsapp", goal: "retention" });
    setWizardWorkflow(defaultWorkflowForChannel("whatsapp"));
    setWizardStep("basics");
  }

  function changeWizardChannel(channel: CampaignChannel) {
    setWizardForm((prev) => ({ ...prev, channel }));
    // A template's steps only make sense on its own channel.
    if (wizardTemplate && wizardTemplate.channel === channel) {
      setWizardWorkflow(wizardTemplate.workflow(preferredLang()));
    } else setWizardWorkflow(defaultWorkflowForChannel(channel));
  }

  /** Creates the campaign as a draft; returns its id. */
  async function createWizardCampaign(): Promise<string | null> {
    if (!wizardForm.name.trim()) return null;
    setSaving(true);
    setActionError(null);
    try {
      const created = await merchantApi<{ id: string }>(`/api/merchant/${merchantSlug}/campaigns`, {
        method: "POST",
        body: JSON.stringify({
          name: wizardForm.name.trim(),
          channel: wizardForm.channel,
          status: "draft",
          workflow: wizardWorkflow,
        }),
      });
      await onCampaignsChange();
      return created.id;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not create campaign");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function finishWizard() {
    const id = await createWizardCampaign();
    if (!id) return;
    resetWizardForm();
    setMode("overview");
  }

  /** Review step, WhatsApp only: create the draft and send its copy to Meta in one go. */
  async function createAndSubmitWizardCampaign() {
    const id = await createWizardCampaign();
    if (!id) return;
    resetWizardForm();
    setSelectedId(id);
    setReportCampaign(null);
    setMode("visual");
    setSaving(true);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/campaigns/whatsapp-template`, {
        method: "POST",
        body: JSON.stringify({ campaignId: id }),
      });
      setActionNotice("Campaign created and sent to Meta for review — we'll update the status here automatically.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not submit template");
    } finally {
      setSaving(false);
      await onCampaignsChange();
    }
  }

  /** "Save draft" inside the wizard: create now so Meta approval can start, then keep editing. */
  async function saveWizardDraft() {
    const id = await createWizardCampaign();
    if (!id) return;
    resetWizardForm();
    setSelectedId(id);
    setReportCampaign(null);
    setMode("visual");
    setActionNotice("Draft created — you can now submit the message for Meta approval.");
  }

  const wizardIndex = WIZARD_STEPS.findIndex((s) => s.id === wizardStep);

  function nextWizardStep() {
    const next = WIZARD_STEPS[wizardIndex + 1];
    if (next) setWizardStep(next.id);
  }

  function prevWizardStep() {
    const prev = WIZARD_STEPS[wizardIndex - 1];
    if (prev) setWizardStep(prev.id);
  }

  function promptCreateCampaign() {
    setShowCreateChoice(true);
  }

  function startBlankCampaign() {
    setShowCreateChoice(false);
    resetWizardForm();
    setMode("wizard");
  }

  function startFromTemplate() {
    setShowCreateChoice(false);
    setMode("library");
  }

  function startComposer() {
    setShowCreateChoice(false);
    setMode("compose");
  }

  /** The planner's result becomes an unsaved wizard draft, opened at the Workflow step. */
  function openPlanInBuilder(plan: ComposerPlan) {
    setWizardTemplate(null);
    setWizardForm({ name: plan.name, channel: plan.channel, goal: plan.goal });
    setWizardWorkflow(plan.workflow);
    setWizardStep("content");
    setMode("wizard");
  }

  const createChoiceModal = showCreateChoice ? (
    <CreateCampaignChoiceModal
      onClose={() => setShowCreateChoice(false)}
      onDescribe={startComposer}
      onUseTemplate={startFromTemplate}
      onBlankCampaign={startBlankCampaign}
    />
  ) : null;

  function openCampaignDetails(campaign: Campaign) {
    setSelectedId(campaign.id);
    setReportCampaign(campaign);
    setMode("report");
  }

  const reportTarget = useMemo(() => {
    if (reportCampaign) {
      return campaigns.find((c) => c.id === reportCampaign.id) ?? reportCampaign;
    }
    return selected;
  }, [reportCampaign, campaigns, selected]);

  /* ---- shared chrome ---------------------------------------------------- */

  const banners = (
    <>
      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800"
        >
          <span className="flex items-start gap-2 whitespace-pre-line">
            <Icon name="error" className="mt-0.5 text-lg" />
            {actionError}
          </span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss" className="text-red-700">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}
      {actionNotice && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-body-md text-emerald-800"
        >
          <span className="flex items-start gap-2">
            <Icon name="check_circle" className="mt-0.5 text-lg" />
            {actionNotice}
          </span>
          <button type="button" onClick={() => setActionNotice(null)} aria-label="Dismiss" className="text-emerald-700">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}
    </>
  );

  const header =
    mode === "library" || mode === "wizard" || mode === "compose" ? (
      <div className="mb-6 flex flex-col gap-4 border-b border-surface-container-highest pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className={labelClass}>Campaign manager</p>
          <h2 className="mt-1 font-display text-headline-md text-primary">
            {mode === "library" ? "Workflow templates" : mode === "compose" ? "Describe your campaign" : "New campaign"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode !== "library" && (
            <button
              type="button"
              onClick={() => setMode("library")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-container-highest px-3 text-body-md text-on-surface-variant hover:bg-surface-container-low"
            >
              <Icon name="grid_view" className="text-base" />
              Templates
            </button>
          )}
          <button
            type="button"
            onClick={promptCreateCampaign}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-md font-medium text-on-primary hover:opacity-90"
          >
            <Icon name="add" className="text-base" />
            New campaign
          </button>
        </div>
      </div>
    ) : null;

  /* ---- modes ------------------------------------------------------------ */

  if (mode === "overview") {
    return (
      <>
        {banners}
        <CampaignOverviewView
          campaigns={campaigns}
          currency={currency}
          onCreateNew={promptCreateCampaign}
          onViewDetails={openCampaignDetails}
          automationsEnabled={automationsEnabled}
          savingSwitch={savingSwitch}
          onToggleAutomations={onToggleAutomations}
          sendWindowStart={sendWindowStart}
          sendWindowEnd={sendWindowEnd}
          sendCapHours={sendCapHours}
          onSaveSendHygiene={onSaveSendHygiene}
          numberHealth={numberHealth}
        />
        {createChoiceModal}
      </>
    );
  }

  if (mode === "compose") {
    return (
      <>
        <div>
          {header}
          {banners}
          <CampaignComposerView
            merchantSlug={merchantSlug}
            merchantName={merchantName}
            onOpenInBuilder={openPlanInBuilder}
            onCancel={() => setMode("overview")}
          />
        </div>
        {createChoiceModal}
      </>
    );
  }

  if (mode === "report" && reportTarget) {
    return (
      <>
        {banners}
        <CampaignDetailReport
          campaign={reportTarget}
          merchantSlug={merchantSlug}
          currency={currency}
          onBack={() => {
            setReportCampaign(null);
            setMode("overview");
          }}
          onEdit={() => setMode("visual")}
          onToggleLive={() => toggleCampaign(reportTarget)}
          toggling={saving}
          onSendBroadcast={
            reportTarget.channel === "whatsapp" &&
            (reportTarget.triggerType ?? "manual") === "manual"
              ? () => sendCampaign(reportTarget)
              : undefined
          }
          sending={sendingId === reportTarget.id}
        />
      </>
    );
  }

  if (mode === "library") {
    return (
      <>
        <div>
          {header}
          <div className="mb-6 flex gap-6 border-b border-surface-container-highest">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTemplateCategory(cat.id)}
                className={`pb-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  templateCategory === cat.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <p className="mb-6 max-w-2xl text-body-md text-on-surface-variant">
            Pre-built journeys and broadcast starters. Use a template, then adjust when it runs, who it
            reaches and what it says in the workflow builder.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map((template) => (
              <article
                key={template.id}
                className="flex flex-col border border-surface-container-highest bg-surface-container-lowest p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-surface-container-highest bg-surface-container-low">
                    <Icon name={template.icon} className="text-xl text-primary" />
                  </div>
                  <span className={labelClass}>{template.category}</span>
                </div>
                <h3 className="mt-4 font-display text-headline-sm text-primary">{template.title}</h3>
                <p className="mt-2 flex-1 text-body-md text-on-surface-variant">{template.description}</p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                  {template.triggerLabel}
                  {template.delayLabel ? ` · ${template.delayLabel}` : ""}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-container-highest pt-4">
                  <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                    <StatusDot status="draft" />
                    Ready to deploy
                  </span>
                  <button
                    type="button"
                    onClick={() => startWizardFromTemplate(template)}
                    className="rounded-lg bg-[#1a3d2e] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white hover:opacity-90"
                  >
                    Use template
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMode("overview")}
            className="mt-6 text-body-md text-primary underline-offset-2 hover:underline"
          >
            ← Back to overview
          </button>
        </div>
        {createChoiceModal}
      </>
    );
  }

  if (mode === "wizard") {
    const stepIndicator = (
      <div className="mb-8 flex items-center gap-2">
        {WIZARD_STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold ${
                wizardIndex >= i
                  ? "bg-primary text-on-primary"
                  : "border border-surface-container-highest text-on-surface-variant"
              }`}
            >
              {step.num}
            </div>
            <span
              className={`hidden font-mono text-[11px] uppercase tracking-wider sm:inline ${
                wizardStep === step.id ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              {step.label}
            </span>
            {i < WIZARD_STEPS.length - 1 && (
              <span className="mx-1 hidden h-px w-8 bg-surface-container-highest sm:block" />
            )}
          </div>
        ))}
      </div>
    );

    if (wizardStep === "content") {
      return (
        <>
          {banners}
          {stepIndicator}
          <CampaignVisualEditor
            campaign={wizardDraftCampaign}
            merchantSlug={merchantSlug}
            merchantName={merchantName}
            currency={currency}
            tierOptions={tierOptions}
            workflow={wizardWorkflow}
            onWorkflowChange={setWizardWorkflow}
            name={wizardForm.name}
            onNameChange={(name) => setWizardForm((prev) => ({ ...prev, name }))}
            onBack={prevWizardStep}
            backLabel="Audience"
            onSaveDraft={saveWizardDraft}
            onContinue={() => setWizardStep("review")}
            continueLabel="Review"
            saving={saving}
            embedded
            previewMessageBodies={wizardTemplate?.defaultMessageI18n}
            previewLanguages={programLanguages}
          />
          {createChoiceModal}
        </>
      );
    }

    const wizardIssues = validateWorkflow(wizardWorkflow, wizardForm.channel);
    const wizardMessage = workflowMessageBody(wizardWorkflow);
    const wizardCompliance =
      wizardForm.channel === "whatsapp" ? workflowWhatsAppCompliance(wizardWorkflow, merchantName) : null;
    const wizardBlocked = wizardIssues.length > 0 || (wizardCompliance ? !wizardCompliance.ok : false);

    return (
      <>
        <div>
          {header}
          {banners}
          {stepIndicator}

          <div
            className={`border border-surface-container-highest bg-surface-container-lowest p-6 md:p-8 ${
              wizardStep === "review" ? "max-w-5xl" : "max-w-2xl"
            }`}
          >
            {wizardStep === "basics" && (
              <>
                <h3 className="font-display text-headline-sm text-primary">Campaign basics</h3>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  Name and channel for your new {wizardForm.channel === "banner" ? "banner" : "message"} campaign.
                </p>
                <label className="mt-6 block">
                  <span className={labelClass}>Campaign name</span>
                  <input
                    value={wizardForm.name}
                    onChange={(e) => setWizardForm({ ...wizardForm, name: e.target.value })}
                    placeholder="e.g. Summer winback 2026"
                    className="mt-2 w-full border-b border-surface-container-highest bg-transparent py-2 text-body-md outline-none focus:border-primary"
                  />
                </label>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Channel</span>
                    {wizardTemplate ? (
                      <p className="mt-2 border-b border-surface-container-highest py-2 text-body-md text-primary">
                        {CAMPAIGN_CHANNELS.find((ch) => ch.id === wizardForm.channel)?.label ??
                          wizardForm.channel}
                        <span className="ml-2 text-[11px] text-on-surface-variant">(from template)</span>
                      </p>
                    ) : (
                      <select
                        value={wizardForm.channel}
                        onChange={(e) => changeWizardChannel(e.target.value as CampaignChannel)}
                        className="mt-2 w-full border-b border-surface-container-highest bg-transparent py-2 text-body-md outline-none"
                      >
                        {CAMPAIGN_CHANNELS.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                  <label className="block">
                    <span className={labelClass}>Primary goal</span>
                    <select
                      value={wizardForm.goal}
                      onChange={(e) => setWizardForm({ ...wizardForm, goal: e.target.value })}
                      className="mt-2 w-full border-b border-surface-container-highest bg-transparent py-2 text-body-md outline-none"
                    >
                      <option value="retention">Win back lapsed members</option>
                      <option value="acquisition">Welcome new visitors</option>
                      <option value="loyalty">Reward loyal members</option>
                    </select>
                  </label>
                </div>
              </>
            )}

            {wizardStep === "audience" && (
              <>
                <h3 className="font-display text-headline-sm text-primary">Audience</h3>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  Who this campaign can reach. Narrow it further with conditions in the workflow step.
                </p>
                <div className="mt-6 border border-surface-container-highest bg-surface-container-low p-4">
                  <p className="font-display text-headline-sm text-primary">
                    {wizardForm.channel === "banner" ? "Every diner who opens the menu" : "Opted-in members"}
                  </p>
                  <p className="mt-1 text-body-md text-on-surface-variant">
                    {wizardForm.channel === "banner"
                      ? "The banner shows to anyone who scans a table QR while the campaign is live."
                      : "Members who joined on WhatsApp, have a phone number on file and have not replied STOP. Add a Member level, Spend amount or Visit count condition to target a segment."}
                  </p>
                </div>
              </>
            )}

            {wizardStep === "review" && (
              <CampaignReviewStep
                name={wizardForm.name}
                channel={wizardForm.channel}
                goal={wizardForm.goal}
                workflow={wizardWorkflow}
                messageBody={wizardMessage}
                merchantName={merchantName}
                workflowIssues={wizardIssues}
                compliance={wizardCompliance}
                stepNum={WIZARD_STEPS[wizardIndex]?.num ?? 4}
                stepTotal={WIZARD_STEPS.length}
                previewMessageBodies={wizardTemplate?.defaultMessageI18n}
                previewLanguages={programLanguages}
              />
            )}

            <div className="mt-8 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (wizardIndex === 0) {
                    resetWizardForm();
                    setMode("overview");
                  } else {
                    prevWizardStep();
                  }
                }}
                className="text-body-md text-on-surface-variant hover:text-primary"
              >
                {wizardIndex === 0 ? "Cancel" : "← Back"}
              </button>
              {wizardStep === "review" ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {wizardForm.channel === "whatsapp" ? (
                    <>
                      <button
                        type="button"
                        onClick={finishWizard}
                        disabled={saving || !wizardForm.name.trim()}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-surface-container-highest bg-white px-4 text-body-md text-on-surface hover:bg-surface-container-low disabled:opacity-50"
                      >
                        {saving ? "Creating…" : "Create as draft"}
                      </button>
                      <button
                        type="button"
                        onClick={createAndSubmitWizardCampaign}
                        disabled={saving || !wizardForm.name.trim() || wizardBlocked}
                        title={wizardBlocked ? "Fix the points above first" : "Create the campaign and send its message to Meta for review"}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1a3d2e] px-5 text-body-md font-medium text-white disabled:opacity-50"
                      >
                        <Icon name="send" className="text-base" />
                        {saving ? "Creating…" : "Create & submit to Meta"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={finishWizard}
                      disabled={saving || !wizardForm.name.trim()}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1a3d2e] px-5 text-body-md font-medium text-white disabled:opacity-50"
                    >
                      {saving ? "Creating…" : "Create campaign"}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={nextWizardStep}
                  disabled={wizardStep === "basics" && !wizardForm.name.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-body-md font-medium text-on-primary disabled:opacity-50"
                >
                  Next: {WIZARD_STEPS[wizardIndex + 1]?.label ?? "Done"}
                  <Icon name="arrow_forward" className="text-base" />
                </button>
              )}
            </div>
          </div>
        </div>
        {createChoiceModal}
      </>
    );
  }

  if (mode === "visual" && selected && editWorkflow) {
    return (
      <>
        {banners}
        <CampaignVisualEditor
          campaign={selected}
          merchantSlug={merchantSlug}
          merchantName={merchantName}
          currency={currency}
          tierOptions={tierOptions}
          workflow={editWorkflow}
          onWorkflowChange={setEditWorkflow}
          name={editName}
          onNameChange={setEditName}
          onBack={() => setMode("report")}
          backLabel="Campaign report"
          onSaveDraft={() => void saveSelectedEdits()}
          onContinue={continueFromVisual}
          continueLabel="Save & view report"
          saving={saving}
          onSubmitForApproval={submitForApproval}
          onRefreshApproval={refreshApproval}
        />
        {createChoiceModal}
      </>
    );
  }

  return (
    <>
      {banners}
      <CampaignOverviewView
        campaigns={campaigns}
        currency={currency}
        onCreateNew={promptCreateCampaign}
        onViewDetails={openCampaignDetails}
        automationsEnabled={automationsEnabled}
        savingSwitch={savingSwitch}
        onToggleAutomations={onToggleAutomations}
        sendWindowStart={sendWindowStart}
        sendWindowEnd={sendWindowEnd}
        sendCapHours={sendCapHours}
        onSaveSendHygiene={onSaveSendHygiene}
        numberHealth={numberHealth}
      />
      {createChoiceModal}
    </>
  );
}
