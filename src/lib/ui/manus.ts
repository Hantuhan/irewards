/** Shared Manus-style surfaces (warm paper, forest green accents). */

export const MANUS_FOREST = "#1a3d2e";

export const manusDotGridClass =
  "bg-[#fbfbfa] bg-[radial-gradient(circle,_#d8d8d4_1px,_transparent_1px)] bg-[length:22px_22px]";

export const manusLabelClass =
  "font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant";

export const manusSectionTitleClass =
  "font-display text-headline-sm text-[#1a3d2e]";

export const manusInputClass =
  "mt-2 w-full border border-surface-container-highest bg-white px-3 py-2.5 text-body-md text-on-surface focus:border-[#1a3d2e] focus:outline-none focus:ring-1 focus:ring-[#1a3d2e]/30";

export const manusPrimaryButtonClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-none bg-primary font-mono text-[11px] uppercase tracking-wider text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const manusSecondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-none border border-surface-container-highest bg-white px-4 font-mono text-[11px] uppercase tracking-wider text-[#1a3d2e] transition-colors hover:border-[#1a3d2e]/40 disabled:cursor-not-allowed disabled:opacity-50";

/** Header action row — same height across Hub / Discard / Save. */
export const manusHeaderBtnClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-none border border-surface-container-highest bg-white px-4 font-mono text-[11px] uppercase tracking-wider text-[#1a3d2e] disabled:cursor-not-allowed disabled:opacity-50";

export const manusHeaderPrimaryBtnClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-none bg-primary px-5 font-mono text-[11px] uppercase tracking-wider text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const manusPanelClass =
  "border border-surface-container-highest bg-white";

export const manusInsetPanelClass =
  "border border-surface-container-high bg-[#fbfbfa]";

/** Pill track for role=switch — pair with admin-manus CSS for on/off colors. */
export const manusSwitchTrackClass =
  "relative h-7 w-12 shrink-0 rounded-full transition-colors";

export const manusSwitchThumbClass =
  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform";
