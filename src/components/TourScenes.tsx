import type { JSX, ReactNode } from "react";
import { TVMBrand } from "@/components/TVMBrand";
import type { TourSceneId } from "@/lib/virtual-tour";

function WindowFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="tour-window">
      <div className="tour-window-bar">
        <span className="tour-traffic" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="tour-window-title">{title}</span>
      </div>
      <div className="tour-window-body">{children}</div>
    </div>
  );
}

function WelcomeScene() {
  return (
    <WindowFrame title="TVM Investments">
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="tour-float">
          <TVMBrand size={44} />
          <p className="mt-4 font-display text-xl font-bold text-ink">
            Welcome in
          </p>
          <p className="mt-1 text-sm text-ink-soft">Your weekday research desk</p>
        </div>
      </div>
    </WindowFrame>
  );
}

function DashboardScene() {
  const cards = [
    { label: "Top pick", value: "NVDA", delay: "0s" },
    { label: "Screened", value: "48", delay: "0.12s" },
    { label: "Movers", value: "↑ 12", delay: "0.24s" },
    { label: "Composite", value: "72", delay: "0.36s" },
  ];
  return (
    <WindowFrame title="Dashboard">
      <div className="grid h-full grid-cols-2 gap-2.5 p-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="tour-pop rounded-2xl bg-white/80 p-3 shadow-[0_10px_24px_-16px_rgba(30,70,160,0.35)]"
            style={{ animationDelay: card.delay }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet">
              {card.label}
            </p>
            <p className="mt-1 font-display text-lg font-bold text-ink">{card.value}</p>
          </div>
        ))}
      </div>
    </WindowFrame>
  );
}

function BriefScene() {
  return (
    <WindowFrame title="Daily Brief">
      <div className="flex h-full flex-col gap-2.5 p-4">
        <div className="tour-slide-right rounded-2xl bg-white/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet">
            Today
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">Three names flagged</p>
        </div>
        {["AAPL · quality + momentum", "MSFT · stable composite", "AMZN · volume spike"].map(
          (line, index) => (
            <div
              key={line}
              className="tour-slide-right rounded-xl bg-surface px-3 py-2 text-xs text-ink-soft"
              style={{ animationDelay: `${0.12 * (index + 1)}s` }}
            >
              {line}
            </div>
          ),
        )}
      </div>
    </WindowFrame>
  );
}

function ScreenerScene() {
  const signals = ["Trend", "RSI", "Volume", "News", "Quality", "Value", "Momentum", "Risk"];
  return (
    <WindowFrame title="Screener">
      <div className="flex h-full flex-col justify-center gap-3 p-4">
        <p className="text-xs font-semibold text-ink">Eight signals</p>
        <div className="flex flex-wrap gap-1.5">
          {signals.map((signal, index) => (
            <span
              key={signal}
              className="tour-signal rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {signal}
            </span>
          ))}
        </div>
        <p className="text-xs text-ink-soft">Filter, then tap a name to inspect it.</p>
      </div>
    </WindowFrame>
  );
}

function StockScene() {
  return (
    <WindowFrame title="NVDA">
      <div className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-2xl font-bold text-ink">NVDA</p>
            <p className="text-xs text-ink-soft">Stock sheet</p>
          </div>
          <span className="tour-pulse rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-600">
            +2.4%
          </span>
        </div>
        <svg viewBox="0 0 200 70" className="tour-draw mt-4 h-20 w-full" aria-hidden="true">
          <path
            d="M4 52 C 28 48, 40 30, 58 34 S 90 58, 110 28 S 150 12, 196 18"
            fill="none"
            stroke="#2f62ff"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <p className="mt-auto text-xs text-ink-soft">Close stays pinned — swipe or tap to leave.</p>
      </div>
    </WindowFrame>
  );
}

function WatchlistScene() {
  return (
    <WindowFrame title="Watchlist pulse">
      <div className="flex h-full flex-col gap-2.5 p-4">
        {["AAPL", "MSFT", "GOOGL"].map((symbol, index) => (
          <div
            key={symbol}
            className="tour-slide-right flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2.5"
            style={{ animationDelay: `${index * 0.14}s` }}
          >
            <span className="font-display text-sm font-bold text-ink">{symbol}</span>
            <span className="h-8 w-16 rounded-lg bg-gradient-to-r from-violet/20 to-violet/5" />
          </div>
        ))}
        <p className="text-xs text-ink-soft">Compact shows only your names. Expand to add more.</p>
      </div>
    </WindowFrame>
  );
}

function PortfolioScene() {
  return (
    <WindowFrame title="Portfolio">
      <div className="flex h-full flex-col justify-center gap-3 p-5">
        <div className="tour-pop rounded-2xl bg-white/85 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet">
            Tracked value
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">$0.00</p>
          <p className="mt-1 text-xs text-ink-soft">New accounts start at zero</p>
        </div>
        <div className="tour-pop rounded-xl bg-surface px-3 py-2 text-xs text-ink-soft" style={{ animationDelay: "0.16s" }}>
          Add cash and positions you want to follow.
        </div>
      </div>
    </WindowFrame>
  );
}

function ReportsScene() {
  return (
    <WindowFrame title="Reports">
      <div className="flex h-full flex-col gap-2.5 p-4">
        {["Flagged pick note", "Short-term score", "Long-term score"].map((line, index) => (
          <div
            key={line}
            className="tour-pop rounded-2xl bg-white/80 px-3 py-3"
            style={{ animationDelay: `${index * 0.12}s` }}
          >
            <div className="mb-2 h-2 w-16 rounded-full bg-violet/30" />
            <p className="text-sm font-semibold text-ink">{line}</p>
          </div>
        ))}
      </div>
    </WindowFrame>
  );
}

function SettingsScene() {
  return (
    <WindowFrame title="Settings">
      <div className="flex h-full flex-col justify-center gap-3 p-5">
        <div className="tour-pop rounded-2xl bg-white/85 p-4">
          <p className="text-sm font-semibold text-ink">Plan · Feedback · Account</p>
          <p className="mt-1 text-xs text-ink-soft">View plan, send a bug or idea, log out.</p>
        </div>
        <div className="tour-pulse glass-violet rounded-full px-4 py-2 text-center text-sm font-semibold text-white">
          Virtual Tour
        </div>
      </div>
    </WindowFrame>
  );
}

function RepeatScene() {
  return (
    <WindowFrame title="Replay anytime">
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-ink">Settings → Virtual Tour</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Take this walkthrough again whenever you want. It lives in Settings, on
            your account card.
          </p>
        </div>
      </div>
    </WindowFrame>
  );
}

const SCENES: Record<TourSceneId, () => JSX.Element> = {
  welcome: WelcomeScene,
  dashboard: DashboardScene,
  brief: BriefScene,
  screener: ScreenerScene,
  stock: StockScene,
  watchlist: WatchlistScene,
  portfolio: PortfolioScene,
  reports: ReportsScene,
  settings: SettingsScene,
  repeat: RepeatScene,
};

export function TourScene({ id }: { id: TourSceneId }) {
  const Scene = SCENES[id];
  return <Scene />;
}
