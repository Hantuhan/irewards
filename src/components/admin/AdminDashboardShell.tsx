"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { merchantApi } from "@/lib/merchant/fetch";
import { Icon } from "@/components/ui/Icon";
import { manusHeaderBtnClass, manusHeaderPrimaryBtnClass } from "@/lib/ui/manus";
import {
  KitchenTableCard,
  type KitchenOrder,
  type KitchenTableGroup,
} from "@/components/admin/KitchenBoard";
import {
  KitchenStationEditor,
  type StationCategory,
} from "@/components/admin/KitchenStationEditor";
import { parseKitchenStations, type KitchenStation } from "@/lib/kitchen/stations";

type BoardFilter = "active" | "completed";
import {
  DEFAULT_KITCHEN_FLOW,
  flowSummary,
  isKnownStatus,
  isTerminalStatus,
  KITCHEN_FLOW_PRESETS,
  parseKitchenFlow,
  slugifyStepId,
  terminalStepId,
  type KitchenFlow,
  type KitchenFlowStep,
} from "@/lib/kitchen/flow";

type AdminDashboardShellProps = {
  merchantSlug: string;
};

function KitchenFlowEditor({
  flow,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}: {
  flow: KitchenFlow;
  onChange: (flow: KitchenFlow) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const inputClass =
    "mt-1 w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md";

  function applyPreset(presetId: string) {
    const preset = KITCHEN_FLOW_PRESETS.find((p) => p.id === presetId);
    if (preset) onChange(preset.flow.map((s) => ({ ...s })));
  }

  function updateStep(index: number, patch: Partial<KitchenFlowStep>) {
    onChange(flow.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function addStep() {
    if (flow.length >= 6) return;
    const ids = new Set(flow.map((s) => s.id));
    const label = "New step";
    onChange([
      ...flow.slice(0, -1),
      { id: slugifyStepId(label, ids), label, actionLabel: "Next" },
      flow[flow.length - 1]!,
    ]);
  }

  function removeStep(index: number) {
    if (flow.length <= 2 || index === 0 || index === flow.length - 1) return;
    onChange(flow.filter((_, i) => i !== index));
  }

  return (
    <div className="border border-primary/30 bg-surface-container-lowest p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-headline-sm text-primary">Kitchen flow</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Choose how many steps orders move through. Last step = completed.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="text-on-surface-variant hover:text-primary">
          <Icon name="close" />
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {KITCHEN_FLOW_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            className="border border-surface-container-highest px-3 py-2 text-left hover:border-primary/40"
          >
            <span className="font-display text-eyebrow uppercase text-primary">{preset.label}</span>
            <span className="mt-0.5 block text-body-md text-on-surface-variant">
              {preset.description}
            </span>
          </button>
        ))}
      </div>

      <p className="mb-3 font-mono text-label-mono text-on-surface-variant">
        Preview: {flowSummary(flow)}
      </p>

      <div className="space-y-3">
        {flow.map((step, index) => {
          const isFirst = index === 0;
          const isLast = index === flow.length - 1;
          return (
            <div
              key={`${step.id}-${index}`}
              className="grid gap-3 border border-surface-container-highest bg-surface-container-low p-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <label className="block">
                <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                  {isFirst ? "First step" : isLast ? "Completed step" : `Step ${index + 1}`}
                </span>
                <input
                  value={step.label}
                  onChange={(e) => updateStep(index, { label: e.target.value })}
                  className={inputClass}
                  disabled={saving}
                />
              </label>
              {!isLast && (
                <label className="block">
                  <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                    Button text
                  </span>
                  <input
                    value={step.actionLabel ?? ""}
                    onChange={(e) => updateStep(index, { actionLabel: e.target.value })}
                    placeholder={`Mark ${flow[index + 1]?.label.toLowerCase() ?? "next"}`}
                    className={inputClass}
                    disabled={saving}
                  />
                </label>
              )}
              {!isFirst && !isLast && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="border border-surface-container-highest px-3 py-2 text-on-surface-variant"
                    disabled={saving}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {flow.length < 6 && (
        <button
          type="button"
          onClick={addStep}
          className="mt-3 inline-flex items-center gap-2 border border-dashed border-surface-container-highest px-3 py-2 text-body-md text-primary"
          disabled={saving}
        >
          <Icon name="add" className="text-base" />
          Add step before completed
        </button>
      )}

      {error && (
        <p className="mt-3 text-body-md text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-nowrap items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={manusHeaderPrimaryBtnClass}
        >
          {saving ? "Saving…" : "Save flow"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={manusHeaderBtnClass}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AdminDashboardShell({ merchantSlug }: AdminDashboardShellProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [kitchenFlow, setKitchenFlow] = useState<KitchenFlow>(DEFAULT_KITCHEN_FLOW);
  const [completedStepId, setCompletedStepId] = useState("served");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>("active");
  const [now, setNow] = useState(() => Date.now());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const [flowDraft, setFlowDraft] = useState<KitchenFlow>(DEFAULT_KITCHEN_FLOW);
  const [savingFlow, setSavingFlow] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [stationCategories, setStationCategories] = useState<StationCategory[]>([]);
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [showStationEditor, setShowStationEditor] = useState(false);
  const [savingStations, setSavingStations] = useState(false);
  const [stationError, setStationError] = useState<string | null>(null);
  const [needsMembershipSetup, setNeedsMembershipSetup] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await merchantApi<{
        orders: KitchenOrder[];
        kitchenFlow: KitchenFlowStep[];
        terminalStepId: string;
        stations?: KitchenStation[];
      }>(`/api/merchant/${merchantSlug}/orders`);
      setOrders(data.orders);
      const flow = parseKitchenFlow(data.kitchenFlow);
      setKitchenFlow(flow);
      setCompletedStepId(data.terminalStepId ?? terminalStepId(flow));
      const nextStations = parseKitchenStations(data.stations ?? []);
      setStations(nextStations);
      // Each screen stays on its own station, so the bar tablet keeps showing
      // the bar after a refresh.
      setActiveStationId((current) => {
        if (nextStations.length === 0) return null;
        const stored =
          current ?? window.localStorage.getItem(`irewards-kds-station:${merchantSlug}`);
        return stored && nextStations.some((s) => s.id === stored) ? stored : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    load();
    void merchantApi<{ membershipSetupCompleted?: boolean }>(
      `/api/merchant/${merchantSlug}/settings`,
    )
      .then((settings) => {
        setNeedsMembershipSetup(
          merchantSlug !== "demo-cafe" && !settings.membershipSetupCompleted,
        );
      })
      .catch(() => {
        /* board still works without setup flag */
      });
    const stream = new EventSource(`/api/merchant/${merchantSlug}/orders/stream`, {
      withCredentials: true,
    });
    stream.onmessage = () => {
      load();
    };
    stream.onerror = () => {
      stream.close();
    };
    return () => stream.close();
  }, [load, merchantSlug]);

  const counts = useMemo(() => {
    let active = 0;
    let completed = 0;
    for (const order of orders) {
      if (!order.kitchenStatus || !isKnownStatus(order.kitchenStatus, kitchenFlow)) continue;
      if (isTerminalStatus(order.kitchenStatus, kitchenFlow)) completed += 1;
      else active += 1;
    }
    return { active, completed };
  }, [orders, kitchenFlow]);

  const visibleOrders = useMemo(() => {
    const list = orders.filter(
      (o) => o.kitchenStatus && isKnownStatus(o.kitchenStatus, kitchenFlow),
    );
    const filtered =
      filter === "active"
        ? list.filter((o) => !isTerminalStatus(o.kitchenStatus, kitchenFlow))
        : list.filter((o) => isTerminalStatus(o.kitchenStatus, kitchenFlow));

    return filtered.sort((a, b) => {
      const ta = a.paidAt ? new Date(a.paidAt).getTime() : 0;
      const tb = b.paidAt ? new Date(b.paidAt).getTime() : 0;
      return filter === "completed" ? tb - ta : ta - tb;
    });
  }, [orders, filter, kitchenFlow]);

  const tableGroups = useMemo((): KitchenTableGroup[] => {
    const map = new Map<string, KitchenOrder[]>();
    for (const order of visibleOrders) {
      const key = order.tableNumber ?? `order-${order.id}`;
      const list = map.get(key) ?? [];
      list.push(order);
      map.set(key, list);
    }

    return [...map.entries()]
      .map(([tableKey, tableOrders]) => ({
        tableKey,
        tableNumber: tableOrders[0]?.tableNumber ?? null,
        orders: [...tableOrders].sort((a, b) => {
          const ta = a.paidAt ? new Date(a.paidAt).getTime() : 0;
          const tb = b.paidAt ? new Date(b.paidAt).getTime() : 0;
          return ta - tb;
        }),
      }))
      .sort((a, b) => {
        const ta = a.orders[0]?.paidAt ? new Date(a.orders[0].paidAt).getTime() : 0;
        const tb = b.orders[0]?.paidAt ? new Date(b.orders[0].paidAt).getTime() : 0;
        return ta - tb;
      });
  }, [visibleOrders]);

  async function advanceOrder(orderId: string, kitchenStatus: string, stationId?: string) {
    await merchantApi(`/api/merchant/${merchantSlug}/orders`, {
      method: "PATCH",
      body: JSON.stringify({ orderId, kitchenStatus, stationId }),
    });
    await load();
  }

  function selectStation(stationId: string | null) {
    setActiveStationId(stationId);
    const key = `irewards-kds-station:${merchantSlug}`;
    if (stationId) window.localStorage.setItem(key, stationId);
    else window.localStorage.removeItem(key);
  }

  async function openStationEditor() {
    setStationError(null);
    setShowFlowEditor(false);
    try {
      const data = await merchantApi<{
        stations: KitchenStation[];
        categories: StationCategory[];
      }>(`/api/merchant/${merchantSlug}/kitchen/stations`);
      setStations(parseKitchenStations(data.stations));
      setStationCategories(data.categories ?? []);
      setShowStationEditor(true);
    } catch (err) {
      setStationError(err instanceof Error ? err.message : "Failed to load stations");
      setShowStationEditor(true);
    }
  }

  async function saveStations(next: KitchenStation[], categories: StationCategory[]) {
    setSavingStations(true);
    setStationError(null);
    try {
      const data = await merchantApi<{
        stations: KitchenStation[];
        categories: StationCategory[];
      }>(`/api/merchant/${merchantSlug}/kitchen/stations`, {
        method: "PUT",
        body: JSON.stringify({
          stations: next,
          categoryStations: categories.map((c) => ({ slug: c.slug, stationId: c.stationId })),
        }),
      });
      const saved = parseKitchenStations(data.stations);
      setStations(saved);
      setStationCategories(data.categories ?? []);
      if (saved.length === 0) selectStation(null);
      setShowStationEditor(false);
      await load();
    } catch (err) {
      setStationError(err instanceof Error ? err.message : "Failed to save stations");
    } finally {
      setSavingStations(false);
    }
  }

  async function saveFlow() {
    setSavingFlow(true);
    setFlowError(null);
    try {
      const data = await merchantApi<{
        kitchenFlow: KitchenFlowStep[];
        terminalStepId: string;
      }>(`/api/merchant/${merchantSlug}/orders`, {
        method: "PATCH",
        body: JSON.stringify({ kitchenFlow: flowDraft }),
      });
      const flow = parseKitchenFlow(data.kitchenFlow);
      setKitchenFlow(flow);
      setCompletedStepId(data.terminalStepId);
      setShowFlowEditor(false);
      await load();
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Failed to save flow");
    } finally {
      setSavingFlow(false);
    }
  }

  function openFlowEditor() {
    setFlowDraft(kitchenFlow.map((s) => ({ ...s })));
    setFlowError(null);
    setShowFlowEditor(true);
  }

  function formatTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const completedLabel =
    kitchenFlow.find((s) => s.id === completedStepId)?.label ?? "Completed";

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="orders"
      title="Order board"
      eyebrow="Live kitchen"
      layout="viewport"
      headerAction={
        !showFlowEditor && !showStationEditor ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void openStationEditor()}
              className={manusHeaderBtnClass}
            >
              <Icon name="countertops" className="text-base" />
              Stations
            </button>
            <button type="button" onClick={openFlowEditor} className={manusHeaderBtnClass}>
              <Icon name="tune" className="text-base" />
              Edit flow
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {showStationEditor ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <KitchenStationEditor
              stations={stations}
              categories={stationCategories}
              saving={savingStations}
              error={stationError}
              onSave={(nextStations, nextCategories) =>
                void saveStations(nextStations, nextCategories)
              }
              onCancel={() => setShowStationEditor(false)}
            />
          </div>
        ) : showFlowEditor ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <KitchenFlowEditor
              flow={flowDraft}
              onChange={setFlowDraft}
              onSave={saveFlow}
              onCancel={() => setShowFlowEditor(false)}
              saving={savingFlow}
              error={flowError}
            />
          </div>
        ) : (
          <>
            {needsMembershipSetup && (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border border-[#1a3d2e]/20 bg-[#1a3d2e]/5 px-4 py-3">
                <div>
                  <p className="font-display text-headline-sm text-[#1a3d2e]">
                    Set up iRewards
                  </p>
                  <p className="text-body-md text-on-surface-variant">
                    Choose how members earn points, what they get, and what it costs you — about 2
                    minutes, and you can change everything later.
                  </p>
                </div>
                <Link
                  href={`/dashboard/${merchantSlug}/rewards?setup=1`}
                  className="inline-flex items-center gap-2 bg-[#1a3d2e] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white"
                >
                  <Icon name="smart_toy" className="text-[16px]" />
                  Start setup
                </Link>
              </div>
            )}
            <p className="shrink-0 text-body-md text-on-surface-variant">
              Flow:{" "}
              <span className="font-mono text-label-mono">{flowSummary(kitchenFlow)}</span>
            </p>

            {stations.length > 0 && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                  Station
                </span>
                {[{ id: null, label: "All" }, ...stations.map((s) => ({ id: s.id, label: s.label }))].map(
                  (station) => {
                    const isActive = activeStationId === station.id;
                    return (
                      <button
                        key={station.id ?? "all"}
                        type="button"
                        onClick={() => selectStation(station.id)}
                        className={`border px-3 py-1.5 font-display text-[13px] font-semibold transition-colors ${
                          isActive
                            ? "border-primary bg-primary text-on-primary"
                            : "border-surface-container-highest text-on-surface-variant hover:text-primary"
                        }`}
                      >
                        {station.label}
                      </button>
                    );
                  },
                )}
              </div>
            )}

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "active" as const, label: "Active" },
                    { id: "completed" as const, label: completedLabel },
                  ] as const
                ).map((f) => {
                  const count = counts[f.id];
                  const isActive = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={`inline-flex items-center gap-2 border px-3 py-1.5 font-body-md transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-on-primary"
                          : "border-surface-container-highest text-on-surface-variant hover:border-primary hover:text-primary"
                      }`}
                    >
                      {f.label}
                      <span
                        className={`font-mono text-label-mono ${
                          isActive ? "text-on-primary/80" : "text-on-surface-variant"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="font-mono text-label-mono text-on-surface-variant">
                {loading
                  ? "Refreshing…"
                  : `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>

            {error && <p className="shrink-0 text-red-700">{error}</p>}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              {tableGroups.length === 0 ? (
                <div className="flex h-full min-h-[200px] items-center justify-center border border-dashed border-surface-container-highest bg-surface-container-lowest">
                  <p className="text-body-md text-on-surface-variant">
                    {filter === "active"
                      ? "No active orders — all caught up."
                      : `No ${completedLabel.toLowerCase()} orders yet.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {tableGroups.map((group) => (
                    <KitchenTableCard
                      key={group.tableKey}
                      group={group}
                      flow={kitchenFlow}
                      now={now}
                      expanded={expandedTables.has(group.tableKey)}
                      onToggleExpand={() =>
                        setExpandedTables((prev) => {
                          const next = new Set(prev);
                          if (next.has(group.tableKey)) next.delete(group.tableKey);
                          else next.add(group.tableKey);
                          return next;
                        })
                      }
                      stations={stations}
                      activeStationId={activeStationId}
                      onAdvance={advanceOrder}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
