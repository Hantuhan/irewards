"use client";

import { Icon } from "@/components/ui/Icon";

type StampCardVisualProps = {
  filled: number;
  size: number;
  cafeName?: string;
  rewardLabel?: string | null;
  className?: string;
  /** Material icon for filled stamps */
  stampIcon?: string;
};

/** Prefer columns that fill complete rows (avoid orphan 4+2 layouts). */
function stampColumns(holes: number): number {
  if (holes <= 3) return holes;
  if (holes === 5) return 3;
  if (holes === 6) return 3;
  if (holes === 7) return 4;
  if (holes <= 8) return 4;
  if (holes <= 10) return 5;
  return 4;
}

/** Storefront stamp card — Manus forest, mobile-first alignment. */
export function StampCardVisual({
  filled,
  size,
  cafeName,
  rewardLabel,
  className = "",
  stampIcon = "local_cafe",
}: StampCardVisualProps) {
  const holes = Math.max(2, Math.min(20, size));
  const stamped = Math.max(0, Math.min(holes, filled));
  const pct = Math.round((stamped / holes) * 1000) / 10;
  const cols = stampColumns(holes);

  return (
    <div
      className={`overflow-hidden bg-manus px-4 py-5 text-white sm:px-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/65">
            Stamp card
          </p>
          {cafeName && (
            <p className="mt-1 truncate font-display text-[18px] font-semibold leading-tight tracking-tight">
              {cafeName}
            </p>
          )}
        </div>
        <span className="mt-0.5 shrink-0 border border-white/35 px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-white/90">
          Member
        </span>
      </div>

      <p className="mt-3 text-[13px] leading-snug text-white/75">
        Collect {holes} stamps
        {rewardLabel ? ` · unlock ${rewardLabel}` : ""}
      </p>

      <div
        className="mx-auto mt-5 grid w-full max-w-[272px] gap-2.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: holes }, (_, i) => {
          const on = i < stamped;
          const isGoal = i === holes - 1;
          return (
            <span
              key={i}
              className={`flex aspect-square items-center justify-center ${
                on
                  ? "bg-[#0f2a1f] text-[#c8e6c9]"
                  : "border border-dashed border-white/35 text-white/45"
              }`}
              aria-hidden
            >
              {on ? (
                <Icon name={stampIcon} className="text-[18px]" filled />
              ) : isGoal ? (
                <Icon name="star" className="text-[16px]" />
              ) : (
                <span className="font-display text-[15px] leading-none">+</span>
              )}
            </span>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em]">
          <span className="text-white/70">
            {stamped} of {holes} stamps
          </span>
          <span className="tabular-nums text-white/90">{pct}%</span>
        </div>
        <div className="h-1 w-full bg-white/15">
          <div
            className="h-full bg-[#c8e6c9] transition-all duration-300"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      <p className="mt-5 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-white/55">
        WhatsApp members · redeem when full
      </p>
    </div>
  );
}
