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

const VISUALS: Record<ReleaseFeatureVisualId, () => JSX.Element> = {
  bogen: BogenVisual,
};

export function ReleaseFeatureVisual({ id }: { id: ReleaseFeatureVisualId }) {
  const Visual = VISUALS[id];
  return <Visual />;
}
