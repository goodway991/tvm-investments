"use client";

import { ScrambleText } from "@/components/ScrambleText";

const stats = [
  {
    value: "12,000+",
    label: "names screened",
    durationMs: 2000,
    mode: "countUp" as const,
  },
  {
    value: "8",
    label: "signal framework",
    durationMs: 2000,
    mode: "countUp" as const,
  },
  {
    value: "Daily",
    label: "fresh picks",
    durationMs: 1000,
    mode: "scramble" as const,
  },
] as const;

export function LandingHeroStats() {
  return (
    <dl className="mt-10 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map(({ value, label, durationMs, mode }) => (
        <div key={label}>
          <dt className="font-display text-xl font-bold text-ink">
            <ScrambleText
              value={value}
              durationMs={durationMs}
              mode={mode}
              className="landing-stat-scramble inline-block tabular-nums"
            />
          </dt>
          <dd className="mt-0.5 text-xs text-ink-soft">{label}</dd>
        </div>
      ))}
    </dl>
  );
}
