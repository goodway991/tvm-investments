export const NEW_BADGE_DAYS = 3;

import { showTvm10Labs } from "@/lib/beta-labs";

export const NEW_FEATURE_IDS = [
  "bogen",
  "portfolio",
  "settings",
  "density",
  "appearance",
  "horizon",
  "workstation",
  "pulse",
  "sectors",
] as const;

export type NewFeatureId = (typeof NEW_FEATURE_IDS)[number];

/** First-seen stamps reset when this wave changes. Bump on launch so everyone gets 3 days. */
export const NEW_BADGE_WAVE = showTvm10Labs() ? "tvm-1-launch" : "beta-3";

const BETA_FEATURE_IDS: NewFeatureId[] = [
  "bogen",
  "settings",
  "appearance",
  "density",
];

const LAUNCH_FEATURE_IDS: NewFeatureId[] = [
  "portfolio",
  "horizon",
  "workstation",
  "pulse",
  "sectors",
];

export function publicNewFeatureIds(): NewFeatureId[] {
  if (showTvm10Labs()) return [...BETA_FEATURE_IDS, ...LAUNCH_FEATURE_IDS];
  return [...BETA_FEATURE_IDS];
}

export function launchFeatureIds(): NewFeatureId[] {
  return showTvm10Labs() ? [...LAUNCH_FEATURE_IDS] : [];
}

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

export function mergeNewSeen(
  local: NewSeenMap,
  cloud: NewSeenMap,
  cloudWave: string,
  localWave = "",
  now = new Date(),
): { seen: NewSeenMap; wave: string } {
  const launch = new Set(launchFeatureIds());
  const combined = { ...local, ...cloud };
  const dropLaunch = (map: NewSeenMap): NewSeenMap =>
    Object.fromEntries(
      Object.entries(map).filter(([id]) => !launch.has(id as NewFeatureId)),
    );
  let base: NewSeenMap;
  if (cloudWave === NEW_BADGE_WAVE) {
    base = combined;
  } else if (localWave === NEW_BADGE_WAVE) {
    base = {
      ...dropLaunch(combined),
      ...Object.fromEntries(
        Object.entries(local).filter(([id]) => launch.has(id as NewFeatureId)),
      ),
    };
  } else {
    base = {};
  }
  const today = todayStamp(now);
  const next: NewSeenMap = { ...base };
  for (const id of publicNewFeatureIds()) {
    if (!next[id]) next[id] = today;
  }
  return { seen: next, wave: NEW_BADGE_WAVE };
}
