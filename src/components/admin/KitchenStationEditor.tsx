"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  MAX_STATIONS,
  slugifyStationId,
  STATION_PRESETS,
  validateKitchenStations,
  type KitchenStation,
} from "@/lib/kitchen/stations";

export type StationCategory = {
  slug: string;
  label: string;
  stationId: string | null;
};

type KitchenStationEditorProps = {
  stations: KitchenStation[];
  categories: StationCategory[];
  saving: boolean;
  error: string | null;
  onSave: (stations: KitchenStation[], categories: StationCategory[]) => void;
  onCancel: () => void;
};

const inputClass =
  "w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md";

/**
 * Stations setup. Two decisions only: which counters exist, and which part of
 * the menu each one makes. Anything more granular than category routing turns
 * setup into data entry and stops getting done.
 */
export function KitchenStationEditor({
  stations,
  categories,
  saving,
  error,
  onSave,
  onCancel,
}: KitchenStationEditorProps) {
  const [draft, setDraft] = useState<KitchenStation[]>(stations.map((s) => ({ ...s })));
  const [routing, setRouting] = useState<StationCategory[]>(categories.map((c) => ({ ...c })));
  const [localError, setLocalError] = useState<string | null>(null);

  const enabled = draft.length > 0;

  function applyPreset(preset: (typeof STATION_PRESETS)[number]) {
    const next = preset.stations.map((s) => ({ ...s }));
    setDraft(next);
    // Best-effort first pass so the merchant edits rather than starts blank.
    const ids = new Set(next.map((s) => s.id));
    setRouting((prev) =>
      prev.map((cat) => {
        const drinkish = /coffee|tea|drink|juice|beverage|kopi/i.test(`${cat.slug} ${cat.label}`);
        const pastry = /pastr|dessert|cake|bakery/i.test(`${cat.slug} ${cat.label}`);
        if (pastry && ids.has("pastry")) return { ...cat, stationId: "pastry" };
        if (drinkish && ids.has("bar")) return { ...cat, stationId: "bar" };
        return { ...cat, stationId: ids.has("kitchen") ? "kitchen" : null };
      }),
    );
    setLocalError(null);
  }

  function turnOff() {
    setDraft([]);
    setRouting((prev) => prev.map((cat) => ({ ...cat, stationId: null })));
    setLocalError(null);
  }

  function addStation() {
    if (draft.length >= MAX_STATIONS) return;
    const existing = new Set(draft.map((s) => s.id));
    const label = `Station ${draft.length + 1}`;
    setDraft([...draft, { id: slugifyStationId(label, existing), label }]);
  }

  function renameStation(index: number, label: string) {
    setDraft(draft.map((s, i) => (i === index ? { ...s, label } : s)));
  }

  function removeStation(index: number) {
    const removed = draft[index]!;
    setDraft(draft.filter((_, i) => i !== index));
    setRouting((prev) =>
      prev.map((cat) => (cat.stationId === removed.id ? { ...cat, stationId: null } : cat)),
    );
  }

  function submit() {
    const cleaned = draft.map((s) => ({ ...s, label: s.label.trim() }));
    const invalid = validateKitchenStations(cleaned);
    if (invalid) {
      setLocalError(invalid);
      return;
    }
    const unrouted = cleaned.length > 0 && routing.some((c) => !c.stationId);
    if (unrouted) {
      // Not fatal: unrouted categories show on every station rather than vanish.
      setLocalError(null);
    }
    onSave(cleaned, routing);
  }

  const unroutedCount = enabled ? routing.filter((c) => !c.stationId).length : 0;
  const shownError = localError ?? error;

  return (
    <section className="mb-6 border border-surface-container-highest bg-surface-container-lowest">
      <div className="flex items-start justify-between gap-4 border-b border-surface-container-highest px-5 py-4">
        <div>
          <p className="font-display text-[15px] font-semibold text-primary">Prep stations</p>
          <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-on-surface-variant">
            Split the board so the bar sees drinks and the kitchen sees food. Each station
            advances its own items, and an order is only ready once every station is done.
            Leave stations off to run one pass, which is how the board works today.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-surface-container-highest text-on-surface-variant hover:text-primary"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            Stations
          </p>

          {!enabled ? (
            <div className="border border-dashed border-surface-container-highest p-4">
              <p className="text-body-md text-on-surface-variant">
                Single pass. Every order shows on one board.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="border border-primary px-3 py-2 font-display text-[13px] font-semibold text-primary"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {draft.map((station, index) => (
                <div key={station.id} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 font-mono text-[11px] text-on-surface-variant">
                    {station.id}
                  </span>
                  <input
                    value={station.label}
                    onChange={(e) => renameStation(index, e.target.value)}
                    className={inputClass}
                    placeholder="Station name"
                  />
                  <button
                    type="button"
                    onClick={() => removeStation(index)}
                    aria-label={`Remove ${station.label}`}
                    className="shrink-0 text-on-surface-variant hover:text-primary"
                  >
                    <Icon name="delete" />
                  </button>
                </div>
              ))}
              <div className="mt-1 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={addStation}
                  disabled={draft.length >= MAX_STATIONS}
                  className="flex items-center gap-1 font-mono text-[12px] text-primary disabled:opacity-40"
                >
                  <Icon name="add" className="text-base" />
                  Add station
                </button>
                <button
                  type="button"
                  onClick={turnOff}
                  className="font-mono text-[12px] text-on-surface-variant underline"
                >
                  Turn stations off
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            Who makes what
          </p>
          {!enabled ? (
            <p className="border border-dashed border-surface-container-highest p-4 text-body-md text-on-surface-variant">
              Pick a station setup first.
            </p>
          ) : routing.length === 0 ? (
            <p className="border border-dashed border-surface-container-highest p-4 text-body-md text-on-surface-variant">
              No menu categories yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {routing.map((cat, index) => (
                <label key={cat.slug} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                    {cat.label}
                  </span>
                  <select
                    value={cat.stationId ?? ""}
                    onChange={(e) =>
                      setRouting(
                        routing.map((c, i) =>
                          i === index ? { ...c, stationId: e.target.value || null } : c,
                        ),
                      )
                    }
                    className="w-40 shrink-0 border border-surface-container-highest bg-surface-container-lowest px-2 py-1.5 text-[13px]"
                  >
                    <option value="">Every station</option>
                    {draft.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {unroutedCount > 0 ? (
                <p className="mt-1 text-[12px] text-on-surface-variant">
                  {unroutedCount} categor{unroutedCount === 1 ? "y" : "ies"} unassigned. Those
                  show on every station so nothing gets lost.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {shownError ? (
        <p className="px-5 pb-3 text-body-md text-red-700" role="alert">
          {shownError}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-surface-container-highest px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="border border-surface-container-highest px-4 py-2.5 text-[13px] text-on-surface-variant"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="bg-primary px-5 py-2.5 font-display text-[13px] font-semibold text-on-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save stations"}
        </button>
      </div>
    </section>
  );
}
