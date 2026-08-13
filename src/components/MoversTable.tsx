"use client";

import type { MarketMover } from "@/types";
import { PaywallLock } from "@/components/PaywallLock";
import { useAuth } from "@/components/AuthProvider";
import { FREE_MOVER_LIMIT, PRO_MOVER_LIMIT } from "@/lib/plans";

interface MoversTableProps {
  movers: MarketMover[];
}

export function MoversTable({ movers }: MoversTableProps) {
  const { entitlement } = useAuth();
  const isPro = entitlement.plan === "pro";
  const limit = isPro ? PRO_MOVER_LIMIT : FREE_MOVER_LIMIT;
  const visible = movers.slice(0, limit);
  const locked = isPro ? [] : movers.slice(FREE_MOVER_LIMIT, PRO_MOVER_LIMIT);

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-2xl text-ink mb-1">
        Top {isPro ? Math.min(movers.length, PRO_MOVER_LIMIT) : FREE_MOVER_LIMIT} Price Movers
      </h2>
      <p className="text-ink-soft text-sm mb-6">
        Largest daily moves by percentage across the scanned S&amp;P 500 and Dow names.
        {isPro ? " Pro shows the top 20." : " Free shows the top 10."}
      </p>
      <MoverRows movers={visible} start={1} />
      {locked.length > 0 && (
        <div className="mt-3">
          <PaywallLock locked cta="Upgrade to Pro for top 20">
            <MoverRows movers={locked} start={FREE_MOVER_LIMIT + 1} />
          </PaywallLock>
        </div>
      )}
    </div>
  );
}

function MoverRows({ movers, start }: { movers: MarketMover[]; start: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-soft border-b border-ink/[0.08]">
            <th className="pb-3 pr-4">#</th>
            <th className="pb-3 pr-4">Symbol</th>
            <th className="pb-3 pr-4">Company</th>
            <th className="pb-3 pr-4">Index</th>
            <th className="pb-3 pr-4">Sector</th>
            <th className="pb-3 pr-4 text-right">Price</th>
            <th className="pb-3 pr-4 text-right">Change</th>
            <th className="pb-3 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {movers.map((m, i) => (
            <tr key={m.symbol} className="border-b border-ink/[0.05] hover:bg-white/50">
              <td className="py-3 pr-4 text-ink-soft">{start + i}</td>
              <td className="py-3 pr-4 font-semibold text-ink">{m.symbol}</td>
              <td className="py-3 pr-4 text-ink-soft">{m.name}</td>
              <td className="py-3 pr-4">
                <div className="flex flex-wrap gap-1">
                  {m.indexMembership?.includes("sp500") && (
                    <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-semibold text-violet">
                      S&amp;P
                    </span>
                  )}
                  {m.indexMembership?.includes("dow30") && (
                    <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                      Dow
                    </span>
                  )}
                  {!m.indexMembership?.length && (
                    <span className="text-xs text-ink-soft/60">—</span>
                  )}
                </div>
              </td>
              <td className="py-3 pr-4 text-ink-soft">{m.sector}</td>
              <td className="py-3 pr-4 text-right text-ink">${m.price.toFixed(2)}</td>
              <td
                className={`py-3 pr-4 text-right font-medium ${
                  m.changePercent >= 0 ? "text-gain" : "text-loss"
                }`}
              >
                {m.changePercent >= 0 ? "+" : ""}
                {m.changePercent.toFixed(2)}%
              </td>
              <td className="py-3 text-right">
                <span className="inline-flex rounded-full bg-violet/10 px-2 py-0.5 text-violet">
                  {m.compositeScore.toFixed(0)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
