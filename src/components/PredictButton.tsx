"use client";

import { useEffect, useState } from "react";
import { BogenHit } from "@/components/BogenProvider";
import { TVMIcon } from "@/components/TVMBrand";
import { ProGlowText } from "@/components/ProGlowText";
import { UltraShinePhrase } from "@/components/UltraText";
import { useAuth } from "@/components/AuthProvider";
import {
  consumePredictUsage,
  loadPredictUsage,
  weeklyPredictLimit,
  type PredictKind,
  type PredictUsage,
} from "@/lib/predict-usage";
import type { PlanId } from "@/lib/plans";

const EMPTY_USAGE: PredictUsage = {
  weekId: "",
  pulse: 0,
  score: 0,
  addition: 0,
  horizon: 0,
  advanced: 0,
};

function kindCapLabel(kind: PredictKind) {
  if (kind === "pulse") return "Pulse Predicts";
  if (kind === "score") return "Portfolio Score Predictions";
  if (kind === "addition") return "Portfolio Addition Predictions";
  if (kind === "advanced") return "Advanced Predictions";
  return "Horizon predictions";
}

export function usePredictUsage(kind: PredictKind) {
  const { user, entitlement } = useAuth();
  const [usage, setUsage] = useState<PredictUsage>(EMPTY_USAGE);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadPredictUsage(user.uid).then(setUsage);
  }, [user]);

  async function consume() {
    if (!user) return { ok: false as const, usage };
    setBusy(true);
    try {
      const result = await consumePredictUsage(
        user.uid,
        kind,
        entitlement.plan,
      );
      setUsage(result.usage);
      return result;
    } finally {
      setBusy(false);
    }
  }

  return {
    usage,
    busy,
    consume,
    plan: entitlement.plan as PlanId,
    used: usage[kind],
  };
}

export function PredictButton({
  plan,
  kind,
  used,
  busy = false,
  predicted = false,
  hideLabel = "Hide",
  predictLabel = "Predict",
  onPredict,
  onUpgrade,
}: {
  plan: PlanId;
  kind: PredictKind;
  used: number;
  busy?: boolean;
  predicted?: boolean;
  hideLabel?: string;
  predictLabel?: string;
  onPredict: () => void;
  onUpgrade: (plan?: "pro" | "ultra") => void;
}) {
  const limit = weeklyPredictLimit(plan, kind);
  const remaining = limit == null ? null : Math.max(0, limit - used);
  const exhausted = remaining === 0;
  const ultra = plan === "ultra";
  const lockedToUltra = kind === "advanced" && plan !== "ultra";
  const lockedToPro = !lockedToUltra && plan === "free" && (limit == null || limit <= 0);

  if (lockedToUltra) {
    return (
      <button
        type="button"
        onClick={() => onUpgrade("ultra")}
        className="ultra-profile-glow-move inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
      >
        <TVMIcon name="lock" size={16} />
        <UltraShinePhrase>{`${predictLabel} · Ultra`}</UltraShinePhrase>
      </button>
    );
  }

  if (lockedToPro) {
    return (
      <button
        type="button"
        onClick={() => onUpgrade("pro")}
        className="pro-profile-glow inline-flex items-center gap-2 rounded-full bg-transparent px-5 py-2.5 text-sm font-semibold"
      >
        <TVMIcon name="lock" size={16} />
        <ProGlowText>{`${predictLabel} · Pro`}</ProGlowText>
      </button>
    );
  }

  if (exhausted) {
    const nextPlan = plan === "free" ? "pro" : "ultra";
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => onUpgrade(nextPlan)}
          className={`${
            nextPlan === "ultra"
              ? "ultra-profile-glow-move"
              : "pro-profile-glow"
          } inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold`}
        >
          {nextPlan === "ultra" ? (
            <UltraShinePhrase>Upgrade to Ultra</UltraShinePhrase>
          ) : (
            <ProGlowText>Upgrade to Pro</ProGlowText>
          )}
        </button>
        <p className="text-center text-[11px] text-ink-soft">
          <ProGlowText>
            {`${limit} ${kindCapLabel(kind)} used this week. ${
              nextPlan === "ultra" ? "Ultra is unlimited." : "Pro gets more each week."
            }`}
          </ProGlowText>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <BogenHit id={kind === "pulse" ? "pulse-predict" : kind === "advanced" ? "advanced-predict" : "predict"} compact fullWidth={false}>
      <button
        type="button"
        onClick={onPredict}
        disabled={busy}
        className={`${
          ultra ? "predict-glow predict-glow-ultra" : "predict-glow"
        } inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60`}
      >
        {predicted ? hideLabel : predictLabel}
      </button>
      </BogenHit>
      {remaining != null ? (
        <p className="text-[11px] text-ink-soft">
          {remaining} of {limit} left this week
        </p>
      ) : null}
    </div>
  );
}
