"use client";

import { useEffect, useState } from "react";
import type { BacktestSummary } from "@/types";

export function BacktestTrackRecord() {
  const [summary, setSummary] = useState<BacktestSummary | null>(null);

  useEffect(() => {
    fetch("/api/backtest")
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => null);
  }, []);

  if (!summary) return null;

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-2xl text-white mb-1">Backtest Track Record</h2>
      <p className="text-slate-400 text-sm mb-6">
        Forward returns logged for each day&apos;s top flagged picks vs S&amp;P 500 benchmark.
        {summary.entries.length === 0 && " Showing illustrative demo metrics until Firebase logs accumulate."}
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="1-Day Avg Return"
          pick={summary.avgReturn1d}
          sp={summary.spAvgReturn1d}
        />
        <MetricCard
          label="1-Week Avg Return"
          pick={summary.avgReturn1w}
          sp={summary.spAvgReturn1w}
        />
        <MetricCard
          label="1-Month Avg Return"
          pick={summary.avgReturn1m}
          sp={summary.spAvgReturn1m}
        />
      </div>

      <p className="text-xs text-slate-500">
        Tracked over {summary.totalDays} trading days. Past performance does not guarantee future results.
      </p>
    </div>
  );
}

function MetricCard({
  label,
  pick,
  sp,
}: {
  label: string;
  pick: number;
  sp: number;
}) {
  const alpha = pick - sp;
  return (
    <div className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${pick >= 0 ? "text-gain" : "text-loss"}`}>
        {pick >= 0 ? "+" : ""}
        {pick.toFixed(2)}%
      </p>
      <p className="text-xs text-slate-500 mt-1">
        S&amp;P: {sp >= 0 ? "+" : ""}
        {sp.toFixed(2)}% · Alpha: {alpha >= 0 ? "+" : ""}
        {alpha.toFixed(2)}%
      </p>
    </div>
  );
}
