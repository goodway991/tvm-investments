import type { MarketEvent } from "@/types";

const impactColors = {
  bullish: "text-gain bg-green-500/10 border-green-500/20",
  bearish: "text-loss bg-red-500/10 border-red-500/20",
  mixed: "text-amber-700 bg-amber-500/10 border-amber-500/20",
};

const regionLabels = {
  US: "🇺🇸 US",
  Global: "🌍 Global",
  Tech: "💻 Tech",
};

export function MarketEvents({ events }: { events: MarketEvent[] }) {
  const headlines = events.filter((event) => event.region !== "Tech");

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-6">
      <h2 className="font-display text-2xl text-ink">Market-Moving Events</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Headlines from this session&apos;s snapshot.
      </p>
      <div className="mt-6 space-y-4">
        {headlines.length === 0 ? (
          <p className="text-sm text-ink-soft">No session headlines in this snapshot.</p>
        ) : (
          headlines.map((event, index) => (
            <article
              key={`${event.title}-${index}`}
              className="rounded-xl border border-ink/[0.08] bg-[#f7f8fc] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-ink-soft">{regionLabels[event.region]}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${impactColors[event.impact]}`}
                >
                  {event.impact}
                </span>
              </div>
              <h3 className="font-medium text-ink">{event.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{event.summary}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
