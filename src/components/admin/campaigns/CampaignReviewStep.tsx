"use client";

import { MetaReadinessChecklist } from "@/components/admin/campaigns/MetaReadinessChecklist";
import {
  MetaValidationBanner,
  WhatsAppPhonePreview,
} from "@/components/admin/campaigns/campaign-review-parts";
import { labelClass } from "@/components/admin/campaigns/visual-editor-parts";
import { Icon } from "@/components/ui/Icon";
import { campaignChannelLabel, type CampaignChannel } from "@/lib/campaigns/channels";
import {
  asWhatsAppTemplate,
  nodeSummary,
  type CampaignWorkflow,
} from "@/lib/campaigns/workflow-spec";
import type { ComplianceReport } from "@/lib/whatsapp/meta-compliance";
import type { CampaignTemplateSummary } from "@/lib/whatsapp/template-spec";
import type { LocalizedMap } from "@/lib/i18n/program-locale";

function workflowHeaderImage(workflow: CampaignWorkflow): string | null {
  for (const action of workflow.actions) {
    if (action.type === "send_whatsapp") {
      return asWhatsAppTemplate(action.config.template).headerImageUrl;
    }
  }
  return null;
}

function WorkflowSteps({ workflow }: { workflow: CampaignWorkflow }) {
  const steps = [...workflow.conditions, ...workflow.actions];
  if (steps.length === 0) {
    return <span className="text-on-surface-variant">—</span>;
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {steps.map((node, index) => (
        <li key={node.id} className="flex items-start gap-2 text-[13px]">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-surface-container-highest bg-surface-container-low font-mono text-[10px] text-on-surface-variant">
            {index + 1}
          </span>
          <span className="font-medium leading-snug text-on-surface">{nodeSummary(node)}</span>
          {index < steps.length - 1 && (
            <Icon name="south" className="absolute hidden text-on-surface-variant" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}

type CampaignReviewStepProps = {
  name: string;
  channel: CampaignChannel;
  goal: string;
  workflow: CampaignWorkflow;
  messageBody: string | null;
  merchantName: string;
  workflowIssues: string[];
  compliance: ComplianceReport | null;
  template?: CampaignTemplateSummary | null;
  stepNum?: number;
  stepTotal?: number;
  previewMessageBodies?: LocalizedMap | null;
  previewLanguages?: string[];
};

const GOAL_LABELS: Record<string, string> = {
  retention: "Win back lapsed members",
  acquisition: "Welcome new visitors",
  loyalty: "Reward loyal members",
};

export function CampaignReviewStep({
  name,
  channel,
  goal,
  workflow,
  messageBody,
  merchantName,
  workflowIssues,
  compliance,
  template,
  stepNum = 4,
  stepTotal = 4,
  previewMessageBodies = null,
  previewLanguages,
}: CampaignReviewStepProps) {
  const isMessageChannel = channel !== "banner";
  const triggerLabel = nodeSummary(workflow.trigger);

  return (
    <div className="space-y-6">
      <header>
        <h3 className="font-display text-headline-md text-primary">Review & create</h3>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Campaign preview & final confirmation
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
          Step {stepNum} of {stepTotal}: Review
        </p>
      </header>

      <div className="grid gap-0 overflow-hidden rounded-lg border border-surface-container-highest lg:grid-cols-[minmax(0,1fr)_min(320px,42%)]">
        {/* Summary column */}
        <div className="bg-surface-container-lowest p-6 md:p-8">
          <p className={labelClass}>Campaign summary</p>

          <dl className="mt-4 divide-y divide-surface-container-highest rounded-md border border-surface-container-highest bg-white">
            <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 text-[13px] sm:grid-cols-[140px_1fr]">
              <dt className="text-on-surface-variant">Name</dt>
              <dd className="font-medium text-on-surface">{name || "—"}</dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 text-[13px] sm:grid-cols-[140px_1fr]">
              <dt className="text-on-surface-variant">Channel</dt>
              <dd className="font-medium text-on-surface">{campaignChannelLabel(channel)}</dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 text-[13px] sm:grid-cols-[140px_1fr]">
              <dt className="text-on-surface-variant">Goal</dt>
              <dd className="font-medium text-on-surface">{GOAL_LABELS[goal] ?? goal}</dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 text-[13px] sm:grid-cols-[140px_1fr]">
              <dt className="text-on-surface-variant">Trigger</dt>
              <dd className="font-medium text-on-surface">{triggerLabel}</dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 text-[13px] sm:grid-cols-[140px_1fr]">
              <dt className="pt-0.5 text-on-surface-variant">Steps</dt>
              <dd>
                <WorkflowSteps workflow={workflow} />
              </dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 text-[13px] sm:grid-cols-[140px_1fr]">
              <dt className="text-on-surface-variant">Status</dt>
              <dd className="flex items-center gap-2 font-medium text-on-surface">
                <span className="inline-block h-2 w-2 rounded-full bg-outline-variant" aria-hidden />
                Draft
              </dd>
            </div>
          </dl>

          {workflowIssues.length > 0 && (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50/80 p-4">
              <p className={labelClass}>Finish in the builder</p>
              <ul className="mt-2 space-y-1.5">
                {workflowIssues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2 text-[12px] leading-snug text-amber-900">
                    <Icon name="warning" className="mt-px shrink-0 text-[15px]" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {channel === "whatsapp" && compliance && (
            <div className="mt-5">
              <MetaReadinessChecklist report={compliance} variant="panel" />
            </div>
          )}
        </div>

        {/* Preview column */}
        {isMessageChannel && messageBody ? (
          <div className="flex flex-col items-center justify-start border-t border-surface-container-highest bg-[#f4f4f2] p-6 md:p-8 lg:border-l lg:border-t-0">
            <div className="w-full max-w-[300px] lg:sticky lg:top-4">
              <WhatsAppPhonePreview
                merchantName={merchantName}
                messageBody={messageBody}
                headerImageUrl={workflowHeaderImage(workflow)}
                channel={channel === "sms" ? "sms" : "whatsapp"}
                messageBodies={previewMessageBodies}
                previewLanguages={previewLanguages}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center border-t border-surface-container-highest bg-[#f4f4f2] p-8 lg:border-l lg:border-t-0">
            <p className="text-center text-[13px] text-on-surface-variant">
              Menu promo preview is available after the campaign is created.
            </p>
          </div>
        )}
      </div>

      <MetaValidationBanner channel={channel} template={template} compliance={compliance} />
    </div>
  );
}
