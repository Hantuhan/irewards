/**
 * Snap delayed campaign sends into the merchant's local send window,
 * and enforce a cross-campaign frequency cap.
 */

export type SendWindow = {
  /** "HH:MM" or "HH:MM:SS" in merchant local time; null = unrestricted */
  start: string | null;
  end: string | null;
  /** IANA timezone, e.g. Asia/Kuala_Lumpur */
  timezone: string;
};

function parseHm(value: string): { h: number; m: number } | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

/** Minutes from local midnight. */
function localMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * If `runAt` falls outside the send window, push it to the next window open.
 * Windows that wrap midnight (e.g. 22:00–06:00) are supported.
 */
export function snapToSendWindow(runAt: Date, window: SendWindow): Date {
  if (!window.start || !window.end) return runAt;
  const start = parseHm(window.start);
  const end = parseHm(window.end);
  if (!start || !end) return runAt;

  const tz = window.timezone || "Asia/Kuala_Lumpur";
  const startMin = start.h * 60 + start.m;
  const endMin = end.h * 60 + end.m;
  if (startMin === endMin) return runAt;

  const inWindow = (mins: number) =>
    startMin < endMin ? mins >= startMin && mins < endMin : mins >= startMin || mins < endMin;

  let candidate = new Date(runAt.getTime());
  for (let i = 0; i < 48 * 12; i++) {
    // Check every 5 minutes up to 2 days ahead
    if (inWindow(localMinutes(candidate, tz))) return candidate;
    candidate = new Date(candidate.getTime() + 5 * 60_000);
  }
  return runAt;
}

export function formatWindowLabel(window: SendWindow): string {
  if (!window.start || !window.end) return "Any time";
  const start = window.start.slice(0, 5);
  const end = window.end.slice(0, 5);
  return `${start}–${end}`;
}
