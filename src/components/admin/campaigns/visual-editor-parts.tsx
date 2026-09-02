"use client";

import { Icon } from "@/components/ui/Icon";
import type { NodeKind } from "@/lib/campaigns/workflow-spec";

export const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant";

/** Manus canvas: warm paper ground with a fine dot grid. */
export const dotGridClass =
  "bg-[#fbfbfa] bg-[radial-gradient(circle,_#d8d8d4_1px,_transparent_1px)] bg-[length:22px_22px]";

const KIND_ACCENT: Record<NodeKind, string> = {
  trigger: "text-[#1a3d2e]",
  condition: "text-[#8a6d1f]",
  action: "text-on-surface",
};

export function WorkflowToggle({
  label,
  help,
  enabled,
  onChange,
}: {
  label: string;
  help?: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="text-[12px] text-on-surface">{label}</span>
        {help && <p className="mt-0.5 text-[11px] leading-snug text-on-surface-variant">{help}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={() => onChange(!enabled)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${
          enabled
            ? "border-[#1a3d2e] bg-[#1a3d2e]"
            : "border-outline-variant bg-surface-container-high"
        }`}
      >
        <span
          className={`absolute top-[2px] block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * A node on the canvas. Selectable, removable and reorderable — the previous
 * version was a static picture with no way to change the flow.
 */
export function WorkflowNodeCard({
  kind,
  kindLabel,
  icon,
  title,
  subtitle,
  selected,
  invalid,
  onClick,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  kind: NodeKind;
  kindLabel: string;
  icon: string;
  title: string;
  subtitle?: string;
  selected?: boolean;
  invalid?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div
      className={`group relative rounded-lg border bg-white transition-all ${
        selected
          ? "border-on-surface shadow-[0_0_0_3px_rgba(26,28,28,0.07)]"
          : invalid
            ? "border-red-300"
            : "border-outline-variant/70 hover:border-on-surface/40 hover:shadow-sm"
      }`}
    >
      <button type="button" onClick={onClick} className="w-full px-4 py-3 pr-20 text-left">
        <span className={`flex items-center gap-1.5 ${labelClass} ${KIND_ACCENT[kind]}`}>
          <Icon name={icon} className="text-[13px]" />
          {kindLabel}
        </span>
        <p className="mt-1.5 font-display text-[15px] font-medium leading-snug text-on-surface">
          {title}
        </p>
        {subtitle && <p className="mt-1 truncate text-[11px] text-on-surface-variant">{subtitle}</p>}
      </button>

      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {onMoveUp && <IconButton icon="arrow_upward" label="Move up" onClick={onMoveUp} />}
        {onMoveDown && <IconButton icon="arrow_downward" label="Move down" onClick={onMoveDown} />}
        {onRemove && <IconButton icon="close" label="Remove step" onClick={onRemove} danger />}
      </div>
    </div>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-6 w-6 items-center justify-center rounded border border-outline-variant/60 bg-white text-on-surface-variant hover:bg-surface-container-low ${
        danger ? "hover:border-red-300 hover:text-red-700" : ""
      }`}
    >
      <Icon name={icon} className="text-[14px]" />
    </button>
  );
}

/** Draggable toolbox chip — also adds on click, since drag is easy to miss. */
export function WorkflowToolboxItem({
  label,
  icon,
  description,
  disabled,
  compact = false,
  onAdd,
  onDragStart,
}: {
  label: string;
  icon: string;
  description: string;
  disabled?: boolean;
  /** Horizontal strip layout for narrow toolbars. */
  compact?: boolean;
  onAdd: () => void;
  onDragStart: (event: React.DragEvent) => void;
}) {
  if (compact) {
    return (
      <button
        type="button"
        draggable={!disabled}
        onDragStart={onDragStart}
        onClick={onAdd}
        disabled={disabled}
        title={disabled ? `${label} — not available on this channel` : description}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-outline-variant/60 bg-white px-3 py-2 text-left text-[12px] text-on-surface transition-colors hover:border-on-surface/50 hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40 active:cursor-grabbing"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-outline-variant/50 bg-surface-container-low">
          <Icon name={icon} className="text-base text-on-surface-variant" />
        </span>
        <span className="max-w-[9rem] whitespace-normal font-medium leading-tight">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={onDragStart}
      onClick={onAdd}
      disabled={disabled}
      title={disabled ? `${label} — not available on this channel` : description}
      className="flex w-full flex-col gap-1.5 rounded-lg border border-outline-variant/60 bg-white px-2.5 py-2.5 text-left transition-colors hover:border-on-surface/50 hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40 active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-outline-variant/50 bg-surface-container-low">
          <Icon name={icon} className="text-[18px] text-on-surface-variant" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium leading-snug text-on-surface">{label}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-on-surface-variant">{description}</p>
        </div>
        <Icon name="drag_indicator" className="mt-0.5 shrink-0 text-[16px] text-on-surface-variant/70" />
      </div>
    </button>
  );
}

/** Drop zone between/after nodes so dragged toolbox items have a target. */
export function WorkflowDropZone({
  active,
  label,
  placeholder = false,
  compact = false,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  active: boolean;
  label: string;
  /** Always visible — used when the branch has no steps yet so it doesn't look empty. */
  placeholder?: boolean;
  /** Slim insert line between existing steps. */
  compact?: boolean;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
}) {
  const visible = active || placeholder || compact;
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-md border border-dashed text-center transition-all ${
        active
          ? compact
            ? "border-[#1a3d2e] bg-[#1a3d2e]/5 py-2"
            : "border-[#1a3d2e] bg-[#1a3d2e]/5 py-4"
          : placeholder
            ? "border-outline-variant bg-white/60 py-4"
            : compact
              ? "border-transparent py-0.5 hover:border-outline-variant/80"
              : "border-transparent py-1 hover:border-outline-variant"
      }`}
    >
      <span
        className={`font-mono text-[10px] uppercase tracking-widest text-on-surface-variant ${
          visible ? "opacity-100" : "opacity-0"
        } ${compact && !active && !placeholder ? "text-[9px]" : ""}`}
      >
        {label}
      </span>
    </div>
  );
}
