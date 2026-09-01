"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";

type RewardLevel = {
  levelNumber: number;
  name: string;
  minLifetimePoints: number;
  pointsMultiplier: number;
  perkDescription: string | null;
  discountPercent: number;
};

type RewardsAdminShellProps = {
  merchantSlug: string;
};

const emptyLevels = (): RewardLevel[] =>
  [1, 2, 3, 4, 5].map((levelNumber) => ({
    levelNumber,
    name: "",
    minLifetimePoints: levelNumber === 1 ? 0 : levelNumber * 50,
    pointsMultiplier: 1,
    perkDescription: "",
    discountPercent: 0,
  }));

const inputClass =
  "w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 font-sans text-body-md text-on-surface outline-none transition-colors focus:border-primary disabled:bg-surface-container";

export function RewardsAdminShell({ merchantSlug }: RewardsAdminShellProps) {
  const [levels, setLevels] = useState<RewardLevel[]>(emptyLevels());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadLevels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await merchantApi<{ levels?: RewardLevel[] }>(
        `/api/merchant/${merchantSlug}/reward-levels`,
      );
      if (response.levels?.length) setLevels(response.levels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load levels");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  function updateLevel(levelNumber: number, patch: Partial<RewardLevel>) {
    setLevels((prev) =>
      prev.map((level) =>
        level.levelNumber === levelNumber ? { ...level, ...patch } : level,
      ),
    );
    setSaved(false);
  }

  async function saveLevels() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const json = await merchantApi<{ levels?: RewardLevel[] }>(
        `/api/merchant/${merchantSlug}/reward-levels`,
        {
          method: "PUT",
          body: JSON.stringify({
            levels: levels.map((level) => ({
              ...level,
              perkDescription: level.perkDescription?.trim() || null,
            })),
          }),
        },
      );
      if (json.levels) setLevels(json.levels);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save levels");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="rewards"
      title="iRewards levels"
      eyebrow="Program configuration"
      headerAction={
        <button
          type="button"
          onClick={saveLevels}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-primary px-5 py-2.5 font-display text-headline-sm text-on-primary transition-colors hover:bg-surface-tint disabled:opacity-50"
        >
          <Icon name="save" className="text-lg" />
          {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      {loading && <p className="text-on-surface-variant">Loading levels…</p>}

      {error && (
        <p
          className="mb-4 border border-red-200 bg-red-50 p-4 text-body-md text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}

      {saved && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 p-3 text-body-md text-emerald-800">
          Levels saved successfully.
        </p>
      )}

      {!loading && (
        <div className="overflow-x-auto border border-surface-container-highest bg-surface-container-lowest">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-container-highest bg-surface-container-low">
                {["Level", "Name", "Min pts", "Multiplier", "Discount %", "Perk"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-4 py-3 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => (
                <tr
                  key={level.levelNumber}
                  className="border-b border-surface-container last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-label-mono text-primary">
                    {level.levelNumber}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={level.name}
                      onChange={(e) =>
                        updateLevel(level.levelNumber, { name: e.target.value })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      disabled={level.levelNumber === 1}
                      value={level.minLifetimePoints}
                      onChange={(e) =>
                        updateLevel(level.levelNumber, {
                          minLifetimePoints: Number(e.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0.1}
                      step={0.05}
                      value={level.pointsMultiplier}
                      onChange={(e) =>
                        updateLevel(level.levelNumber, {
                          pointsMultiplier: Number(e.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={level.discountPercent}
                      onChange={(e) =>
                        updateLevel(level.levelNumber, {
                          discountPercent: Number(e.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={level.perkDescription ?? ""}
                      onChange={(e) =>
                        updateLevel(level.levelNumber, {
                          perkDescription: e.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="e.g. Free birthday drink"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 max-w-2xl text-body-md text-on-surface-variant">
        Members earn multiplied points and checkout discounts based on their current
        lifetime tier. Level 1 minimum points is always zero.
      </p>
    </AdminShell>
  );
}
