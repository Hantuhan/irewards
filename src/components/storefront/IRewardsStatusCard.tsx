"use client";

type IRewardsStatusCardProps = {
  levelName: string;
  perkDescription?: string | null;
  lifetimePointsEarned: number;
  nextLevelName?: string | null;
  pointsToNextLevel?: number | null;
  className?: string;
};

/** Thank-you / storefront loyalty status — sharp Manus card, mobile-friendly. */
export function IRewardsStatusCard({
  levelName,
  perkDescription,
  lifetimePointsEarned,
  nextLevelName = null,
  pointsToNextLevel = null,
  className = "",
}: IRewardsStatusCardProps) {
  const progressPct =
    pointsToNextLevel != null && pointsToNextLevel >= 0
      ? Math.min(
          95,
          Math.max(
            8,
            100 -
              (pointsToNextLevel / (pointsToNextLevel + Math.max(1, lifetimePointsEarned))) *
                100,
          ),
        )
      : 100;

  return (
    <section
      className={`border border-surface-container-highest bg-surface-container-lowest px-4 py-5 sm:px-5 ${className}`}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-on-surface-variant">
        iRewards status
      </p>
      <p className="mt-2 font-display text-[18px] font-semibold leading-tight tracking-tight text-on-surface">
        Your level: {levelName}
      </p>
      {perkDescription && (
        <p className="mt-1 text-[13px] leading-snug text-on-surface-variant">{perkDescription}</p>
      )}

      <div className="mt-4 border-t border-surface-container-highest pt-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface">
            {lifetimePointsEarned.toLocaleString()} lifetime pts
          </span>
          {nextLevelName && (
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
              Next: {nextLevelName}
            </span>
          )}
        </div>
        <div className="h-1 w-full bg-surface-container-highest">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {pointsToNextLevel != null && nextLevelName && (
          <p className="mt-2 text-[12px] text-on-surface-variant">
            {pointsToNextLevel.toLocaleString()} points to {nextLevelName}
          </p>
        )}
      </div>
    </section>
  );
}
