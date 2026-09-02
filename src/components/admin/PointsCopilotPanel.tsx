"use client";

import { Icon } from "@/components/ui/Icon";
import {
  copilotBullets,
  rewardsAdminCopy,
  type ProgramLanguage,
} from "@/lib/i18n/program-locale";
import { formatDecimal, formatMultiplier } from "@/lib/format/number";
import type { PointsCopilotSuggestion } from "@/lib/loyalty/points-copilot";

type PointsCopilotPanelProps = {
  suggestion: PointsCopilotSuggestion;
  lang: ProgramLanguage;
  currencyLabel?: string;
  onApply: () => void;
  onHigherEarn: () => void;
  onLowerEarn: () => void;
  applying?: boolean;
};

export function PointsCopilotPanel({
  suggestion,
  lang,
  currencyLabel = "RM",
  onApply,
  onHigherEarn,
  onLowerEarn,
  applying = false,
}: PointsCopilotPanelProps) {
  const copy = rewardsAdminCopy(lang);
  const topTier = suggestion.tierEarning[suggestion.tierEarning.length - 1];
  const topMultiplier =
    topTier && suggestion.pointsPerRinggit > 0
      ? topTier.pointsPerRm / suggestion.pointsPerRinggit
      : 1;
  const bullets = copilotBullets(
    lang,
    suggestion.pointsPerRinggit,
    topMultiplier,
    topTier?.name ?? "Platinum",
  );
  const redeemExample = suggestion.redemptionExamples[0];

  return (
    <aside className="overflow-hidden border border-primary/25 bg-gradient-to-b from-surface-container-low to-surface-container-lowest shadow-sm">
      <div className="border-b border-primary/15 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <Icon name="auto_awesome" className="text-xl" />
          </div>
          <div>
            <h2 className="font-display text-headline-sm text-primary">{copy.copilotTitle}</h2>
            <p className="mt-0.5 text-body-md text-on-surface-variant">{copy.copilotSubtitle}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="border border-surface-container-highest bg-surface-container-lowest p-3">
          <p className="font-mono text-[10px] uppercase text-on-surface-variant">{copy.earnLabel}</p>
          <p className="mt-1 font-display text-headline-md text-primary">
            {formatDecimal(suggestion.pointsPerRinggit)}
          </p>
          <p className="text-[11px] text-on-surface-variant">{copy.ptsPerRm}</p>
        </div>
        <div className="border border-surface-container-highest bg-surface-container-lowest p-3">
          <p className="font-mono text-[10px] uppercase text-on-surface-variant">{copy.redeemLabel}</p>
          {redeemExample && (
            <>
              <p className="mt-1 font-display text-headline-md text-primary">
                {redeemExample.points} {copy.ptsEquals} {currencyLabel} {redeemExample.valueRm.toFixed(0)}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {currencyLabel} {(suggestion.pointsRedeemCentsPerPoint / 100).toFixed(2)} / pt
              </p>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="font-display text-eyebrow uppercase text-primary">{copy.whyTitle}</p>
        <ul className="mt-2 space-y-2">
          {bullets.map((item) => (
            <li key={item} className="flex gap-2 text-body-md text-on-surface-variant">
              <Icon name="check_circle" className="mt-0.5 shrink-0 text-base text-emerald-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-surface-container-highest px-4 py-4">
        <p className="font-display text-eyebrow uppercase text-primary">{copy.tierRatesTitle}</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[240px] text-left text-body-md">
            <thead>
              <tr className="border-b border-surface-container-highest text-[11px] text-on-surface-variant">
                <th className="py-2 pr-2">Tier</th>
                <th className="py-2 pr-2">Earn</th>
                <th className="py-2">vs base</th>
              </tr>
            </thead>
            <tbody>
              {suggestion.tierEarning.map((tier) => {
                const multiplier =
                  suggestion.pointsPerRinggit > 0
                    ? tier.pointsPerRm / suggestion.pointsPerRinggit
                    : 1;
                return (
                  <tr key={tier.name} className="border-b border-surface-container-highest/60">
                    <td className="py-2 pr-2 font-display text-headline-sm text-primary">{tier.name}</td>
                    <td className="py-2 pr-2 font-mono text-label-mono">
                      {formatDecimal(tier.pointsPerRm)} {copy.ptsPerRm}
                    </td>
                    <td className="py-2 text-on-surface-variant">{formatMultiplier(multiplier)}×</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-surface-container-highest px-4 py-4">
        <p className="font-display text-eyebrow uppercase text-primary">{copy.redemptionTitle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestion.redemptionExamples.map((row) => (
            <span
              key={row.points}
              className="rounded-full border border-primary/30 bg-surface-container-low px-3 py-1.5 font-mono text-[11px] text-primary"
            >
              {row.points} {copy.ptsEquals} {currencyLabel} {row.valueRm.toFixed(0)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-surface-container-highest p-4">
        <button
          type="button"
          onClick={onApply}
          disabled={applying}
          className="flex items-center justify-center gap-2 bg-primary py-3 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
        >
          <Icon name="done" />
          {applying ? "Applying…" : copy.applySetup}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onHigherEarn}
            className="border border-primary py-2.5 font-display text-[11px] uppercase text-primary"
          >
            {copy.higherEarn}
          </button>
          <button
            type="button"
            onClick={onLowerEarn}
            className="border border-surface-container-highest py-2.5 font-display text-[11px] uppercase text-on-surface-variant"
          >
            {copy.lowerEarn}
          </button>
        </div>
      </div>
    </aside>
  );
}
