import type { MarketEvent } from "@/types";

const impactColors = {
  bullish: "text-gain bg-green-500/10 border-green-500/30",
  bearish: "text-loss bg-red-500/10 border-red-500/30",
  mixed: "text-amber-300 bg-amber-500/10 border-amber-500/30",
};

const regionLabels = {
  US: "🇺🇸 US",
  Global: "🌍 Global",
  Tech: "💻 Tech",
};

export function MarketEvents({ events }: { events: MarketEvent[] }) {
  return (
    <div className="glass rounded-2xl p-6 h-full">
      <h2 className="font-display text-2xl text-white mb-1">Market-Moving Events</h2>
      <p className="text-slate-400 text-sm mb-6">US & global headlines affecting today&apos;s session.</p>
      <div className="space-y-4">
        {events
          .filter((e) => e.region !== "Tech")
          .map((event, i) => (
            <article
              key={i}
              className="rounded-xl border border-white/10 p-4 bg-white/[0.02]"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-500">{regionLabels[event.region]}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${impactColors[event.impact]}`}
                >
                  {event.impact}
                </span>
              </div>
              <h3 className="font-medium text-white">{event.title}</h3>
              <p className="text-sm text-slate-400 mt-2">{event.summary}</p>
            </article>
          ))}
      </div>
    </div>
  );
}
