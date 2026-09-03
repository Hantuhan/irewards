import { getStepMeta, type KitchenFlow } from "@/lib/kitchen/flow";

/**
 * Prep stations route each ticket line to the counter that makes it: drinks to
 * the bar, food to the kitchen. Standard KDS practice, and the point at which a
 * cafe stops being one pass.
 *
 * Off by default. An empty station list means a single pass, which is what most
 * small cafes run and what this product did before stations existed, so nobody
 * has to configure anything to keep working.
 *
 * Routing is by menu category rather than per product, because that is how
 * owners think ("all coffee goes to the bar") and because assigning forty
 * products one at a time is how a setting goes unused.
 */

export type KitchenStation = {
  id: string;
  label: string;
};

export const MAX_STATIONS = 6;

/** The split almost every cafe starts with. */
export const STATION_PRESETS: { id: string; label: string; stations: KitchenStation[] }[] = [
  {
    id: "bar_kitchen",
    label: "Bar + Kitchen",
    stations: [
      { id: "bar", label: "Bar" },
      { id: "kitchen", label: "Kitchen" },
    ],
  },
  {
    id: "bar_kitchen_pastry",
    label: "Bar + Kitchen + Pastry",
    stations: [
      { id: "bar", label: "Bar" },
      { id: "kitchen", label: "Kitchen" },
      { id: "pastry", label: "Pastry" },
    ],
  },
];

function isStation(value: unknown): value is KitchenStation {
  if (!value || typeof value !== "object") return false;
  const station = value as KitchenStation;
  return typeof station.id === "string" && typeof station.label === "string";
}

export function parseKitchenStations(raw: unknown): KitchenStation[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const parsed: KitchenStation[] = [];
  for (const entry of raw) {
    if (!isStation(entry)) continue;
    const id = entry.id.trim();
    const label = entry.label.trim();
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    parsed.push({ id, label });
    if (parsed.length >= MAX_STATIONS) break;
  }
  return parsed;
}

export function validateKitchenStations(stations: KitchenStation[]): string | null {
  if (stations.length === 0) return null; // single pass
  if (stations.length === 1) return "Use at least 2 stations, or none at all.";
  if (stations.length > MAX_STATIONS) return `Maximum ${MAX_STATIONS} stations.`;
  const ids = new Set<string>();
  for (const station of stations) {
    if (!station.label.trim()) return "Each station needs a name.";
    if (!/^[a-z][a-z0-9_]*$/.test(station.id)) {
      return "Station ids must be lowercase letters, numbers, or underscores.";
    }
    if (ids.has(station.id)) return "Duplicate station ids are not allowed.";
    ids.add(station.id);
  }
  return null;
}

export function slugifyStationId(label: string, existing: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "station";
  let candidate = base;
  let n = 2;
  while (existing.has(candidate)) {
    candidate = `${base}_${n}`;
    n += 1;
  }
  return candidate;
}

export function stationLabel(stationId: string | null, stations: KitchenStation[]): string {
  if (!stationId) return "Unrouted";
  return stations.find((s) => s.id === stationId)?.label ?? stationId;
}

export type StationStatusMap = Record<string, string>;

export function parseStationStatus(raw: unknown): StationStatusMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: StationStatusMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) out[key] = value;
  }
  return out;
}

/**
 * Stations a ticket actually touches. Lines with no station (unrouted, or
 * placed before stations were configured) belong to every station, so nothing
 * can silently fall off the board.
 */
export function stationsForOrder(
  itemStationIds: (string | null | undefined)[],
  stations: KitchenStation[],
): string[] {
  if (stations.length === 0) return [];
  const known = new Set(stations.map((s) => s.id));
  const hasUnrouted = itemStationIds.some((id) => !id || !known.has(id));
  if (hasUnrouted) return stations.map((s) => s.id);
  return stations.filter((s) => itemStationIds.includes(s.id)).map((s) => s.id);
}

/** A station's own progress, falling back to the ticket's overall status. */
export function statusForStation(
  stationStatus: StationStatusMap,
  stationId: string,
  overallStatus: string | null,
  flow: KitchenFlow,
): string {
  return stationStatus[stationId] ?? overallStatus ?? flow[0]!.id;
}

/**
 * Overall ticket status is the least advanced station: an order is only ready
 * when every station that touches it is ready.
 */
export function overallStatusFromStations(
  stationStatus: StationStatusMap,
  activeStationIds: string[],
  flow: KitchenFlow,
  fallback: string,
): string {
  if (activeStationIds.length === 0) return fallback;
  let lowestIndex = Number.POSITIVE_INFINITY;
  let lowestId = fallback;
  for (const stationId of activeStationIds) {
    const status = stationStatus[stationId] ?? flow[0]!.id;
    const index = getStepMeta(flow, status)?.index ?? 0;
    if (index < lowestIndex) {
      lowestIndex = index;
      lowestId = status;
    }
  }
  return lowestId;
}
