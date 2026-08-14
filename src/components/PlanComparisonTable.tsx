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

export function PlanComparisonTable({
  currentPlan,
}: {
  currentPlan: "free" | "pro";
}) {
  const alreadyPro = currentPlan === "pro";

  return (
    <div className="overflow-hidden rounded-[22px] border border-violet/15">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-violet/[0.06]">
            <th className="px-4 py-4 font-display text-xs font-semibold uppercase tracking-widest text-ink-soft sm:px-5">
              Features
            </th>
            <th
              className={`px-3 py-4 text-center font-display text-base font-bold text-ink ${
                alreadyPro ? "" : "plan-col-current"
              }`}
            >
              Free
              {!alreadyPro ? (
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-violet">
                  Current
                </span>
              ) : null}
            </th>
            <th
              className={`px-3 py-4 text-center font-display text-base font-bold text-violet ${
                alreadyPro ? "plan-col-current" : "bg-violet/[0.08]"
              }`}
            >
              Pro
              {alreadyPro ? (
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-violet">
                  Current
                </span>
              ) : null}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...PLAN_FEATURES]
            .sort((left, right) => Number(left.free) - Number(right.free))
            .map((feature) => (
            <tr key={feature.name} className="border-t border-violet/10">
              <th className="px-4 py-3.5 font-medium text-ink sm:px-5">
                {feature.name}
              </th>
              <td className={`px-3 py-3.5 ${alreadyPro ? "" : "plan-col-current"}`}>
                <div className="grid place-items-center">
                  <PlanMark included={feature.free} />
                </div>
              </td>
              <td
                className={`px-3 py-3.5 ${
                  alreadyPro ? "plan-col-current" : "bg-violet/[0.04]"
                }`}
              >
                <div className="grid place-items-center">
                  <PlanMark included={feature.pro} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
