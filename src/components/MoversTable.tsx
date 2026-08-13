import type { MarketMover } from "@/types";

interface MoversTableProps {
  movers: MarketMover[];
}

export function MoversTable({ movers }: MoversTableProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-2xl text-white mb-1">Top 10 Price Movers</h2>
      <p className="text-slate-400 text-sm mb-6">
        Largest daily moves by percentage — flagged for research, not recommendations.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="pb-3 pr-4">#</th>
              <th className="pb-3 pr-4">Symbol</th>
              <th className="pb-3 pr-4">Company</th>
              <th className="pb-3 pr-4">Sector</th>
              <th className="pb-3 pr-4 text-right">Price</th>
              <th className="pb-3 pr-4 text-right">Change</th>
              <th className="pb-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {movers.map((m, i) => (
              <tr key={m.symbol} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 pr-4 text-slate-500">{i + 1}</td>
                <td className="py-3 pr-4 font-semibold text-white">{m.symbol}</td>
                <td className="py-3 pr-4 text-slate-300">{m.name}</td>
                <td className="py-3 pr-4 text-slate-400">{m.sector}</td>
                <td className="py-3 pr-4 text-right">${m.price.toFixed(2)}</td>
                <td
                  className={`py-3 pr-4 text-right font-medium ${
                    m.changePercent >= 0 ? "text-gain" : "text-loss"
                  }`}
                >
                  {m.changePercent >= 0 ? "+" : ""}
                  {m.changePercent.toFixed(2)}%
                </td>
                <td className="py-3 text-right">
                  <span className="inline-flex rounded-full bg-tvm-accent/20 px-2 py-0.5 text-tvm-accent">
                    {m.compositeScore.toFixed(0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
