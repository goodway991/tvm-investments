"use client";

import { useState } from "react";
import type { MarketMover } from "@/types";

interface FilterPanelProps {
  initialStocks: MarketMover[];
}

interface FilterState {
  peMin: string;
  peMax: string;
  betaMin: string;
  betaMax: string;
  volumeMin: string;
  epsMin: string;
  marketCapMin: string;
  marketCapMax: string;
}

const emptyFilters: FilterState = {
  peMin: "",
  peMax: "",
  betaMin: "",
  betaMax: "",
  volumeMin: "",
  epsMin: "",
  marketCapMin: "",
  marketCapMax: "",
};

export function FilterPanel({ initialStocks }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [results, setResults] = useState<
    Array<{
      symbol: string;
      name: string;
      price: number;
      changePercent: number;
      compositeScore: number;
      peRatio: number | null;
      beta: number | null;
      eps: number | null;
      marketCap: number | null;
      volume: number;
    }>
  >(
    initialStocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      changePercent: s.changePercent,
      compositeScore: s.compositeScore,
      peRatio: s.fundamentals.peRatio,
      beta: s.fundamentals.beta,
      eps: s.fundamentals.eps,
      marketCap: s.fundamentals.marketCap,
      volume: s.volume,
    }))
  );
  const [loading, setLoading] = useState(false);

  async function applyFilters() {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, v);
    }
    const res = await fetch(`/api/filter?${params}`);
    const data = await res.json();
    setResults(data.stocks ?? []);
    setLoading(false);
  }

  function reset() {
    setFilters(emptyFilters);
    setResults(
      initialStocks.map((s) => ({
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        changePercent: s.changePercent,
        compositeScore: s.compositeScore,
        peRatio: s.fundamentals.peRatio,
        beta: s.fundamentals.beta,
        eps: s.fundamentals.eps,
        marketCap: s.fundamentals.marketCap,
        volume: s.volume,
      }))
    );
  }

  const fields: Array<{ key: keyof FilterState; label: string; placeholder: string }> = [
    { key: "peMin", label: "P/E Min", placeholder: "e.g. 5" },
    { key: "peMax", label: "P/E Max", placeholder: "e.g. 40" },
    { key: "betaMin", label: "Beta Min", placeholder: "e.g. 0.5" },
    { key: "betaMax", label: "Beta Max", placeholder: "e.g. 2" },
    { key: "volumeMin", label: "Volume Min", placeholder: "e.g. 1000000" },
    { key: "epsMin", label: "EPS Min", placeholder: "e.g. 1" },
    { key: "marketCapMin", label: "Market Cap Min ($)", placeholder: "e.g. 10000000000" },
    { key: "marketCapMax", label: "Market Cap Max ($)", placeholder: "e.g. 500000000000" },
  ];

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-2xl text-white mb-1">Stock Filter</h2>
      <p className="text-slate-400 text-sm mb-6">
        Filter by P/E, Beta, Volume, EPS, and Market Cap.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {fields.map(({ key, label, placeholder }) => (
          <label key={key} className="block">
            <span className="text-xs text-slate-400">{label}</span>
            <input
              type="number"
              value={filters[key]}
              onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
              placeholder={placeholder}
              className="field mt-1 w-full rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none"
            />
          </label>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={applyFilters}
          disabled={loading}
          className="glass-violet rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
        >
          {loading ? "Filtering…" : "Apply Filters"}
        </button>
        <button
          onClick={reset}
          className="glass rounded-full px-5 py-2.5 text-sm text-ink-soft transition-colors hover:text-violet"
        >
          Reset
        </button>
      </div>

      <p className="text-sm text-slate-400 mb-4">{results.length} stocks match</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="pb-2 pr-4">Symbol</th>
              <th className="pb-2 pr-4 text-right">P/E</th>
              <th className="pb-2 pr-4 text-right">Beta</th>
              <th className="pb-2 pr-4 text-right">EPS</th>
              <th className="pb-2 pr-4 text-right">Volume</th>
              <th className="pb-2 pr-4 text-right">Mkt Cap</th>
              <th className="pb-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {results.map((s) => (
              <tr key={s.symbol} className="border-b border-white/5">
                <td className="py-2 pr-4 font-medium text-white">{s.symbol}</td>
                <td className="py-2 pr-4 text-right">{s.peRatio?.toFixed(1) ?? "—"}</td>
                <td className="py-2 pr-4 text-right">{s.beta?.toFixed(2) ?? "—"}</td>
                <td className="py-2 pr-4 text-right">{s.eps != null ? `$${s.eps.toFixed(2)}` : "—"}</td>
                <td className="py-2 pr-4 text-right">{(s.volume / 1e6).toFixed(1)}M</td>
                <td className="py-2 pr-4 text-right">
                  {s.marketCap ? `$${(s.marketCap / 1e9).toFixed(1)}B` : "—"}
                </td>
                <td className="py-2 text-right text-tvm-gold">{s.compositeScore.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
