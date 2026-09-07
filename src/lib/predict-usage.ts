"use client";

import { authedFetch } from "@/lib/authed-fetch";
import {
  emptyPredictUsage,
  weeklyPredictLimit,
  type PredictKind,
  type PredictUsage,
} from "@/lib/predict-limits";
import type { PlanId } from "@/lib/plans";

export type { PredictKind, PredictUsage };
export { weeklyPredictLimit };

export async function loadPredictUsage(_uid: string): Promise<PredictUsage> {
  void _uid;
  try {
    const response = await authedFetch("/api/predict-usage");
    const payload = (await response.json()) as { usage?: PredictUsage };
    if (!response.ok || !payload.usage) return emptyPredictUsage();
    return payload.usage;
  } catch {
    return emptyPredictUsage();
  }
}

export async function consumePredictUsage(
  _uid: string,
  kind: PredictKind,
  _plan: PlanId,
): Promise<{ ok: boolean; usage: PredictUsage }> {
  void _uid;
  void _plan;
  try {
    const response = await authedFetch("/api/predict-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const payload = (await response.json()) as {
      usage?: PredictUsage;
      error?: string;
    };
    if (!payload.usage) return { ok: false, usage: emptyPredictUsage() };
    return { ok: response.ok, usage: payload.usage };
  } catch {
    return { ok: false, usage: emptyPredictUsage() };
  }
}
