import type { JSX } from "react";
import type { ReleaseFeatureVisualId } from "@/lib/release-notes";

function BogenVisual() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-ink/[0.08] bg-white">
      <div className="flex items-center gap-2 border-b border-ink/[0.06] bg-surface px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-coral/80" />
        <span className="h-2 w-2 rounded-full bg-amber-400/90" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
        <span className="ml-1 text-[11px] font-semibold text-ink-soft">
          Settings · Bogen mode
        </span>
      </div>
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
    </div>
  );
}

function EventsVisual() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-ink/[0.08] bg-white">
      <div className="flex items-center gap-2 border-b border-ink/[0.06] bg-surface px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-coral/80" />
        <span className="h-2 w-2 rounded-full bg-amber-400/90" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
        <span className="ml-1 text-[11px] font-semibold text-ink-soft">
          Daily Brief · Market-moving events
        </span>
      </div>
      <div className="grid gap-3 p-4">
        <article className="rounded-[22px] border border-ink/[0.08] bg-surface p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-soft">🇺🇸 US</span>
              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[11px] text-gain">
                bullish
              </span>
            </div>
            <span className="text-[11px] font-semibold text-violet">More</span>
          </div>
          <h3 className="text-sm font-medium text-ink">
            CPI cools, growth names catch a bid
          </h3>
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
            Consumer prices rose less than expected. Bond yields dipped on the print.
          </p>
          <p className="mt-2 text-[11px] font-medium text-violet">Tap for more detail</p>
        </article>
        <article className="rounded-[22px] border border-violet/25 bg-surface p-4 shadow-[0_12px_24px_-18px_rgba(30,70,160,0.45)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-soft">🌍 Global</span>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700">
                mixed
              </span>
            </div>
            <span className="text-[11px] font-semibold text-violet">Close</span>
          </div>
          <h3 className="text-sm font-medium text-ink">
            Fed holds rates, data-dependent path
          </h3>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
            Policy stays on hold while inflation progress remains uneven. Equities
            traded choppy as investors parsed the statement.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet">
              Reuters
            </span>
            <span className="text-[11px] font-medium text-ink-soft">2026-08-14</span>
            <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet">
              SPY
            </span>
            <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet">
              QQQ
            </span>
          </div>
        </article>
      </div>
    </div>
  );
}

function UiVisual() {
  return (
    <div className="rounded-[22px] border border-ink/[0.08] bg-surface p-6">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-violet">
        UI design
      </p>
      <p className="mt-1 text-xs text-ink-soft">Moving Pro borders</p>
      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="pro-border-shine glass-violet relative w-full max-w-[220px] rounded-2xl px-4 py-3 text-white">
          <p className="text-sm font-semibold leading-tight">Pro account</p>
          <p className="text-[11px] font-medium leading-tight text-white/80">
            Unlocked
          </p>
        </div>
        <span className="pro-border-shine glass-violet relative rounded-full px-4 py-2 text-sm font-semibold text-white">
          Pro
        </span>
      </div>
    </div>
  );
}

const VISUALS: Record<ReleaseFeatureVisualId, () => JSX.Element> = {
  bogen: BogenVisual,
  events: EventsVisual,
  ui: UiVisual,
};

export function ReleaseFeatureVisual({ id }: { id: ReleaseFeatureVisualId }) {
  const Visual = VISUALS[id];
  return <Visual />;
}
