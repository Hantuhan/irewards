"use client";

import { formatMultiplier } from "@/lib/format/number";

type BonusDayVoucherCardProps = {
  name: string;
  story: string;
  multiplier: number;
  status: "active" | "inactive";
  selected?: boolean;
  onClick?: () => void;
  /** Compact list ticket vs larger preview */
  size?: "sm" | "md";
};

/**
 * Classic perforated voucher ticket for Bonus Days —
 * left stub (× multiplier) + dashed tear line + story body.
 */
export function BonusDayVoucherCard({
  name,
  story,
  multiplier,
  status,
  selected = false,
  onClick,
  size = "sm",
}: BonusDayVoucherCardProps) {
  const on = status === "active";
  const stubW = size === "md" ? "w-[88px]" : "w-[68px]";
  const multClass =
    size === "md" ? "font-display text-[28px] leading-none" : "font-display text-[22px] leading-none";
  const pad = size === "md" ? "px-4 py-4" : "px-3 py-2.5";

  const className = [
    "relative flex w-full overflow-hidden border text-left transition-colors",
    selected
      ? "border-[#1a3d2e] bg-[#1a3d2e]/[0.04] shadow-sm"
      : "border-surface-container-highest bg-white hover:border-[#1a3d2e]/40",
    onClick ? "cursor-pointer" : "",
    !on ? "opacity-75" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      {/* Ticket stub */}
      <div
        className={`relative flex ${stubW} shrink-0 flex-col items-center justify-center ${
          on ? "bg-[#1a3d2e] text-white" : "bg-surface-container-highest text-on-surface-variant"
        }`}
      >
        <span className={multClass}>{formatMultiplier(multiplier)}×</span>
        <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] opacity-80">
          points
        </span>
      </div>

      {/* Perforation + punch holes */}
      <div className="relative w-0 shrink-0 self-stretch">
        <div
          className={`absolute inset-y-0 left-0 border-l border-dashed ${
            on ? "border-[#1a3d2e]/35" : "border-on-surface-variant/30"
          }`}
        />
        <span
          aria-hidden
          className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-surface"
        />
        <span
          aria-hidden
          className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full bg-surface"
        />
      </div>

      {/* Body */}
      <div className={`min-w-0 flex-1 ${pad}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">
              Bonus day
            </p>
            <p className="mt-0.5 truncate font-display text-headline-sm text-[#1a3d2e]">{name}</p>
          </div>
          <span
            className={`shrink-0 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
              on ? "bg-[#1a3d2e] text-white" : "bg-surface-container-highest text-on-surface-variant"
            }`}
          >
            {on ? "On" : "Off"}
          </span>
        </div>
        <p
          className={`mt-1 leading-snug text-on-surface-variant ${
            size === "md" ? "text-[13px]" : "text-[12px]"
          }`}
        >
          {story}
        </p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
