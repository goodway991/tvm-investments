"use client";

import { PLAN_FEATURES } from "@/lib/plans";
import { ProGlowText } from "@/components/ProGlowText";

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
  currentPlan: "free" | "pro";
}) {
  const alreadyPro = currentPlan === "pro";
  const features = [...PLAN_FEATURES].sort(
    (left, right) => Number(left.free) - Number(right.free),
  );

  return (
    <div className="plan-compare">
      <div
        className={`plan-current-pane ${alreadyPro ? "is-pro" : "is-free"}`}
        aria-hidden
      />
      <div className="plan-compare-h plan-compare-feature">Features</div>
      <div className="plan-compare-h">
        Free
        {!alreadyPro ? (
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
      {features.map((feature) => (
        <div key={feature.name} className="contents">
          <div className="plan-compare-cell plan-compare-feature">{feature.name}</div>
          <div className="plan-compare-cell plan-compare-mark">
            <PlanMark included={feature.free} />
          </div>
          <div className="plan-compare-cell plan-compare-mark">
            <PlanMark included={feature.pro} />
          </div>
        </div>
      ))}
    </div>
  );
}
