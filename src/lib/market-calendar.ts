/**
 * US cash equity holidays (NYSE) for 2025–2027.
 * Desk session labels and cron skip days with no tape.
 */
const US_CASH_HOLIDAYS = new Set([
  "2025-01-01",
  "2025-01-20",
  "2025-02-17",
  "2025-04-18",
  "2025-05-26",
  "2025-06-19",
  "2025-07-04",
  "2025-09-01",
  "2025-11-27",
  "2025-12-25",
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26",
  "2027-05-31",
  "2027-06-18",
  "2027-07-05",
  "2027-09-06",
  "2027-11-25",
  "2027-12-24",
]);

function etYmd(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
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

function shiftYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function isUsCashHoliday(ymd: string) {
  return US_CASH_HOLIDAYS.has(ymd);
}

export function isUsCashSessionDay(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [year, month, day] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !isUsCashHoliday(ymd);
}

export function previousCashSession(ymd: string) {
  let cursor = ymd;
  for (let i = 0; i < 14; i += 1) {
    cursor = shiftYmd(cursor, -1);
    if (isUsCashSessionDay(cursor)) return cursor;
  }
  return shiftYmd(ymd, -1);
}

/** Last completed US cash session (after ~4:20pm ET on a trading day). */
export function lastCompletedCashSessionDate(date = new Date()) {
  const { weekday, ymd, hour, minute } = etParts(date);
  const weekend = weekday === "Sat" || weekday === "Sun";
  const closed = hour * 60 + minute >= 16 * 60 + 20;
  if (weekend || isUsCashHoliday(ymd) || !closed) {
    return previousCashSession(ymd);
  }
  return ymd;
}

export function nextCashSessionDays(fromTimestamp: number, count: number) {
  const days: Date[] = [];
  const cursor = new Date(fromTimestamp);
  while (days.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const ymd = etYmd(cursor);
    if (isUsCashSessionDay(ymd)) {
      days.push(new Date(cursor));
    }
  }
  return days;
}

function nextCashSessionYmd(fromYmd: string) {
  let cursor = fromYmd;
  for (let i = 0; i < 14; i += 1) {
    if (isUsCashSessionDay(cursor)) return cursor;
    cursor = shiftYmd(cursor, 1);
  }
  return shiftYmd(fromYmd, 1);
}

/** UTC ms for an America/New_York wall-clock time on a given YMD. */
export function etWallClockToUtcMs(ymd: string, hour: number, minute: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  let utc = Date.UTC(year, month - 1, day, 12, 0, 0);
  for (let i = 0; i < 80; i += 1) {
    const parts = etParts(new Date(utc));
    const got = parts.hour * 60 + parts.minute;
    const want = hour * 60 + minute;
    if (parts.ymd === ymd && got === want) return utc - ((utc % 60_000) || 0);
    if (parts.ymd < ymd) {
      utc += 60 * 60_000;
      continue;
    }
    if (parts.ymd > ymd) {
      utc -= 60 * 60_000;
      continue;
    }
    utc += (want - got) * 60_000;
  }
  return utc;
}

export type MarketCountdown = {
  phase: "opens" | "closes";
  targetMs: number;
  /** Whole seconds remaining (>= 0). */
  remainingSec: number;
};

/**
 * Regular US cash session: 09:30–16:00 ET on trading days.
 * Before open / on closed days → countdown to next open.
 * During the session → countdown to close.
 */
export function getMarketCountdown(now = new Date()): MarketCountdown {
  const { ymd, hour, minute } = etParts(now);
  const mins = hour * 60 + minute;
  const openMins = 9 * 60 + 30;
  const closeMins = 16 * 60;
  const nowMs = now.getTime();

  if (isUsCashSessionDay(ymd) && mins >= openMins && mins < closeMins) {
    const targetMs = etWallClockToUtcMs(ymd, 16, 0);
    return {
      phase: "closes",
      targetMs,
      remainingSec: Math.max(0, Math.ceil((targetMs - nowMs) / 1000)),
    };
  }

  let openYmd = ymd;
  if (!isUsCashSessionDay(ymd) || mins >= closeMins) {
    openYmd = nextCashSessionYmd(shiftYmd(ymd, 1));
  } else if (mins < openMins) {
    openYmd = ymd;
  }

  const targetMs = etWallClockToUtcMs(openYmd, 9, 30);
  return {
    phase: "opens",
    targetMs,
    remainingSec: Math.max(0, Math.ceil((targetMs - nowMs) / 1000)),
  };
}

export function formatCountdownHms(totalSec: number) {
  const sec = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
