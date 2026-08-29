import type { JSX, ReactNode } from "react";
import { LoopMotion } from "@/components/LoopMotion";
import { ProGlowText } from "@/components/ProGlowText";
import type { ReleaseFeatureVisualId } from "@/lib/release-notes";

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-ink/[0.06] bg-surface px-3 py-2">
      <span className="h-2 w-2 rounded-full bg-coral/80" />
      <span className="h-2 w-2 rounded-full bg-amber-400/90" />
      <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
      <span className="ml-1 text-[11px] font-semibold text-ink-soft">
        <ProGlowText>{title}</ProGlowText>
      </span>
    </div>
  );
}

function MiniWindow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-ink/[0.08] bg-white">
      <WindowChrome title={title} />
      {children}
    </div>
  );
}

function VideoWindow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-ink/[0.08] bg-white">
      <WindowChrome title={title} />
      {children}
      <div className="flex items-center gap-2 border-t border-ink/[0.06] bg-surface px-3 py-2">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-white">
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
            <path d="M3.2 1.8v8.4L10.2 6 3.2 1.8Z" fill="currentColor" />
          </svg>
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
          <span className="wn-video-playhead block h-full rounded-full bg-violet" />
        </div>
        <span className="text-[10px] font-semibold tabular-nums text-ink-soft">loop</span>
      </div>
    </div>
  );
}

function DemoCursor() {
  return (
    <svg className="wn-events-cursor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.2 3.1 20 12.2l-7.1.5 3.7 8.6-2.8 1.2-3.7-8.6L4.2 16.8V3.1Z"
        fill="#12203c"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BogenVisual() {
  return (
    <MiniWindow title="Settings · Bogen mode">
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink">Bogen mode</p>
            <span className="new-badge">New</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
            Unfamiliar words get a dotted underline. Tap one for a short popup.
          </p>
          <p className="mt-3 text-xs">
            <span className="bogen-term">composite score</span>
            {" · "}
            <span className="bogen-term">paper book</span>
          </p>
          <div className="mt-3 flex gap-2">
            <span className="glass-violet rounded-full px-3 py-1 text-[11px] font-semibold text-white">
              On
            </span>
            <span className="rounded-full border border-ink/10 px-3 py-1 text-[11px] font-semibold text-ink-soft">
              Off
            </span>
          </div>
        </div>
        <div className="relative rounded-2xl bg-surface p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-sm font-bold text-ink">Dashboard</p>
            <span className="bogen-tip" aria-hidden>
              ?
            </span>
          </div>
          <div className="mt-3 rounded-2xl border border-ink/[0.08] bg-white p-3 shadow-[0_12px_24px_-18px_rgba(30,70,160,0.45)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet">
              Bogen mode
            </p>
            <p className="mt-1 text-xs font-semibold text-ink">What it is</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
              Home after you sign in — today’s scan at a glance.
            </p>
            <p className="mt-2 text-xs font-semibold text-ink">How to use it</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
              Tap a card to jump in, or search a ticker.
            </p>
          </div>
        </div>
      </div>
    </MiniWindow>
  );
}

function EventsVisual() {
  return (
    <MiniWindow title="Daily Brief · Market-moving events">
      <div className="wn-events-stage relative space-y-2.5 bg-surface p-4">
        <article className="wn-event-hit rounded-[18px] border border-ink/[0.06] bg-white p-3 shadow-[0_12px_24px_-18px_rgba(30,70,160,0.4)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-soft">🇺🇸 US</span>
              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] text-gain">
                bullish
              </span>
            </div>
            <span className="relative min-w-[2.4rem] text-right text-[11px] font-semibold text-violet">
              <span className="wn-event-more">More</span>
              <span className="wn-event-close">Close</span>
            </span>
          </div>
          <h3 className="text-sm font-medium text-ink">Chip makers jump after a supply note</h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
            A foundry update lifts the tape for designers and equipment names into the close.
          </p>
          <div className="wn-event-extra">
            <div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
                The note points to stronger AI server demand, so the card grows with that extra
                read and the names that moved with it. Tap again to fold it back to the headline.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-semibold text-violet">
                  Reuters
                </span>
                <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-semibold text-violet">
                  NVDA
                </span>
                <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-semibold text-violet">
                  AVGO
                </span>
              </div>
            </div>
          </div>
          <p className="wn-event-hint mt-2 text-[10px] font-medium text-violet">
            Tap for more detail
          </p>
        </article>
        <article className="rounded-[18px] border border-ink/[0.06] bg-white/80 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] text-ink-soft">💻 Tech</span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700">
              mixed
            </span>
          </div>
          <h3 className="text-sm font-medium text-ink">Cloud spend holds, guidance stays tight</h3>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
            Another card stays collapsed until you tap it.
          </p>
        </article>
        <DemoCursor />
      </div>
    </MiniWindow>
  );
}

function AccountScoreVisual() {
  const cards = [
    { label: "Top pick · NVDA", value: "+2.41%", badge: "" },
    { label: "Names screened", value: "1,487", badge: "universe" },
    { label: "Daily movers", value: "86", badge: "ranked" },
    { label: "Account score", value: "74 / 100", badge: "12 names", highlight: true },
  ];

  return (
    <MiniWindow title="Daily Brief · Account score">
      <div className="bg-surface p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className={`rounded-[18px] p-3 ${
                card.highlight
                  ? "glass-violet text-white shadow-[0_12px_24px_-14px_rgba(47,98,255,0.7)]"
                  : "border border-ink/[0.06] bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`text-[10px] leading-tight ${
                    card.highlight ? "text-white/80" : "text-ink-soft"
                  }`}
                >
                  {card.label}
                </span>
                {card.badge ? (
                  <span
                    className={`shrink-0 text-[9px] font-semibold ${
                      card.highlight ? "text-emerald-200" : "text-emerald-600"
                    }`}
                  >
                    {card.badge}
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-1 font-display text-lg font-bold leading-tight ${
                  card.highlight ? "text-white" : "text-ink"
                }`}
              >
                {card.value}
              </p>
            </article>
          ))}
        </div>
      </div>
    </MiniWindow>
  );
}

function PortfolioTwoVisual() {
  return (
    <MiniWindow title="Portfolio 2.0 · Current book">
      <div className="space-y-3 bg-surface p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet">
              Current book
            </p>
            <p className="font-display text-lg font-bold text-ink">$24,810</p>
          </div>
          <p className="text-[11px] text-ink-soft">2 holdings · cash $10,964</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="font-display text-sm font-bold text-ink">AMZN</p>
              <p className="text-[10px] text-ink-soft">50 shares · bought 3/12</p>
            </div>
            <p className="text-sm font-semibold text-ink">$8,920</p>
          </div>
          <div className="flex items-center justify-between border-t border-ink/[0.06] px-3 py-2">
            <div>
              <p className="font-display text-sm font-bold text-ink">GOOGL</p>
              <p className="text-[10px] text-ink-soft">30 shares · $164.20</p>
            </div>
            <p className="text-sm font-semibold text-ink">$4,926</p>
          </div>
        </div>
        <div className="flex justify-center">
          <span className="pro-profile-glow inline-flex rounded-full bg-transparent px-4 py-1.5 text-[11px] font-semibold text-ink">
            Analyze book
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-xl bg-white px-2 py-2">
            <p className="text-[9px] text-ink-soft">Overall</p>
            <p className="font-display text-sm font-bold text-ink">74</p>
          </div>
          <div className="rounded-xl bg-white px-2 py-2">
            <p className="text-[9px] text-ink-soft">Mix</p>
            <p className="font-display text-sm font-bold text-ink">80</p>
          </div>
          <div className="rounded-xl bg-white px-2 py-2">
            <p className="text-[9px] text-ink-soft">Cash</p>
            <p className="font-display text-sm font-bold text-ink">62</p>
          </div>
        </div>
      </div>
    </MiniWindow>
  );
}

function HorizonVisual() {
  return (
    <VideoWindow title="Horizon Suite · Forward path">
      <div className="wn-horizon-stage space-y-3 bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <span className="wn-horizon-chip wn-horizon-nvda rounded-full bg-violet px-2.5 py-1 text-[10px] font-semibold text-white">
              NVDA
            </span>
            <span className="wn-horizon-chip wn-horizon-amzn rounded-full bg-ink/[0.06] px-2.5 py-1 text-[10px] font-semibold text-ink">
              AMZN
            </span>
          </div>
          <span className="wn-horizon-day relative inline-block min-w-[7.6rem] rounded-full border border-violet/15 bg-violet/10 px-2.5 py-1 text-center text-[10px] font-semibold text-violet">
            <span className="wn-horizon-now">Now</span>
            <span className="wn-horizon-six">6 trading days</span>
            <span className="wn-horizon-week">1 week</span>
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white px-2 pt-2">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-ink-soft">
            Forward path
          </p>
          <p className="wn-horizon-price px-1 font-display text-lg font-bold text-ink">
            <span className="wn-horizon-live">$118.40</span>
            <span className="wn-horizon-proj">$124.10</span>
          </p>
          <svg viewBox="0 0 320 92" className="mt-1 h-[5.6rem] w-full" aria-hidden>
            <path
              d="M8 64 C48 62 78 50 112 54 S168 38 200 42"
              fill="none"
              stroke="#2f62ff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              className="wn-horizon-band"
              d="M200 42 C232 36 268 24 312 18 L312 48 C268 52 232 58 200 42Z"
              fill="rgba(255, 210, 176, 0.28)"
            />
            <path
              className="wn-horizon-pred wn-horizon-pred-pro"
              d="M200 42 C232 36 268 24 312 18"
              fill="none"
              stroke="#ffd2b0"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              className="wn-horizon-pred wn-horizon-pred-ultra"
              d="M200 42 C232 36 268 24 312 18"
              fill="none"
              stroke="#111111"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <circle cx="200" cy="42" r="3.2" fill="#2f62ff" />
          </svg>
          <div className="relative mx-1 mb-2 mt-1 h-2 rounded-full bg-ink/[0.08]">
            <span className="wn-horizon-thumb absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-violet shadow-[0_0_0_3px_rgba(47,98,255,0.18)]" />
          </div>
        </div>

        <div className="flex justify-center">
          <span className="wn-horizon-predict pro-profile-glow inline-flex rounded-full bg-transparent px-4 py-1.5 text-[11px] font-semibold">
            Predict
          </span>
        </div>
      </div>
    </VideoWindow>
  );
}

function UltraWelcomeVisual() {
  return (
    <MiniWindow title="Dashboard · Ultra">
      <div className="space-y-3 bg-surface p-4">
        <h2 className="font-display text-xl font-bold text-ink">
          Welcome, <span className="ultra-name-shine">Alex</span>
        </h2>
        <p className="text-[11px] leading-relaxed text-ink-soft">
          Unlimited Predict, 6:00 good morning, Portfolio 2.0, workstation.
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-xl bg-white px-2 py-2">
            <p className="text-[9px] text-ink-soft">Predict</p>
            <p className="font-display text-sm font-bold text-ink">Unlimited</p>
          </div>
          <div className="rounded-xl bg-white px-2 py-2">
            <p className="text-[9px] text-ink-soft">Watchlist</p>
            <p className="font-display text-sm font-bold text-ink">500</p>
          </div>
          <div className="rounded-xl bg-white px-2 py-2">
            <p className="text-[9px] text-ink-soft">Desk</p>
            <p className="font-display text-sm font-bold text-ink">Workstation</p>
          </div>
        </div>
        <span className="ultra-profile-glow-move inline-flex rounded-full px-4 py-1.5 text-[11px] font-semibold">
          <span className="ultra-name-shine">Ultra</span>
        </span>
      </div>
    </MiniWindow>
  );
}

function CleanModeVisual() {
  return (
    <MiniWindow title="Settings · Dashboard layout">
      <div className="wn-density-stage bg-surface p-4">
        <div className="flex items-center justify-center gap-3">
          <span className="text-xs font-semibold text-ink">Clean</span>
          <span className="tvm-switch wn-density-switch" aria-hidden>
            <span className="tvm-switch-thumb" />
          </span>
          <span className="text-xs font-semibold text-ink">Normal</span>
        </div>
        <div className="relative mt-4 h-[9.5rem]">
          <div className="wn-density-pane wn-density-clean overflow-hidden rounded-2xl border border-ink/[0.08] bg-white p-3">
            <p className="font-display text-[11px] font-bold text-ink">Welcome, Alex</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="glass-violet rounded-xl p-2 text-white">
                <p className="text-[8px] text-white/80">Top pick</p>
                <p className="font-display text-xs font-bold">+2.4%</p>
              </div>
              <div className="glass-violet rounded-xl p-2 text-white">
                <p className="text-[8px] text-white/80">Your book</p>
                <p className="font-display text-xs font-bold">74</p>
              </div>
            </div>
            <div className="mt-2 space-y-1 rounded-xl bg-surface p-2">
              <div className="h-1.5 w-full rounded-full bg-ink/[0.08]" />
              <div className="h-1.5 w-4/5 rounded-full bg-ink/[0.08]" />
              <div className="h-1.5 w-3/5 rounded-full bg-ink/[0.08]" />
            </div>
          </div>
          <div className="wn-density-pane wn-density-normal overflow-hidden rounded-2xl border border-ink/[0.08] bg-white p-3">
            <div className="grid grid-cols-4 gap-1">
              {["Pick", "1,487", "86", "74"].map((value) => (
                <div key={value} className="glass-violet rounded-lg p-1.5 text-white">
                  <p className="font-display text-[10px] font-bold leading-none">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <div className="h-10 rounded-lg bg-surface" />
              <div className="space-y-1">
                <div className="h-2 rounded bg-surface" />
                <div className="h-2 rounded bg-surface" />
                <div className="h-2 rounded bg-surface" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <div className="h-8 rounded-lg bg-surface" />
              <div className="h-8 rounded-lg bg-surface" />
              <div className="h-8 rounded-lg bg-surface" />
            </div>
          </div>
        </div>
      </div>
    </MiniWindow>
  );
}

function SectorsVisual() {
  const dives = [
    {
      sector: "Technology",
      title: "Tech Sector Deep Dive",
      note: "Chip designers and cloud names lead the session tape.",
    },
    {
      sector: "Financial Services",
      title: "Financials Deep Dive",
      note: "Banks and payments follow the rate tape into the close.",
    },
    {
      sector: "Healthcare",
      title: "Healthcare Deep Dive",
      note: "Pharma and devices split as managed care holds.",
    },
    {
      sector: "Consumer Cyclical",
      title: "Consumer Deep Dive",
      note: "Retail and autos move with the discretionary names.",
    },
    {
      sector: "Industrials",
      title: "Industrials Deep Dive",
      note: "Aerospace and machinery catch the session’s cyclicals.",
    },
    {
      sector: "Energy",
      title: "Energy Deep Dive",
      note: "Oil, gas, and infrastructure versus this session.",
    },
  ];

  return (
    <MiniWindow title="Daily Brief · Sector deep dives">
      <div className="wn-sectors-stage bg-surface p-4">
        <div className="relative overflow-hidden rounded-2xl border border-ink/[0.08] bg-white p-3">
          <div className="relative h-[7.6rem]">
            {dives.map((dive, index) => (
              <div
                key={dive.sector}
                className={`wn-sectors-pane wn-sectors-p${index + 1}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-violet">
                      {dive.sector}
                    </p>
                    <p className="mt-0.5 font-display text-sm font-bold text-ink">
                      {dive.title}
                    </p>
                  </div>
                  <p className="shrink-0 text-[11px] font-semibold tabular-nums text-violet">
                    {index + 1} / 6
                  </p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                  {dive.note}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-ink-soft">
              <ProGlowText>Free · Pro · Ultra</ProGlowText>
            </p>
            <div className="flex items-center gap-1">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-surface text-ink-soft/50">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                  <path
                    d="M15 6 9 12l6 6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="wn-sectors-next grid h-7 w-7 place-items-center rounded-full bg-surface text-violet">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </MiniWindow>
  );
}

function CustomizeVisual() {
  return (
    <MiniWindow title="Let’s customize your experience">
      <div className="wn-customize-stage relative bg-surface p-4">
        <p className="relative h-4 text-[10px] font-semibold uppercase tracking-widest text-violet">
          <span className="wn-customize-step wn-customize-s1">Step 1 of 3</span>
          <span className="wn-customize-step wn-customize-s2">Step 2 of 3</span>
          <span className="wn-customize-step wn-customize-s3">Step 3 of 3</span>
        </p>
        <div className="relative mt-3 h-[8.6rem]">
          <div className="wn-customize-pane wn-customize-p1">
            <p className="font-display text-sm font-bold text-ink">Bogen mode</p>
            <p className="mt-1 text-[11px] text-ink-soft">Question marks next to each feature.</p>
            <div className="mt-3 flex gap-2">
              <span className="glass-violet rounded-full px-3 py-1 text-[11px] font-semibold text-white">
                On
              </span>
              <span className="rounded-full border border-ink/10 px-3 py-1 text-[11px] font-semibold text-ink-soft">
                Off
              </span>
            </div>
          </div>
          <div className="wn-customize-pane wn-customize-p2">
            <p className="font-display text-sm font-bold text-ink">Appearance</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#12192c] p-3 ring-1 ring-violet">
                <p className="text-[10px] font-semibold text-white">Dark</p>
              </div>
              <div className="rounded-xl bg-[#f4f6fb] p-3 ring-1 ring-ink/10">
                <p className="text-[10px] font-semibold text-ink">Light</p>
              </div>
            </div>
          </div>
          <div className="wn-customize-pane wn-customize-p3">
            <p className="font-display text-sm font-bold text-ink">Clean vs Normal</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-xs font-semibold text-ink">Clean</span>
              <span className="tvm-switch wn-density-switch" aria-hidden>
                <span className="tvm-switch-thumb" />
              </span>
              <span className="text-xs font-semibold text-ink">Normal</span>
            </div>
          </div>
        </div>
      </div>
    </MiniWindow>
  );
}

function AccuracyVisual() {
  return (
    <MiniWindow title="Predict">
      <div className="space-y-3 bg-surface p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-violet">
          Research read
        </p>
        <p className="font-display text-5xl font-bold text-ink">99%*</p>
        <p className="text-[11px] leading-relaxed text-ink-soft">
          Pulse, Portfolio Score, and Portfolio Addition.
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-xl bg-white px-2 py-2">
            <p className="text-[9px] text-ink-soft">Pulse</p>
            <p className="font-display text-sm font-bold text-ink">99%*</p>
          </div>
          <div className="rounded-xl bg-white px-2 py-2">
            <p className="text-[9px] text-ink-soft">Score</p>
            <p className="font-display text-sm font-bold text-ink">99%*</p>
          </div>
          <div className="rounded-xl bg-white px-2 py-2">
            <p className="text-[9px] text-ink-soft">Addition</p>
            <p className="font-display text-sm font-bold text-ink">99%*</p>
          </div>
        </div>
      </div>
    </MiniWindow>
  );
}

const VISUALS: Record<ReleaseFeatureVisualId, () => JSX.Element> = {
  bogen: BogenVisual,
  events: EventsVisual,
  "account-score": AccountScoreVisual,
  "portfolio-2": PortfolioTwoVisual,
  "clean-mode": CleanModeVisual,
  customize: CustomizeVisual,
  sectors: SectorsVisual,
  horizon: HorizonVisual,
  ultra: UltraWelcomeVisual,
  accuracy: AccuracyVisual,
};

export function ReleaseFeatureVisual({ id }: { id: ReleaseFeatureVisualId }) {
  const Visual = VISUALS[id];
  return (
    <LoopMotion>
      <Visual />
    </LoopMotion>
  );
}
