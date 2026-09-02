"use client";

import type { AvailabilityMode, MenuItemAvailabilityFields, WeekdayKey } from "@/lib/menu/availability";
import { WEEKDAYS } from "@/lib/menu/availability";

type MenuItemAvailabilityEditorProps = {
  mode: AvailabilityMode;
  weeklyDays: WeekdayKey[];
  weeklyStart: string;
  weeklyEnd: string;
  availableFrom: string;
  availableUntil: string;
  onModeChange: (mode: AvailabilityMode) => void;
  onWeeklyDaysChange: (days: WeekdayKey[]) => void;
  onWeeklyStartChange: (value: string) => void;
  onWeeklyEndChange: (value: string) => void;
  onAvailableFromChange: (value: string) => void;
  onAvailableUntilChange: (value: string) => void;
  hideHeader?: boolean;
};

export function MenuItemAvailabilityEditor({
  mode,
  weeklyDays,
  weeklyStart,
  weeklyEnd,
  availableFrom,
  availableUntil,
  onModeChange,
  onWeeklyDaysChange,
  onWeeklyStartChange,
  onWeeklyEndChange,
  onAvailableFromChange,
  onAvailableUntilChange,
  hideHeader,
}: MenuItemAvailabilityEditorProps) {
  function toggleDay(day: WeekdayKey) {
    if (weeklyDays.includes(day)) {
      onWeeklyDaysChange(weeklyDays.filter((d) => d !== day));
    } else {
      onWeeklyDaysChange([...weeklyDays, day]);
    }
  }

  return (
    <div
      className={
        hideHeader
          ? ""
          : "border border-surface-container-highest bg-surface-container-lowest p-4 sm:col-span-2"
      }
    >
      {!hideHeader && (
        <>
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Availability
          </p>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Control when diners can order this item on the storefront.
          </p>
        </>
      )}

      <div className={hideHeader ? "flex flex-wrap gap-2" : "mt-4 flex flex-wrap gap-2"}>
        {(
          [
            { id: "always", label: "Always" },
            { id: "weekly", label: "Weekly hours" },
            { id: "date_range", label: "Date & time range" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onModeChange(opt.id)}
            className={`border px-3 py-1.5 font-body-md transition-colors ${
              mode === opt.id
                ? "border-primary bg-primary text-on-primary"
                : "border-surface-container-highest text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "weekly" && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const on = weeklyDays.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className={`min-w-[3rem] border px-2 py-1 font-mono text-label-mono ${
                    on
                      ? "border-primary bg-primary text-on-primary"
                      : "border-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-label-mono text-on-surface-variant">From</span>
              <input
                type="time"
                value={weeklyStart}
                onChange={(e) => onWeeklyStartChange(e.target.value)}
                className="border border-surface-container-highest bg-surface-container-low px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-label-mono text-on-surface-variant">Until</span>
              <input
                type="time"
                value={weeklyEnd}
                onChange={(e) => onWeeklyEndChange(e.target.value)}
                className="border border-surface-container-highest bg-surface-container-low px-3 py-2"
              />
            </label>
          </div>
        </div>
      )}

      {mode === "date_range" && (
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="font-mono text-label-mono text-on-surface-variant">Available from</span>
            <input
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => onAvailableFromChange(e.target.value)}
              className="border border-surface-container-highest bg-surface-container-low px-3 py-2"
            />
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="font-mono text-label-mono text-on-surface-variant">Available until</span>
            <input
              type="datetime-local"
              value={availableUntil}
              onChange={(e) => onAvailableUntilChange(e.target.value)}
              className="border border-surface-container-highest bg-surface-container-low px-3 py-2"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export type AvailabilityUiState = MenuItemAvailabilityFields & {
  weeklyDays: WeekdayKey[];
  weeklyStart: string;
  weeklyEnd: string;
  availableFromLocal: string;
  availableUntilLocal: string;
  tagsInput: string;
};
