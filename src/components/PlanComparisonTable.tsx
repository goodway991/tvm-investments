"use client";

import { PLAN_FEATURES } from "@/lib/plans";

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

function PlanWidget({
  title,
  current,
  included,
}: {
  title: string;
  current: boolean;
  included: (feature: (typeof PLAN_FEATURES)[number]) => boolean;
}) {
  const features = [...PLAN_FEATURES].sort(
    (left, right) => Number(left.free) - Number(right.free),
  );

  return (
    <article
      className={`glass rounded-[22px] p-4 sm:p-5 ${
        current ? "plan-widget-current" : ""
      }`}
    >
      <header className="mb-4 text-center">
        <h3
          className={`font-display text-xl font-bold ${
            title === "Pro" ? "text-violet" : "text-ink"
          }`}
        >
          {title}
        </h3>
        {current ? (
          <span className="archive-active-label mt-1 block">Current</span>
        ) : (
          <span className="mt-1 block h-[13px]" aria-hidden />
        )}
      </header>
      <ul className="space-y-1">
        {features.map((feature) => (
          <li
            key={feature.name}
            className="flex items-center justify-between gap-3 rounded-xl px-1 py-2"
          >
            <p className="text-sm font-medium leading-snug text-ink">
              {feature.name}
            </p>
            <PlanMark included={included(feature)} />
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PlanComparisonTable({
  currentPlan,
}: {
  currentPlan: "free" | "pro";
}) {
  const alreadyPro = currentPlan === "pro";

  return (
    <div className="grid gap-4 p-2 sm:grid-cols-2 sm:gap-5 sm:p-3">
      <PlanWidget
        title="Free"
        current={!alreadyPro}
        included={(feature) => feature.free}
      />
      <PlanWidget
        title="Pro"
        current={alreadyPro}
        included={(feature) => feature.pro}
      />
    </div>
  );
}
