"use client";

import { useState } from "react";
import type { ScreenedStock } from "@/types";

interface FilterPanelProps {
  initialStocks: ScreenedStock[];
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

function toRow(stock: ScreenedStock) {
  return {
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price,
    changePercent: stock.changePercent,
    compositeScore: stock.compositeScore,
    shortTermScore: stock.shortTermScore,
    longTermScore: stock.longTermScore,
    peRatio: stock.fundamentals.peRatio,
    beta: stock.fundamentals.beta,
    eps: stock.fundamentals.eps,
    marketCap: stock.fundamentals.marketCap,
    volume: stock.volume,
  };
}

export function FilterPanel({ initialStocks }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [results, setResults] = useState(initialStocks.map(toRow));
  const [find, setFind] = useState("");
  const [loading, setLoading] = useState(false);
  const visible = results.filter((stock) => {
    const needle = find.trim().toLowerCase();
    if (!needle) return true;
    return (
      stock.symbol.toLowerCase().includes(needle) ||
      stock.name.toLowerCase().includes(needle)
    );
  });

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
    setResults(initialStocks.map(toRow));
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
      <h2 className="font-display text-2xl text-ink mb-1">Stock Filter</h2>
      <p className="text-ink-soft text-sm mb-6">
        Filter today&apos;s scored scan of about 1,500 liquid US names by P/E,
        Beta, Volume, EPS, and Market Cap.
      </p>

      <label className="mb-5 block">
        <span className="sr-only">Find a ticker in today&apos;s scan</span>
        <input
          value={find}
          onChange={(event) => setFind(event.target.value)}
          placeholder="Find a ticker in today’s 1,500-name scan…"
          className="field w-full rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50"
        />
      </label>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {fields.map(({ key, label, placeholder }) => (
          <label key={key} className="block">
            <span className="text-xs text-ink-soft">{label}</span>
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

      <p className="text-sm text-ink-soft mb-4">{visible.length} stocks match</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-soft border-b border-ink/[0.08]">
              <th className="pb-2 pr-4">Symbol</th>
              <th className="pb-2 pr-4 text-right">P/E</th>
              <th className="pb-2 pr-4 text-right">Beta</th>
              <th className="pb-2 pr-4 text-right">EPS</th>
              <th className="pb-2 pr-4 text-right">Volume</th>
              <th className="pb-2 pr-4 text-right">Mkt Cap</th>
              <th className="pb-2 pr-4 text-right">ST</th>
              <th className="pb-2 pr-4 text-right">LT</th>
              <th className="pb-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.symbol} className="border-b border-ink/[0.05]">
                <td className="py-2 pr-4 font-medium text-ink">{s.symbol}</td>
                <td className="py-2 pr-4 text-right">{s.peRatio?.toFixed(1) ?? "—"}</td>
                <td className="py-2 pr-4 text-right">{s.beta?.toFixed(2) ?? "—"}</td>
                <td className="py-2 pr-4 text-right">{s.eps != null ? `$${s.eps.toFixed(2)}` : "—"}</td>
                <td className="py-2 pr-4 text-right">{(s.volume / 1e6).toFixed(1)}M</td>
                <td className="py-2 pr-4 text-right">
                  {s.marketCap ? `$${(s.marketCap / 1e9).toFixed(1)}B` : "—"}
                </td>
                <td className="py-2 pr-4 text-right text-ink-soft">
                  {s.shortTermScore?.toFixed(0) ?? "—"}
                </td>
                <td className="py-2 pr-4 text-right text-ink-soft">
                  {s.longTermScore?.toFixed(0) ?? "—"}
                </td>
                <td className="py-2 text-right text-violet">{s.compositeScore.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
