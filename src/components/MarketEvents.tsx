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

const EMPTY_EVENT: MarketEvent = {
  title: "No headline this slot",
  region: "US",
  impact: "mixed",
  summary: "This slot fills when the session snapshot has another headline.",
  date: "",
};

export function MarketEvents({ events }: { events: MarketEvent[] }) {
  const headlines = events.filter((event) => event.region !== "Tech");
  const slots = [0, 1, 2, 3].map((index) => headlines[index] ?? EMPTY_EVENT);

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-6">
      <h2 className="font-display text-2xl text-ink">Market-Moving Events</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Headlines from this session&apos;s snapshot.
      </p>
      <div className="mt-6 grid gap-3">
        {slots.map((event, index) => (
          <article
            key={`${event.title}-${index}`}
            className="glass rounded-[22px] p-4 shadow-[0_16px_34px_-22px_rgba(52,41,120,0.4)]"
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
        ))}
      </div>
    </div>
  );
}
