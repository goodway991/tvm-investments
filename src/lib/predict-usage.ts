"use client";

import {
  FREE_WEEKLY_PULSE_PREDICT_LIMIT,
  PRO_WEEKLY_ADDITION_PREDICT_LIMIT,
  PRO_WEEKLY_HORIZON_PREDICT_LIMIT,
  PRO_WEEKLY_PULSE_PREDICT_LIMIT,
  PRO_WEEKLY_SCORE_PREDICT_LIMIT,
  type PlanId,
} from "@/lib/plans";

export type PredictKind = "pulse" | "score" | "addition" | "horizon" | "advanced";

export type PredictUsage = {
  weekId: string;
  pulse: number;
  score: number;
  addition: number;
  horizon: number;
  advanced: number;
};

export function etWeekId(date = new Date()) {
  const ymd = date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weeklyPredictLimit(plan: PlanId, kind: PredictKind): number | null {
  if (plan === "ultra") return null;
  if (kind === "pulse") {
    return plan === "pro"
      ? PRO_WEEKLY_PULSE_PREDICT_LIMIT
      : FREE_WEEKLY_PULSE_PREDICT_LIMIT;
  }
  if (kind === "advanced") return 0;
  if (plan !== "pro") return 0;
  if (kind === "score") return PRO_WEEKLY_SCORE_PREDICT_LIMIT;
  if (kind === "addition") return PRO_WEEKLY_ADDITION_PREDICT_LIMIT;
  return PRO_WEEKLY_HORIZON_PREDICT_LIMIT;
}

function usageKey(uid: string) {
  return `tvm-predict-usage:${uid}`;
}

function emptyUsage(weekId = etWeekId()): PredictUsage {
  return { weekId, pulse: 0, score: 0, addition: 0, horizon: 0, advanced: 0 };
}

function countOf(data: Record<string, unknown>, key: string) {
  return Math.max(0, Number(data[key]) || 0);
}

function parseUsage(raw: unknown, weekId: string): PredictUsage {
  if (!raw || typeof raw !== "object") return emptyUsage(weekId);
  const data = raw as Record<string, unknown>;
  const storedWeek = typeof data.weekId === "string" ? data.weekId : "";
  if (storedWeek !== weekId) return emptyUsage(weekId);
  return {
    weekId,
    pulse: countOf(data, "pulse"),
    score: countOf(data, "score"),
    addition: countOf(data, "addition"),
    horizon: countOf(data, "horizon"),
    advanced: countOf(data, "advanced"),
  };
}

export function readLocalPredictUsage(uid: string): PredictUsage {
  const weekId = etWeekId();
  try {
    const raw = window.localStorage.getItem(usageKey(uid));
    return parseUsage(raw ? JSON.parse(raw) : null, weekId);
  } catch {
    return emptyUsage(weekId);
  }
}

export function writeLocalPredictUsage(uid: string, usage: PredictUsage) {
  try {
    window.localStorage.setItem(usageKey(uid), JSON.stringify(usage));
  } catch {
    /* private mode */
  }
}

/** Soft UI counters only — never touch Firestore (saves Blaze reads; not authoritative). */
export async function loadPredictUsage(uid: string): Promise<PredictUsage> {
  return readLocalPredictUsage(uid);
}

/**
 * Soft UI gate. Real limits are plan checks + `/api` quotas on the server.
 * Do not write predict_usage to Firestore — clients must not own quota docs.
 */
export async function consumePredictUsage(
  uid: string,
  kind: PredictKind,
  plan: PlanId,
): Promise<{ ok: boolean; usage: PredictUsage }> {
  const limit = weeklyPredictLimit(plan, kind);
  const current = await loadPredictUsage(uid);
  if (limit == null) return { ok: true, usage: current };
  if (limit <= 0 || current[kind] >= limit) return { ok: false, usage: current };
  const next: PredictUsage = { ...current, [kind]: current[kind] + 1 };
  writeLocalPredictUsage(uid, next);
  return { ok: true, usage: next };
}
