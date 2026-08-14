export const NEW_BADGE_DAYS = 3;

export const NEW_FEATURE_IDS = ["bogen"] as const;

export type NewFeatureId = (typeof NEW_FEATURE_IDS)[number];

export type NewSeenMap = Partial<Record<NewFeatureId, string>>;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function todayStamp(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isDayStamp(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseStamp(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function calendarDaysBetween(from: string, to: string) {
  if (!isDayStamp(from) || !isDayStamp(to)) return NEW_BADGE_DAYS;
  return Math.round((parseStamp(to) - parseStamp(from)) / 86_400_000);
}

export function isNewBadgeActive(
  firstSeen: string | undefined,
  now = new Date(),
) {
  if (!firstSeen || !isDayStamp(firstSeen)) return true;
  return calendarDaysBetween(firstSeen, todayStamp(now)) < NEW_BADGE_DAYS;
}

export function parseNewSeen(value: unknown): NewSeenMap {
  if (!value || typeof value !== "object") return {};
  const next: NewSeenMap = {};
  for (const id of NEW_FEATURE_IDS) {
    const stamp = (value as Record<string, unknown>)[id];
    if (typeof stamp === "string" && isDayStamp(stamp)) next[id] = stamp;
  }
  return next;
}

export function missingNewSeenStamps(
  seen: NewSeenMap,
  now = new Date(),
): NewSeenMap {
  const today = todayStamp(now);
  const next: NewSeenMap = {};
  for (const id of NEW_FEATURE_IDS) {
    if (!seen[id]) next[id] = today;
  }
  return next;
}
