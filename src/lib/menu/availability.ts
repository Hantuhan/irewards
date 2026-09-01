export type AvailabilityMode = "always" | "weekly" | "date_range";

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type WeeklyTimeSlot = { start: string; end: string };

export type WeeklySchedule = Partial<Record<WeekdayKey, WeeklyTimeSlot[]>>;

export const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export type MenuItemAvailabilityFields = {
  availabilityMode: AvailabilityMode;
  availabilityWeekly: WeeklySchedule | null;
  availableFrom: string | null;
  availableUntil: string | null;
};

const WEEKDAY_FROM_SHORT: Record<string, WeekdayKey> = {
  mon: "mon",
  tue: "tue",
  wed: "wed",
  thu: "thu",
  fri: "fri",
  sat: "sat",
  sun: "sun",
};

function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function zonedNow(timeZone: string, at: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(at);

  const weekday = parts.find((p) => p.type === "weekday")?.value?.toLowerCase().slice(0, 3) ?? "mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  return {
    weekday: WEEKDAY_FROM_SHORT[weekday] ?? "mon",
    minutes: hour * 60 + minute,
  };
}

export function isMenuItemAvailableNow(
  item: MenuItemAvailabilityFields,
  timeZone: string,
  at: Date = new Date(),
): boolean {
  if (item.availabilityMode === "always") return true;

  if (item.availabilityMode === "date_range") {
    const ts = at.getTime();
    if (item.availableFrom && ts < new Date(item.availableFrom).getTime()) return false;
    if (item.availableUntil && ts > new Date(item.availableUntil).getTime()) return false;
    return true;
  }

  const schedule = item.availabilityWeekly;
  if (!schedule || Object.keys(schedule).length === 0) return false;

  const { weekday, minutes } = zonedNow(timeZone, at);
  const slots = schedule[weekday];
  if (!slots?.length) return false;

  return slots.some((slot) => {
    const start = parseTimeToMinutes(slot.start);
    const end = parseTimeToMinutes(slot.end);
    if (end <= start) return minutes >= start || minutes <= end;
    return minutes >= start && minutes <= end;
  });
}

export function formatAvailabilitySummary(item: MenuItemAvailabilityFields): string {
  if (item.availabilityMode === "always") return "Always";

  if (item.availabilityMode === "date_range") {
    const from = item.availableFrom
      ? new Date(item.availableFrom).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";
    const until = item.availableUntil
      ? new Date(item.availableUntil).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";
    return `${from} → ${until}`;
  }

  const schedule = item.availabilityWeekly;
  if (!schedule) return "Weekly (not set)";

  const days = WEEKDAYS.filter((d) => schedule[d.key]?.length).map((d) => d.label);
  const firstSlot = WEEKDAYS.map((d) => schedule[d.key]?.[0]).find(Boolean);
  if (!days.length || !firstSlot) return "Weekly (not set)";
  return `${days.join(", ")} · ${firstSlot.start}–${firstSlot.end}`;
}

export function parseTagsInput(raw: string): string[] {
  return [...new Set(raw.split(/[,#]/).map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export function tagsToInput(tags: string[]): string {
  return tags.join(", ");
}

export function buildWeeklySchedule(
  days: WeekdayKey[],
  start: string,
  end: string,
): WeeklySchedule | null {
  if (!days.length || !start || !end) return null;
  const schedule: WeeklySchedule = {};
  for (const day of days) {
    schedule[day] = [{ start, end }];
  }
  return schedule;
}

export function extractWeeklyUi(schedule: WeeklySchedule | null): {
  days: WeekdayKey[];
  start: string;
  end: string;
} {
  if (!schedule) return { days: [], start: "09:00", end: "22:00" };
  const days = WEEKDAYS.filter((d) => schedule[d.key]?.length).map((d) => d.key);
  const slot = WEEKDAYS.map((d) => schedule[d.key]?.[0]).find(Boolean);
  return {
    days,
    start: slot?.start ?? "09:00",
    end: slot?.end ?? "22:00",
  };
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
