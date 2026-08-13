import { STRATEGY_DETAILS, STRATEGY_NAMES, type StrategyId } from "@/types";

export function Methodology() {
  const strategies = Object.entries(STRATEGY_NAMES) as Array<[StrategyId, string]>;

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-2xl text-ink mb-1">8-Strategy Methodology</h2>
      <p className="text-ink-soft text-sm mb-6">
        Signals combine into a weighted composite score — not independent checkboxes.
        A name hitting several setups at once ranks above a name hitting only one.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {strategies.map(([id, name], i) => (
          <div
            key={id}
            className="rounded-xl border border-ink/[0.08] bg-[#f7f8fc] p-4"
          >
            <span className="text-violet text-xs font-semibold">#{i + 1}</span>
            <p className="mt-1 text-sm font-semibold text-ink">{name}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {STRATEGY_DETAILS[id]}
            </p>
            {(id === "short_squeeze" || id === "catalyst_upside") && (
              <p className="mt-2 text-xs text-amber-600">
                Partial: options and short-interest data are limited on the free tier.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
