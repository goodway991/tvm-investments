"use client";

import { PLAN_FEATURES, type PaidPlanId, type PlanId } from "@/lib/plans";
import { showTvm10Labs } from "@/lib/beta-labs";
import { ProGlowText } from "@/components/ProGlowText";
import { UltraShinePhrase } from "@/components/UltraText";

function PlanMark({ included }: { included: boolean }) {
  if (included) {
    return (
      <span className="plan-mark plan-mark-yes" aria-label="Included">
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
      </span>
    );
  }

  return (
    <span className="plan-mark plan-mark-no" aria-label="Not included">
      <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5">
        <path
          d="M6 6 14 14M14 6 6 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function PlanComparisonTable({
  currentPlan,
  selectedPlan,
  onSelectPlan,
}: {
  currentPlan: PlanId;
  selectedPlan?: PaidPlanId;
  onSelectPlan?: (plan: PaidPlanId) => void;
}) {
  const showUltra = showTvm10Labs();
  const alreadyPro = currentPlan === "pro";
  const alreadyUltra = currentPlan === "ultra";
  const features = [...PLAN_FEATURES]
    .filter(
      (feature) =>
        (showUltra || !feature.labsOnly) &&
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
        <div className="plan-compare-h">
          Free
          {currentPlan === "free" ? (
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-violet">
              Current
            </span>
          ) : null}
        </div>
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
            <div className="plan-compare-cell plan-compare-feature">{feature.name}</div>
            <div className="plan-compare-cell plan-compare-mark">
              <PlanMark included={feature.free} />
            </div>
            <div className="plan-compare-cell plan-compare-mark">
              <PlanMark included={feature.pro} />
            </div>
            {showUltra ? (
              <div className="plan-compare-cell plan-compare-mark plan-compare-ultra">
                <PlanMark included={feature.ultra ?? feature.pro} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {showUltra ? (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
          *99% is an Ultra research-read target, not a guarantee. Horizon
          prediction caps apply when that suite ships. Pro’s 5/week is reviews
          and prediction scores combined.
        </p>
      ) : null}
    </>
  );
}
