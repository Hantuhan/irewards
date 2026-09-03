"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type LevelGiftsEditorProps = {
  gifts: string[];
  onChange: (gifts: string[]) => void;
  placeholder?: string;
  /** Hide the section label (table column already has a header). */
  hideLabel?: boolean;
  /** Matrix cells: summary chip; click opens a popup editor. */
  compact?: boolean;
  /** Shown in the popup title when compact. */
  levelLabel?: string;
};

/** Same multi-row gift editor as the iRewards guide — one gift per line. */
export function LevelGiftsEditor({
  gifts,
  onChange,
  placeholder = "e.g. Free coffee",
  hideLabel = false,
  compact = false,
  levelLabel,
}: LevelGiftsEditorProps) {
  const filled = gifts.map((g) => g.trim()).filter(Boolean);
  const [open, setOpen] = useState(false);
  /** Local rows keep blank lines so “Add another gift” works (join strips empties). */
  const [rows, setRows] = useState<string[]>(() => (filled.length > 0 ? [...filled] : [""]));

  useEffect(() => {
    if (!open) {
      setRows(filled.length > 0 ? [...filled] : [""]);
    }
    // Only resync when closing / gifts change while closed — avoid wiping an empty new row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled.join("\n"), open]);

  function commit(next: string[]) {
    const normalized = next.length > 0 ? next : [""];
    setRows(normalized);
    onChange(normalized);
  }

  function setAt(index: number, value: string) {
    const next = [...rows];
    next[index] = value;
    commit(next);
  }

  function removeAt(index: number) {
    if (rows.length <= 1) {
      commit([""]);
      return;
    }
    commit(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    commit([...rows, ""]);
  }

  function closePopup() {
    setOpen(false);
  }

  const editorFields = (
    <div className="space-y-2">
      {rows.map((gift, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a3d2e]/10 font-mono text-[11px] text-[#1a3d2e]">
            {index + 1}
          </span>
          <input
            className="min-w-0 flex-1 border-0 border-b border-surface-container-highest bg-transparent py-1.5 text-body-md focus:border-[#1a3d2e] focus:outline-none"
            value={gift}
            onChange={(e) => setAt(index, e.target.value)}
            placeholder={index === 0 ? placeholder : "e.g. Free topping"}
            autoFocus={compact && open && index === rows.length - 1 && gift === ""}
          />
          <button
            type="button"
            onClick={() => removeAt(index)}
            className="flex h-7 w-7 shrink-0 items-center justify-center text-on-surface-variant hover:text-primary"
            aria-label="Remove gift"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-[#1a3d2e]"
      >
        <Icon name="add" className="text-[14px]" />
        Add another gift
      </button>
    </div>
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-sm border border-dashed border-surface-container-highest bg-surface-container-low px-2 py-2 text-left transition-colors hover:border-[#1a3d2e] hover:bg-white"
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
            {filled.length === 0
              ? "No gifts · click to add"
              : `${filled.length} gift${filled.length === 1 ? "" : "s"} · click to edit`}
          </p>
          {filled.length > 0 && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-on-surface">
              {filled.join(" · ")}
            </p>
          )}
        </button>

        {open ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="level-gifts-title"
            onClick={closePopup}
          >
            <div
              className="w-full max-w-md border border-surface-container-highest bg-white p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p
                    id="level-gifts-title"
                    className="font-display text-headline-sm text-[#1a3d2e]"
                  >
                    {levelLabel ? `Gifts — ${levelLabel}` : "Edit gifts"}
                  </p>
                  <p className="mt-1 text-[13px] text-on-surface-variant">
                    One gift per line. Shown to customers when they reach this level.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePopup}
                  className="text-on-surface-variant"
                  aria-label="Close"
                >
                  <Icon name="close" />
                </button>
              </div>

              {editorFields}

              <button
                type="button"
                onClick={closePopup}
                className="mt-5 flex w-full items-center justify-center gap-2 bg-[#1a3d2e] px-5 py-2.5 font-display text-headline-sm text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {!hideLabel && (
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
          Gifts at this level (shown to customers)
        </span>
      )}
      {editorFields}
    </div>
  );
}
