"use client";

import { Icon } from "@/components/ui/Icon";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant";

type CreateCampaignChoiceModalProps = {
  onClose: () => void;
  onDescribe: () => void;
  onUseTemplate: () => void;
  onBlankCampaign: () => void;
};

export function CreateCampaignChoiceModal({
  onClose,
  onDescribe,
  onUseTemplate,
  onBlankCampaign,
}: CreateCampaignChoiceModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-campaign-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className={labelClass}>New campaign</p>
            <h2 id="create-campaign-title" className="mt-1 font-display text-headline-md text-primary">
              How would you like to start?
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Start from a proven playbook, describe what you want, or build blank.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-surface-container-highest text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Close"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onUseTemplate}
            className="relative flex flex-col items-start border border-primary bg-surface-container-lowest p-5 text-left transition-colors hover:bg-surface-container-low"
          >
            <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-on-primary">
              Recommended
            </span>
            <span className="mb-3 flex h-10 w-10 items-center justify-center border border-primary bg-primary text-on-primary">
              <Icon name="grid_view" className="text-xl" />
            </span>
            <span className="font-display text-headline-sm text-primary">Use template</span>
            <span className="mt-2 text-[13px] leading-relaxed text-on-surface-variant">
              Welcome, win-back, review nudge, weekend banner — open straight in the builder.
            </span>
          </button>

          <button
            type="button"
            onClick={onDescribe}
            className="flex flex-col items-start border border-surface-container-highest bg-surface-container-low p-5 text-left transition-colors hover:border-primary hover:bg-surface-container-lowest"
          >
            <span className="mb-3 flex h-10 w-10 items-center justify-center border border-surface-container-highest bg-surface-container-lowest">
              <Icon name="auto_awesome" className="text-xl text-primary" />
            </span>
            <span className="font-display text-headline-sm text-primary">Describe it</span>
            <span className="mt-2 text-[13px] leading-relaxed text-on-surface-variant">
              “Win back people who haven’t visited in a month with 20% off.” Planner drafts a workflow.
            </span>
          </button>

          <button
            type="button"
            onClick={onBlankCampaign}
            className="flex flex-col items-start border border-surface-container-highest bg-surface-container-low p-5 text-left transition-colors hover:border-primary hover:bg-surface-container-lowest"
          >
            <span className="mb-3 flex h-10 w-10 items-center justify-center border border-surface-container-highest bg-surface-container-lowest">
              <Icon name="note_add" className="text-xl text-primary" />
            </span>
            <span className="font-display text-headline-sm text-primary">Blank campaign</span>
            <span className="mt-2 text-[13px] leading-relaxed text-on-surface-variant">
              Step-by-step wizard — channel, audience, and content from scratch.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
