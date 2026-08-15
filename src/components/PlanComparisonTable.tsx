"use client";

import { PLAN_FEATURES, type PlanId } from "@/lib/plans";
import { showBeta3Labs } from "@/lib/beta-labs";
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
}: {
  currentPlan: PlanId;
}) {
  const showUltra = showBeta3Labs();
  const alreadyPro = currentPlan === "pro";
  const alreadyUltra = currentPlan === "ultra";
  const features = [...PLAN_FEATURES]
    .filter(
      (feature) =>
        (showUltra || !feature.labsOnly) &&
        (showUltra || feature.name !== "Portfolio book review"),
    )
    .sort((left, right) => Number(left.free) - Number(right.free));

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
      <div className="plan-compare-h text-violet">
        <ProGlowText>Pro</ProGlowText>
        {alreadyPro ? (
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-violet">
            Current
          </span>
        ) : null}
      </div>
      {showUltra ? (
        <div className="plan-compare-h plan-compare-ultra">
          <UltraShinePhrase>Ultra</UltraShinePhrase>
          {alreadyUltra ? (
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Current
            </span>
          ) : null}
        </div>
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
