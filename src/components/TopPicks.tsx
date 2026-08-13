"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { CompanyReport, StockCandidate } from "@/types";

interface TopPicksProps {
  picks: StockCandidate[];
  reports: CompanyReport[];
}

export function TopPicks({ picks, reports }: TopPicksProps) {
  return (
    <div>
      <h2 className="font-display text-2xl text-white mb-1">
        Today&apos;s Top 3 Flagged Picks
      </h2>
      <p className="text-slate-400 text-sm mb-8">
        Ranked by composite score across all 8 strategies. Short-term vs long-term outlook included.
      </p>

      <div className="space-y-10">
        {picks.map((pick, idx) => {
          const report = reports.find((r) => r.symbol === pick.symbol);
          const chartData = pick.ohlcv.slice(-30).map((b) => ({
            date: b.date.slice(5),
            close: b.close,
          }));

          return (
            <article key={pick.symbol} className="glass rounded-2xl p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                <div>
                  <span className="text-tvm-gold text-sm font-medium">Pick #{idx + 1}</span>
                  <h3 className="font-display text-2xl text-white mt-1">
                    {pick.name}{" "}
                    <span className="text-slate-400 text-lg">({pick.symbol})</span>
                  </h3>
                  <p className="text-slate-400 mt-1">{pick.industry} · {pick.sector}</p>
                </div>
                <div className="flex gap-4">
                  <Stat label="Score" value={`${pick.compositeScore.toFixed(0)}/100`} highlight />
                  <Stat
                    label="Today"
                    value={`${pick.changePercent >= 0 ? "+" : ""}${pick.changePercent.toFixed(2)}%`}
                    positive={pick.changePercent >= 0}
                  />
                  <Stat label="Price" value={`$${pick.price.toFixed(2)}`} />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e4f2" />
                      <XAxis dataKey="date" tick={{ fill: "#7b7696", fontSize: 11 }} />
                      <YAxis domain={["auto", "auto"]} tick={{ fill: "#7b7696", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          color: "#1a1442",
                          background: "#ffffff",
                          border: "1px solid rgba(120,108,200,.18)",
                          borderRadius: 8,
                          boxShadow: "0 14px 34px -20px rgba(52,41,120,.3)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="close"
                        stroke="#5b3df5"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4 text-sm">
                  <SignalGrid signals={pick.signals.filter((s) => s.triggered || s.score > 50)} />
                </div>
              </div>

              {report && (
                <div className="mt-8 pt-8 border-t border-white/10 prose-tvm text-sm">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="text-tvm-gold font-medium mb-2">Short-term</h4>
                      <p className="text-slate-300">{report.shortTermOutlook}</p>
                    </div>
                    <div>
                      <h4 className="text-tvm-gold font-medium mb-2">Long-term</h4>
                      <p className="text-slate-300">{report.longTermOutlook}</p>
                    </div>
                  </div>

                  <h4 className="text-white font-medium mb-2">Research Report</h4>
                  <div
                    className="text-slate-300 space-y-3"
                    dangerouslySetInnerHTML={{
                      __html: report.fullReport
                        .replace(/^## /gm, "<h3>")
                        .replace(/^### /gm, "<h4>")
                        .replace(/\n/g, "<br/>")
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                    }}
                  />

                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <h4 className="text-gain font-medium mb-2">Upside drivers</h4>
                      <ul className="list-disc pl-5 text-slate-400 space-y-1">
                        {report.upsideDrivers.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-loss font-medium mb-2">Downside risks</h4>
                      <ul className="list-disc pl-5 text-slate-400 space-y-1">
                        {report.downsideRisks.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="mt-6 text-slate-400 italic">{report.cultureAndLongTerm}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-lg font-semibold ${
          highlight
            ? "text-tvm-gold"
            : positive === true
              ? "text-gain"
              : positive === false
                ? "text-loss"
                : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SignalGrid({
  signals,
}: {
  signals: StockCandidate["signals"];
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-white font-medium mb-3">Active Signals</h4>
      {signals.slice(0, 6).map((s) => (
        <div
          key={s.strategyId}
          className="flex items-start justify-between gap-2 rounded-xl bg-[#f7f8fc] p-3"
        >
          <div>
            <p className="text-white text-xs font-medium">{s.strategyName}</p>
            <p className="text-slate-500 text-xs mt-1">{s.detail}</p>
            {s.unavailable && (
              <p className="text-amber-400/70 text-xs mt-1">Limited free-tier data</p>
            )}
          </div>
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded ${
              s.triggered ? "bg-green-500/20 text-gain" : "bg-violet/10 text-ink-soft"
            }`}
          >
            {s.score.toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
}
