"use client";

import { useState } from "react";
import { BogenHeading } from "@/components/BogenProvider";

interface CalculatorResult {
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  currency: string;
  amountUsd: number;
  shares: number;
  scenarios: Record<
    string,
    { percent: number; price: number; value: number; profitLoss: number }
  >;
}

interface InvestmentCalculatorProps {
  defaultSymbol: string;
}

export function InvestmentCalculator({ defaultSymbol }: InvestmentCalculatorProps) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [amount, setAmount] = useState("1000");
  const [customPct, setCustomPct] = useState("");
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function calculate(extraPct?: number) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        symbol,
        amount,
      });
      const res = await fetch(`/api/calculator?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (extraPct != null && !Number.isNaN(extraPct)) {
        const shares = data.shares as number;
        const price = data.currentPrice * (1 + extraPct / 100);
        const value = shares * price;
        data.scenarios[String(extraPct)] = {
          percent: extraPct,
          price: +price.toFixed(2),
          value: +value.toFixed(2),
          profitLoss: +(value - parseFloat(amount)).toFixed(2),
        };
      }

      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed");
    }
    setLoading(false);
  }

  function addCustomScenario() {
    const pct = parseFloat(customPct);
    if (Number.isFinite(pct)) calculate(pct);
  }

  const presetPcts = [-10, -5, 5, 10];

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-2xl text-ink mb-1">
        <BogenHeading id="calculator">Hypothetical scenario calculator</BogenHeading>
      </h2>
      <p className="text-ink-soft text-sm mb-6">
        Scenario math on a live quote when one is available.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <label className="block">
          <span className="text-xs text-ink-soft">Stock Symbol</span>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="field mt-1 w-full rounded-xl px-3 py-2 text-ink focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-soft">Investment (USD)</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field mt-1 w-full rounded-xl px-3 py-2 text-ink focus:outline-none"
          />
        </label>
        <div className="flex items-end">
          <button
            onClick={() => calculate()}
            disabled={loading}
            className="glass-violet w-full rounded-full px-4 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? "Fetching…" : "Calculate"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {presetPcts.map((pct) => (
          <button
            key={pct}
            onClick={() => calculate(pct)}
            className="glass rounded-full px-3 py-1 text-xs text-ink-soft transition-colors hover:text-violet"
          >
            {pct > 0 ? "+" : ""}
            {pct}%
          </button>
        ))}
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={customPct}
            onChange={(e) => setCustomPct(e.target.value)}
            placeholder="Custom %"
            className="field w-24 rounded-lg px-2 py-1 text-xs text-ink"
          />
          <button
            onClick={addCustomScenario}
            className="rounded-full border border-violet/30 px-3 py-1 text-xs text-violet transition-colors hover:bg-violet/10"
          >
            Add scenario
          </button>
        </div>
      </div>

      {error && <p className="text-loss text-sm mb-4">{error}</p>}

      {result && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="bg-white/[0.03] px-4 py-3 flex flex-wrap gap-4 text-sm">
            <span>
              <strong className="text-ink">{result.symbol}</strong> @ ${result.currentPrice.toFixed(2)}
            </span>
            <span className={result.changePercent >= 0 ? "text-gain" : "text-loss"}>
              {result.changePercent >= 0 ? "+" : ""}
              {result.changePercent.toFixed(2)}% today
            </span>
            <span className="text-ink-soft">
              {result.shares.toFixed(4)} shares for ${result.amountUsd.toFixed(2)}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft border-b border-white/10">
                <th className="px-4 py-3">Scenario</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Portfolio Value</th>
                <th className="px-4 py-3 text-right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(result.scenarios)
                .sort((a, b) => a.percent - b.percent)
                .map((s) => (
                  <tr key={s.percent} className="border-b border-white/5">
                    <td className="px-4 py-3 text-ink">
                      {s.percent > 0 ? "+" : ""}
                      {s.percent}%
                    </td>
                    <td className="px-4 py-3 text-right">${s.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${s.value.toFixed(2)}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        s.profitLoss >= 0 ? "text-gain" : "text-loss"
                      }`}
                    >
                      {s.profitLoss >= 0 ? "+" : ""}${s.profitLoss.toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
