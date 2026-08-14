import { doc, getDoc } from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";

export const MAINTENANCE_COLLECTION = "site";
export const MAINTENANCE_DOC_ID = "maintenance";

export const DEFAULT_WARNING_MESSAGE =
  "Maintenance will start {start} and last until {end}.";

export type SiteMaintenance = {
  enabled: boolean;
  warning: boolean;
  start: string;
  end: string;
  message: string;
  startMs: number | null;
  endMs: number | null;
};

export type ResolvedMaintenance = {
  lock: boolean;
  warning: boolean;
  scheduled: boolean;
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function asFlag(value: unknown) {
  return value === true || value === "true" || value === 1;
}

function timezoneFromLabel(raw: string) {
  if (/\b(PT|PST|PDT|Pacific)\b/i.test(raw)) return "America/Los_Angeles";
  if (/\b(CT|CST|CDT|Central)\b/i.test(raw)) return "America/Chicago";
  if (/\b(MT|MST|MDT|Mountain)\b/i.test(raw)) return "America/Denver";
  return "America/New_York";
}

function partsInTimeZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function zonedTimeToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  let utc = Date.UTC(year, monthIndex, day, hour, minute, 0);
  for (let i = 0; i < 3; i += 1) {
    const got = partsInTimeZone(new Date(utc), timeZone);
    const gotUtc = Date.UTC(
      got.year,
      got.month - 1,
      got.day,
      got.hour,
      got.minute,
      got.second,
    );
    const wanted = Date.UTC(year, monthIndex, day, hour, minute, 0);
    utc += wanted - gotUtc;
  }
  return new Date(utc);
}

function parseAmPm(token: string): "am" | "pm" | null {
  const compact = token.toLowerCase().replace(/[.\s]/g, "");
  if (compact === "apm" || compact === "pm") return "pm";
  if (compact === "am") return "am";
  return null;
}

function hour24(hour: number, meridiem: "am" | "pm" | null) {
  if (!meridiem) return hour;
  const wrapped = hour % 12;
  return meridiem === "pm" ? wrapped + 12 : wrapped;
}

function currentYearInZone(now: Date, timeZone: string) {
  return partsInTimeZone(now, timeZone).year;
}

export function parseMaintenanceInstant(
  raw: string,
  now = new Date(),
): number | null {
  const text = raw.trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = Date.parse(text);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const monthMatch = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
  );
  if (!monthMatch || monthMatch.index == null) return null;

  const month = MONTHS[monthMatch[0].toLowerCase()];
  if (month == null) return null;

  const afterMonth = text.slice(monthMatch.index + monthMatch[0].length);
  const dayMatch = afterMonth.match(/^\s*,?\s*(\d{1,2})(?:st|nd|rd|th)?\b/i);
  const day = dayMatch ? Number(dayMatch[1]) : NaN;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  const yearMatch = text.match(/\b(20\d{2})\b/);
  const timeZone = timezoneFromLabel(text);
  const year = yearMatch
    ? Number(yearMatch[1])
    : currentYearInZone(now, timeZone);

  const timeMatch = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*p\.?\s*m\.?|\bapm\b|a\.?m\.?|p\.?m\.?)/i,
  );
  let hour = 0;
  let minute = 0;
  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2] || 0);
    const meridiem = parseAmPm(timeMatch[3] || "");
    if (hour > 24 || minute > 59) return null;
    hour = hour24(hour, meridiem);
  }

  const instant = zonedTimeToUtc(year, month, day, hour, minute, timeZone);
  return Number.isNaN(instant.getTime()) ? null : instant.getTime();
}

function instantFromUnknown(value: unknown, now: Date): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  if (
    typeof value === "object" &&
    value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }
  if (typeof value === "string") return parseMaintenanceInstant(value, now);
  return null;
}

export function parseSiteMaintenance(
  data: Record<string, unknown> | undefined,
  now = new Date(),
): SiteMaintenance {
  const message =
    typeof data?.message === "string" && data.message.trim()
      ? data.message.trim()
      : DEFAULT_WARNING_MESSAGE;
  const start = typeof data?.start === "string" ? data.start.trim() : "";
  const end = typeof data?.end === "string" ? data.end.trim() : "";
  const startMs =
    instantFromUnknown(data?.startAt, now) ??
    (start ? parseMaintenanceInstant(start, now) : null);
  const endMs =
    instantFromUnknown(data?.endAt, now) ??
    (end ? parseMaintenanceInstant(end, now) : null);
  return {
    enabled: asFlag(data?.enabled),
    warning: asFlag(data?.warning) || asFlag(data?.warningEnabled),
    start,
    end,
    message,
    startMs,
    endMs,
  };
}

export function resolveMaintenanceState(
  site: SiteMaintenance,
  now = Date.now(),
): ResolvedMaintenance {
  const scheduled =
    site.startMs != null && site.endMs != null && site.endMs > site.startMs;
  if (scheduled && site.startMs != null && site.endMs != null) {
    return {
      scheduled: true,
      lock: (now >= site.startMs || site.enabled) && now < site.endMs,
      warning: now < site.endMs,
    };
  }
  return {
    scheduled: false,
    lock: site.enabled,
    warning: site.warning || site.enabled,
  };
}

export function formatWarningText(site: SiteMaintenance) {
  if (!site.start && !site.end) {
    return site.message === DEFAULT_WARNING_MESSAGE
      ? "Scheduled maintenance is coming soon."
      : site.message.replaceAll("{start}", "soon").replaceAll("{end}", "later");
  }
  return site.message
    .replaceAll("{start}", site.start || "soon")
    .replaceAll("{end}", site.end || "later");
}

export async function readMaintenanceEnabled() {
  const db = getClientFirestore();
  if (!db) return false;
  try {
    const snapshot = await getDoc(
      doc(db, MAINTENANCE_COLLECTION, MAINTENANCE_DOC_ID),
    );
    const site = parseSiteMaintenance(
      snapshot.data() as Record<string, unknown> | undefined,
    );
    return resolveMaintenanceState(site).lock;
  } catch {
    return false;
  }
}
