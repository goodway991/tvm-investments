import type { JSX, ReactNode } from "react";
import { LoopMotion } from "@/components/LoopMotion";
import type { ReleaseFeatureVisualId } from "@/lib/release-notes";

function MiniWindow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-ink/[0.08] bg-white">
      <div className="flex items-center gap-2 border-b border-ink/[0.06] bg-surface px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-coral/80" />
        <span className="h-2 w-2 rounded-full bg-amber-400/90" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
        <span className="ml-1 text-[11px] font-semibold text-ink-soft">{title}</span>
      </div>
      {children}
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
            Question marks next to each feature.
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
                The note points to stronger AI server demand, so the brief expands past the teaser —
                source, date, and the tickers that moved with it.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-semibold text-violet">
                  Reuters
                </span>
                <span className="text-[10px] font-medium text-ink-soft">Aug 14, 2026</span>
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

const VISUALS: Record<ReleaseFeatureVisualId, () => JSX.Element> = {
  bogen: BogenVisual,
  events: EventsVisual,
};

export function ReleaseFeatureVisual({ id }: { id: ReleaseFeatureVisualId }) {
  const Visual = VISUALS[id];
  return (
    <LoopMotion>
      <Visual />
    </LoopMotion>
  );
}
