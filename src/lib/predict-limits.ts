import type { PlanId } from "@/lib/plans";
import {
  FREE_WEEKLY_PULSE_PREDICT_LIMIT,
  PRO_WEEKLY_ADDITION_PREDICT_LIMIT,
  PRO_WEEKLY_HORIZON_PREDICT_LIMIT,
  PRO_WEEKLY_PULSE_PREDICT_LIMIT,
  PRO_WEEKLY_SCORE_PREDICT_LIMIT,
  ULTRA_WEEKLY_ADDITION_PREDICT_LIMIT,
  ULTRA_WEEKLY_ADVANCED_PREDICT_LIMIT,
  ULTRA_WEEKLY_HORIZON_PREDICT_LIMIT,
  ULTRA_WEEKLY_PULSE_PREDICT_LIMIT,
  ULTRA_WEEKLY_SCORE_PREDICT_LIMIT,
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

/** Always a finite number — Ultra is capped server-side so clients cannot grant unlimited AI. */
export function weeklyPredictLimit(plan: PlanId, kind: PredictKind): number {
  if (kind === "advanced") {
    return plan === "ultra" ? ULTRA_WEEKLY_ADVANCED_PREDICT_LIMIT : 0;
  }
  if (kind === "pulse") {
    if (plan === "ultra") return ULTRA_WEEKLY_PULSE_PREDICT_LIMIT;
    if (plan === "pro") return PRO_WEEKLY_PULSE_PREDICT_LIMIT;
    return FREE_WEEKLY_PULSE_PREDICT_LIMIT;
  }
  if (plan === "ultra") {
    if (kind === "score") return ULTRA_WEEKLY_SCORE_PREDICT_LIMIT;
    if (kind === "addition") return ULTRA_WEEKLY_ADDITION_PREDICT_LIMIT;
    return ULTRA_WEEKLY_HORIZON_PREDICT_LIMIT;
  }
  if (plan !== "pro") return 0;
  if (kind === "score") return PRO_WEEKLY_SCORE_PREDICT_LIMIT;
  if (kind === "addition") return PRO_WEEKLY_ADDITION_PREDICT_LIMIT;
  return PRO_WEEKLY_HORIZON_PREDICT_LIMIT;
}

export function emptyPredictUsage(weekId = ""): PredictUsage {
  return { weekId, pulse: 0, score: 0, addition: 0, horizon: 0, advanced: 0 };
}
