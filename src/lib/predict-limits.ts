import type { PlanId } from "@/lib/plans";
import {
  FREE_WEEKLY_PULSE_PREDICT_LIMIT,
  PRO_WEEKLY_ADDITION_PREDICT_LIMIT,
  PRO_WEEKLY_HORIZON_PREDICT_LIMIT,
  PRO_WEEKLY_PULSE_PREDICT_LIMIT,
  PRO_WEEKLY_SCORE_PREDICT_LIMIT,
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

export function emptyPredictUsage(weekId = ""): PredictUsage {
  return { weekId, pulse: 0, score: 0, addition: 0, horizon: 0, advanced: 0 };
}
