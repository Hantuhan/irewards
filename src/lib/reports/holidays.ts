export type PublicHoliday = {
  date: string;
  name: string;
  localName: string;
  countryCode: string;
};

const cache = new Map<string, { fetchedAt: number; holidays: PublicHoliday[] }>();
const CACHE_MS = 24 * 60 * 60 * 1000;

export function countryCodeForCurrency(currency: "MYR" | "SGD"): "MY" | "SG" {
  return currency === "SGD" ? "SG" : "MY";
}

export async function fetchPublicHolidays(
  countryCode: "MY" | "SG",
  year: number,
): Promise<PublicHoliday[]> {
  const cacheKey = `${countryCode}-${year}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.holidays;
  }

  try {
    const response = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      { next: { revalidate: 86400 } },
    );

    if (!response.ok) {
      return cached?.holidays ?? [];
    }

    const text = await response.text();
    if (!text.trim()) {
      return cached?.holidays ?? [];
    }

    const raw = JSON.parse(text) as {
      date: string;
      name: string;
      localName: string;
      countryCode: string;
    }[];

    if (!Array.isArray(raw)) {
      return cached?.holidays ?? [];
    }

    const holidays = raw.map((h) => ({
      date: h.date,
      name: h.name,
      localName: h.localName,
      countryCode: h.countryCode,
    }));

    cache.set(cacheKey, { fetchedAt: Date.now(), holidays });
    return holidays;
  } catch {
    return cached?.holidays ?? [];
  }
}

export async function upcomingHolidays(
  countryCode: "MY" | "SG",
  daysAhead = 60,
): Promise<PublicHoliday[]> {
  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const years = [...new Set([now.getFullYear(), end.getFullYear()])];

  const all = (
    await Promise.all(years.map((year) => fetchPublicHolidays(countryCode, year)))
  ).flat();

  const today = now.toISOString().slice(0, 10);
  const endKey = end.toISOString().slice(0, 10);

  return all
    .filter((h) => h.date >= today && h.date <= endKey)
    .sort((a, b) => a.date.localeCompare(b.date));
}
