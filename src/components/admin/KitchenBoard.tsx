"use client";

import { Icon } from "@/components/ui/Icon";
import {
  collectKitchenAlerts,
  hasAllergyAlert,
  isRemovalModifier,
  type KitchenAlert,
} from "@/lib/kitchen/alerts";
import { getStepMeta, isTerminalStatus, type KitchenFlow } from "@/lib/kitchen/flow";
import {
  statusForStation,
  type KitchenStation,
  type StationStatusMap,
} from "@/lib/kitchen/stations";

/**
 * Kitchen display, built to the conventions cafe staff already know from
 * Toast / Square / Fresh KDS:
 *
 * - Ticket header colour ages green → amber → red so the pass can be triaged
 *   from across the room, with a tighter clock on takeaway than dine-in.
 * - Allergy and dietary alerts sit at the top of the ticket, never inline.
 * - Modifiers are indented lines under the item, not glued into its name, and
 *   removals ("No cockles") are weighted heavier because they cause most errors.
 * - Type is sized to read at about two metres, which is where people stand.
 */

export type KitchenOrderItem = {
  name: string;
  quantity: number;
  note?: string | null;
  packedForTakeaway?: boolean;
  /** Prep station this line was routed to when the order was placed. */
  stationId?: string | null;
  modifiers?: { groupName: string; optionName: string }[];
};

export type KitchenOrder = {
  id: string;
  tableNumber: string | null;
  customerDisplay: string | null;
  kitchenStatus: string | null;
  paidAt: string | null;
  /** Per-station progress when stations are configured. */
  stationStatus?: StationStatusMap;
  items: KitchenOrderItem[];
};

/**
 * Lines this station makes. Unrouted lines belong to everyone rather than
 * disappearing, so a half-configured menu never hides food from the pass.
 */
export function itemsForStation(
  items: KitchenOrderItem[],
  stationId: string | null,
  stations: KitchenStation[],
): KitchenOrderItem[] {
  if (!stationId || stations.length === 0) return items;
  const known = new Set(stations.map((s) => s.id));
  return items.filter(
    (item) => !item.stationId || !known.has(item.stationId) || item.stationId === stationId,
  );
}

export type KitchenTableGroup = {
  tableKey: string;
  tableNumber: string | null;
  orders: KitchenOrder[];
};

export type WaitSeverity = "ok" | "warn" | "late";

const COLLAPSED_ORDER_LIMIT = 3;

/**
 * Minutes before a waiting ticket turns amber, then red.
 * Takeaway runs tighter because the guest is standing there waiting.
 */
const AGE_THRESHOLDS = {
  dineIn: { warn: 8, late: 15 },
  takeaway: { warn: 5, late: 10 },
} as const;

export function elapsedMs(paidAt: string | null, now: number) {
  if (!paidAt) return 0;
  return Math.max(0, now - new Date(paidAt).getTime());
}

export function formatElapsed(ms: number) {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  return remainder > 0 ? `${hours}h${remainder}m` : `${hours}h`;
}

export function orderIsTakeaway(order: KitchenOrder): boolean {
  return order.items.some((item) => item.packedForTakeaway);
}

export function waitSeverity(
  minutes: number,
  isTerminal: boolean,
  takeaway: boolean,
): WaitSeverity {
  if (isTerminal) return "ok";
  const limits = takeaway ? AGE_THRESHOLDS.takeaway : AGE_THRESHOLDS.dineIn;
  if (minutes >= limits.late) return "late";
  if (minutes >= limits.warn) return "warn";
  return "ok";
}

export function severityRank(severity: WaitSeverity) {
  return severity === "late" ? 3 : severity === "warn" ? 2 : 1;
}

/** Header colours read as a traffic light, independent of brand colour. */
function headerStyles(severity: WaitSeverity, isTerminal: boolean) {
  if (isTerminal) return "bg-surface-container-high text-on-surface-variant";
  if (severity === "late") return "bg-red-700 text-white";
  if (severity === "warn") return "bg-amber-500 text-black";
  return "bg-[#1a3d2e] text-white";
}

function AlertBanner({ alerts }: { alerts: KitchenAlert[] }) {
  if (alerts.length === 0) return null;
  const critical = hasAllergyAlert(alerts);

  return (
    <div
      className={`flex items-start gap-2 border-b-2 px-3 py-2 ${
        critical
          ? "border-red-700 bg-red-100 text-red-900"
          : "border-amber-500 bg-amber-50 text-amber-900"
      }`}
      role="alert"
    >
      <Icon
        name={critical ? "warning" : "info"}
        filled
        className="mt-0.5 shrink-0 text-[20px]"
      />
      <div className="min-w-0">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.12em]">
          {critical ? "Allergy" : "Dietary"}
        </p>
        <ul className="mt-0.5 space-y-0.5">
          {alerts.map((alert) => (
            <li key={alert.text} className="text-[15px] font-bold uppercase leading-tight">
              {alert.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ItemLine({ item }: { item: KitchenOrderItem }) {
  const noteAlert = collectKitchenAlerts([{ note: item.note }]);
  const noteCritical = hasAllergyAlert(noteAlert);

  return (
    <li className="border-b border-surface-container-high py-2 last:border-b-0">
      <div className="flex items-start gap-2">
        <span className="min-w-[2.2rem] shrink-0 font-mono text-[17px] font-bold text-primary">
          {item.quantity}×
        </span>
        <span className="min-w-0 flex-1 font-display text-[17px] font-semibold leading-tight text-primary">
          {item.name}
        </span>
        {item.packedForTakeaway ? (
          <span className="shrink-0 border border-primary px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
            To go
          </span>
        ) : null}
      </div>

      {item.modifiers && item.modifiers.length > 0 ? (
        <ul className="mt-1 space-y-0.5 pl-[2.7rem]">
          {item.modifiers.map((mod) => {
            const removal = isRemovalModifier(mod.optionName);
            return (
              <li
                key={`${mod.groupName}-${mod.optionName}`}
                className={`text-[14px] leading-snug ${
                  removal ? "font-bold text-red-800" : "text-on-surface-variant"
                }`}
              >
                {removal ? "— " : "+ "}
                {mod.optionName}
              </li>
            );
          })}
        </ul>
      ) : null}

      {item.note ? (
        <p
          className={`mt-1.5 ml-[2.7rem] flex items-start gap-1.5 border-l-[3px] px-2 py-1 text-[14px] leading-snug ${
            noteCritical
              ? "border-red-700 bg-red-50 font-bold italic text-red-900"
              : "border-on-surface-variant bg-surface-container-low italic text-on-surface"
          }`}
        >
          <Icon
            name={noteCritical ? "priority_high" : "edit_note"}
            className="mt-px shrink-0 text-[16px]"
          />
          <span>{item.note}</span>
        </p>
      ) : null}
    </li>
  );
}

function OrderTicket({
  order,
  flow,
  now,
  stations,
  activeStationId,
  onAdvance,
  formatTime,
}: {
  order: KitchenOrder;
  flow: KitchenFlow;
  now: number;
  stations: KitchenStation[];
  activeStationId: string | null;
  onAdvance: (orderId: string, nextStatus: string, stationId?: string) => void;
  formatTime: (iso: string | null) => string;
}) {
  const items = itemsForStation(order.items, activeStationId, stations);
  // When a station is selected it advances its own lines, so the header shows
  // that station's progress rather than the whole ticket's.
  const status = activeStationId
    ? statusForStation(order.stationStatus ?? {}, activeStationId, order.kitchenStatus, flow)
    : (order.kitchenStatus ?? flow[0]!.id);
  const meta = getStepMeta(flow, status);
  const isTerminal = meta?.isTerminal ?? isTerminalStatus(status, flow);
  const takeaway = items.some((item) => item.packedForTakeaway);
  const elapsed = elapsedMs(order.paidAt, now);
  const severity = waitSeverity(Math.floor(elapsed / 60_000), isTerminal, takeaway);

  // Alerts come from the whole ticket, never just this station's lines. An
  // allergy belongs to the guest, not to one item: a dairy allergy written on
  // the breakfast still has to reach the barista pouring the milk.
  const alerts = collectKitchenAlerts(
    order.items.map((item) => ({
      note: item.note,
      modifierNames: (item.modifiers ?? []).map((m) => m.optionName),
    })),
  );

  if (items.length === 0) return null;

  return (
    <article
      className={`overflow-hidden border-2 ${
        isTerminal
          ? "border-surface-container-high opacity-60"
          : severity === "late"
            ? "border-red-700"
            : severity === "warn"
              ? "border-amber-500"
              : "border-surface-container-highest"
      } bg-surface-container-lowest`}
    >
      <header
        className={`flex items-center justify-between gap-2 px-3 py-2 ${headerStyles(
          severity,
          isTerminal,
        )}`}
      >
        <span className="flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-wider">
          {meta?.label ?? status}
          {takeaway ? (
            <span className="border border-current px-1.5 py-px text-[10px]">Takeaway</span>
          ) : null}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[15px] font-bold">
          <Icon name="schedule" className="text-[16px]" />
          {formatElapsed(elapsed)}
        </span>
      </header>

      <AlertBanner alerts={alerts} />

      <ul className="px-3">
        {items.map((item, index) => (
          <ItemLine key={`${order.id}-${item.name}-${index}`} item={item} />
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2 border-t border-surface-container-high px-3 py-2">
        <span className="font-mono text-[11px] text-on-surface-variant">
          {formatTime(order.paidAt)}
        </span>
        {meta?.nextId && meta.actionLabel ? (
          <button
            type="button"
            onClick={() => onAdvance(order.id, meta.nextId!, activeStationId ?? undefined)}
            className="min-h-[40px] flex-1 bg-primary px-3 font-display text-[13px] font-bold uppercase tracking-wide text-on-primary transition-opacity hover:opacity-90"
          >
            {meta.actionLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}

/** All live tickets for one table, oldest first. */
export function KitchenTableCard({
  group,
  flow,
  now,
  stations = [],
  activeStationId = null,
  expanded,
  onToggleExpand,
  onAdvance,
  formatTime,
}: {
  group: KitchenTableGroup;
  flow: KitchenFlow;
  now: number;
  stations?: KitchenStation[];
  activeStationId?: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onAdvance: (orderId: string, nextStatus: string, stationId?: string) => void;
  formatTime: (iso: string | null) => string;
}) {
  const orders = group.orders.filter(
    (order) => itemsForStation(order.items, activeStationId, stations).length > 0,
  );
  if (orders.length === 0) return null;
  const oldestPaidAt = orders.reduce<string | null>((oldest, o) => {
    if (!o.paidAt) return oldest;
    if (!oldest || o.paidAt < oldest) return o.paidAt;
    return oldest;
  }, null);

  const worstSeverity = orders.reduce<WaitSeverity>((worst, o) => {
    const meta = o.kitchenStatus ? getStepMeta(flow, o.kitchenStatus) : null;
    const mins = Math.floor(elapsedMs(o.paidAt, now) / 60_000);
    const s = waitSeverity(mins, meta?.isTerminal ?? false, orderIsTakeaway(o));
    return severityRank(s) > severityRank(worst) ? s : worst;
  }, "ok");

  // Same rule as the ticket: every station working this table sees the allergy.
  const tableAlerts = collectKitchenAlerts(
    orders.flatMap((o) =>
      o.items.map((item) => ({
        note: item.note,
        modifierNames: (item.modifiers ?? []).map((m) => m.optionName),
      })),
    ),
  );
  const tableCritical = hasAllergyAlert(tableAlerts);

  const hasMany = orders.length > COLLAPSED_ORDER_LIMIT;
  const visibleOrders = expanded || !hasMany ? orders : orders.slice(0, COLLAPSED_ORDER_LIMIT);
  const hiddenCount = orders.length - visibleOrders.length;

  return (
    <section
      className={`flex flex-col border-2 p-3 ${
        tableCritical
          ? "border-red-700 bg-red-50/30"
          : worstSeverity === "late"
            ? "border-red-400 bg-red-50/20"
            : worstSeverity === "warn"
              ? "border-amber-400 bg-amber-50/20"
              : "border-surface-container-highest bg-surface"
      }`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[22px] font-bold leading-none text-primary">
          {group.tableNumber ? `Table ${group.tableNumber}` : "Takeaway"}
        </h3>
        <span className="font-mono text-[11px] text-on-surface-variant">
          {orders.length} ticket{orders.length === 1 ? "" : "s"}
          {oldestPaidAt ? ` · ${formatElapsed(elapsedMs(oldestPaidAt, now))}` : ""}
        </span>
      </div>

      {tableCritical ? (
        <p className="mb-3 flex items-center gap-2 bg-red-700 px-3 py-2 font-display text-[13px] font-bold uppercase tracking-wider text-white">
          <Icon name="warning" filled className="text-[18px]" />
          Allergy at this table
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {visibleOrders.map((order) => (
          <OrderTicket
            key={order.id}
            order={order}
            flow={flow}
            now={now}
            stations={stations}
            activeStationId={activeStationId}
            onAdvance={onAdvance}
            formatTime={formatTime}
          />
        ))}
      </div>

      {hasMany ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="mt-3 w-full border border-surface-container-highest py-2 font-mono text-[11px] uppercase text-primary"
        >
          {expanded ? "Show fewer" : `Show all ${orders.length} tickets (${hiddenCount} hidden)`}
        </button>
      ) : null}
    </section>
  );
}
