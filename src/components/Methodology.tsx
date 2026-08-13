import { STRATEGY_NAMES } from "@/types";

export function Methodology() {
  const strategies = Object.entries(STRATEGY_NAMES);

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-2xl text-white mb-1">8-Strategy Methodology</h2>
      <p className="text-slate-400 text-sm mb-6">
        Signals combine into a weighted composite score — not independent checkboxes.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {strategies.map(([id, name], i) => (
          <div
            key={id}
            className="rounded-xl border border-white/10 p-4 bg-white/[0.02]"
          >
            <span className="text-tvm-gold text-xs font-medium">#{i + 1}</span>
            <p className="text-sm text-white mt-1">{name}</p>
            {(id === "short_squeeze" || id === "catalyst_upside") && (
              <p className="text-xs text-amber-400/80 mt-2">
                Partial: options/short data limited on free tier
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
