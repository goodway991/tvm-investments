"use client";

import {
  PLAN_FEATURES,
  planFeatureMark,
  type PlanId,
} from "@/lib/plans";
import { showTvm10Labs } from "@/lib/beta-labs";
import { BogenTerms } from "@/components/BogenTerms";
import { ProGlowText } from "@/components/ProGlowText";
import { UltraShinePhrase } from "@/components/UltraText";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5">
      <path
        d="M4.5 10.5 8.2 14 15.5 6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5">
      <path
        d="M6 6 14 14M14 6 6 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlanMark({
  kind,
  mini = false,
}: {
  kind: "yes" | "better" | "no";
  mini?: boolean;
}) {
  const label =
    kind === "yes"
      ? "Included"
      : kind === "better"
        ? "Better version than this row"
        : "Not included";
  return (
    <span
      className={`plan-mark plan-mark-${kind}${mini ? " plan-mark-mini" : ""}`}
      aria-label={label}
      title={label}
    >
      {kind === "no" ? <CrossIcon /> : <CheckIcon />}
    </span>
  );
}

export function PlanComparisonTable({
  currentPlan,
  selectedPlan,
  onSelectPlan,
}: {
  currentPlan: PlanId;
  selectedPlan?: PlanId;
  onSelectPlan?: (plan: PlanId) => void;
}) {
  const showUltra = showTvm10Labs();
  const alreadyPro = currentPlan === "pro";
  const alreadyUltra = currentPlan === "ultra";
  const features = [...PLAN_FEATURES]
    .filter(
      (feature) =>
        (showUltra || !feature.labsOnly) &&
        (!showUltra || !feature.hideInLabs) &&
        (showUltra || feature.name !== "Portfolio book review"),
    )
    .sort((left, right) => {
      const rank = (feature: (typeof features)[number]) => {
        if (!feature.pro) return 0;
        if (!feature.free) return 1;
        return 2;
      };
      return rank(left) - rank(right);
    });

  return (
    <>
      <div className="plan-compare-wrap">
        <div className="plan-mark-legend" aria-label="Plan icon key">
          <span>
            <PlanMark kind="yes" mini />
            included
          </span>
          <span>
            <PlanMark kind="better" mini />
            better than the plan to the left
          </span>
          <span>
            <PlanMark kind="no" mini />
            not included
          </span>
        </div>
        <div className={`plan-compare ${showUltra ? "has-ultra" : ""}`}>
        {alreadyUltra ? null : (
          <div
            className={`plan-current-pane ${alreadyPro ? "is-pro" : "is-free"}`}
            aria-hidden
          />
        )}
        {showUltra ? (
          <div className="plan-current-pane plan-ultra-pane" aria-hidden />
        ) : null}
        <div className="plan-compare-h plan-compare-feature">Features</div>
        <button
          type="button"
          onClick={() => onSelectPlan?.("free")}
          className={`plan-compare-h plan-compare-pick ${
            selectedPlan === "free" ? "is-picked" : ""
          }`}
        >
          Free
          {currentPlan === "free" ? (
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-violet">
              Current
            </span>
          ) : selectedPlan === "free" ? (
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-violet">
              Selected
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onSelectPlan?.("pro")}
          className={`plan-compare-h plan-compare-pick text-violet ${
            selectedPlan === "pro" ? "is-picked" : ""
          }`}
        >
          <ProGlowText>Pro</ProGlowText>
          {alreadyPro ? (
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-violet">
              Current
            </span>
          ) : selectedPlan === "pro" ? (
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-violet">
              Selected
            </span>
          ) : null}
        </button>
        {showUltra ? (
          <button
            type="button"
            onClick={() => onSelectPlan?.("ultra")}
            className={`plan-compare-h plan-compare-pick plan-compare-ultra ${
              selectedPlan === "ultra" ? "is-picked" : ""
            }`}
          >
            <UltraShinePhrase>Ultra</UltraShinePhrase>
            {alreadyUltra ? (
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Current
              </span>
            ) : selectedPlan === "ultra" ? (
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Selected
              </span>
            ) : null}
          </button>
        ) : null}
        {features.map((feature) => (
          <div key={feature.name} className="contents">
            <div className="plan-compare-cell plan-compare-feature">
              <BogenTerms text={feature.name} />
            </div>
            <div className="plan-compare-cell plan-compare-mark">
              <PlanMark kind={planFeatureMark(feature, "free", features)} />
            </div>
            <div className="plan-compare-cell plan-compare-mark">
              <PlanMark kind={planFeatureMark(feature, "pro", features)} />
            </div>
            {showUltra ? (
              <div className="plan-compare-cell plan-compare-mark plan-compare-ultra">
                <PlanMark kind={planFeatureMark(feature, "ultra", features)} />
              </div>
            ) : null}
          </div>
        ))}
        </div>
      </div>
      {showUltra ? (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
          <ProGlowText>
            *99% is an Ultra research-read target, not a guarantee. Free gets
            decent short-term predictions (2 Pulse Predicts / week). Pro gets
            non-algorithm based predictions with weekly caps: 5 Pulse, 3
            Portfolio Score, 1 Portfolio Addition, 5 Horizon. Ultra gets
            algorithm-based 99%* accuracy predictions, unlimited, plus Advanced
            Predictions on the workstation.
          </ProGlowText>
        </p>
      ) : null}
    </>
  );
}
