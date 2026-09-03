"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { RewardsAdminShell } from "@/components/admin/RewardsAdminShell";
import { StampsAdminShell } from "@/components/admin/StampsAdminShell";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";
import { manusHeaderPrimaryBtnClass } from "@/lib/ui/manus";

type HubModule = "hub" | "points" | "stamps";

type IRewardsHubShellProps = {
  merchantSlug: string;
  forceSetup?: boolean;
};

export function IRewardsHubShell({ merchantSlug, forceSetup = false }: IRewardsHubShellProps) {
  const [module, setModule] = useState<HubModule>(forceSetup ? "points" : "hub");
  const [pointsOn, setPointsOn] = useState(true);
  const [stampsOn, setStampsOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<"points" | "stamps" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await merchantApi<{
        pointsProgramEnabled?: boolean;
        stampsProgramEnabled?: boolean;
      }>(`/api/merchant/${merchantSlug}/settings`);
      setPointsOn(settings.pointsProgramEnabled !== false);
      setStampsOn(Boolean(settings.stampsProgramEnabled));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setToggle(which: "points" | "stamps", value: boolean) {
    setToggling(which);
    setError(null);
    try {
      const body =
        which === "points"
          ? { pointsProgramEnabled: value }
          : { stampsProgramEnabled: value };
      const settings = await merchantApi<{
        pointsProgramEnabled?: boolean;
        stampsProgramEnabled?: boolean;
      }>(`/api/merchant/${merchantSlug}/settings`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setPointsOn(settings.pointsProgramEnabled !== false);
      setStampsOn(Boolean(settings.stampsProgramEnabled));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setToggling(null);
    }
  }

  if (module === "points") {
    return (
      <RewardsAdminShell
        merchantSlug={merchantSlug}
        forceSetup={forceSetup}
        onBackToHub={() => {
          setModule("hub");
          void load();
        }}
      />
    );
  }

  if (module === "stamps") {
    return (
      <StampsAdminShell
        merchantSlug={merchantSlug}
        onBack={() => {
          setModule("hub");
          void load();
        }}
      />
    );
  }

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="rewards"
      title="iRewards"
      eyebrow="Choose a loyalty module"
    >
      {loading && <p className="text-on-surface-variant">Loading…</p>}
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 p-3 text-body-md text-red-800" role="alert">
          {error}
        </p>
      )}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2">
          <article className="border border-surface-container-highest bg-surface-container-lowest p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-label-mono uppercase text-on-surface-variant">
                  Module
                </p>
                <h2 className="mt-1 font-display text-headline-md text-primary">Points</h2>
                <p className="mt-2 text-body-md text-on-surface-variant">
                  Wallet, levels, earn rates, and ROI — existing iRewards program.
                </p>
              </div>
              <Icon name="military_tech" className="text-3xl text-primary" />
            </div>
            <div className="mt-6 flex flex-nowrap items-center gap-3">
              <label className="flex items-center gap-2 font-mono text-label-mono uppercase">
                <input
                  type="checkbox"
                  checked={pointsOn}
                  disabled={toggling === "points"}
                  onChange={(e) => void setToggle("points", e.target.checked)}
                />
                {pointsOn ? "On" : "Off"}
              </label>
              <button
                type="button"
                onClick={() => setModule("points")}
                className={manusHeaderPrimaryBtnClass}
              >
                Manage Points
              </button>
            </div>
          </article>

          <article className="border border-surface-container-highest bg-surface-container-lowest p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-label-mono uppercase text-on-surface-variant">
                  Module
                </p>
                <h2 className="mt-1 font-display text-headline-md text-primary">Stamps</h2>
                <p className="mt-2 text-body-md text-on-surface-variant">
                  Classic cafe punch card — 3, 6, 9, 12 or custom. Qualifying items earn stamps.
                </p>
              </div>
              <Icon name="loyalty" className="text-3xl text-primary" />
            </div>
            <div className="mt-6 flex flex-nowrap items-center gap-3">
              <label className="flex items-center gap-2 font-mono text-label-mono uppercase">
                <input
                  type="checkbox"
                  checked={stampsOn}
                  disabled={toggling === "stamps"}
                  onChange={(e) => void setToggle("stamps", e.target.checked)}
                />
                {stampsOn ? "On" : "Off"}
              </label>
              <button
                type="button"
                onClick={() => setModule("stamps")}
                className={manusHeaderPrimaryBtnClass}
              >
                Manage Stamps
              </button>
            </div>
          </article>
        </div>
      )}
      {!loading && !pointsOn && !stampsOn && (
        <p className="mt-6 text-body-md text-on-surface-variant">
          Both modules are off. Turn on Points or Stamps so diners see rewards on the storefront.
        </p>
      )}
    </AdminShell>
  );
}
