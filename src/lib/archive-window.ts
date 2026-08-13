import { FREE_ARCHIVE_LOOKBACK_DAYS } from "@/lib/plans";

export function etDateString(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function shiftYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function etParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function previousWeekday(ymd: string) {
  let cursor = ymd;
  for (let i = 0; i < 7; i++) {
    cursor = shiftYmd(cursor, -1);
    const [year, month, day] = cursor.split("-").map(Number);
    const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (dow !== 0 && dow !== 6) return cursor;
  }
  return ymd;
}

/** Last US cash session we should have a snapshot for (weekdays after ~4:20pm ET). */
export function lastCompletedSessionDate(date = new Date()) {
  const { weekday, ymd, hour, minute } = etParts(date);
  const weekend = weekday === "Sat" || weekday === "Sun";
  const closed = hour * 60 + minute >= 16 * 60 + 20;
  if (weekend || !closed) return previousWeekday(ymd);
  return ymd;
}

export function formatSessionLabel(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function archiveWindow(
  plan: "free" | "pro",
  joinedOn?: string | Date | null,
  role?: "client" | "admin",
) {
  const today = etDateString();
  if (role === "admin") {
    return { from: "2000-01-01", to: today };
  }
  if (plan === "pro") {
    const joined =
      joinedOn instanceof Date
        ? etDateString(joinedOn)
        : joinedOn && /^\d{4}-\d{2}-\d{2}/.test(joinedOn)
          ? joinedOn.slice(0, 10)
          : today;
    return { from: joined <= today ? joined : today, to: today };
  }
  return { from: shiftYmd(today, -FREE_ARCHIVE_LOOKBACK_DAYS), to: today };
}

export function isSelectableArchiveDate(
  date: string,
  window: { from: string; to: string },
  available: Iterable<string>,
) {
  const open = date >= window.from && date <= window.to;
  if (!open) return false;
  const set = available instanceof Set ? available : new Set(available);
  return set.has(date);
}
