"use client";

import type { MarketMover } from "@/types";
import { PaywallLock } from "@/components/PaywallLock";
import { useAuth } from "@/components/AuthProvider";
import { sessionMove } from "@/lib/chart-series";
import { FREE_MOVER_LIMIT, PRO_MOVER_LIMIT, planHasPro } from "@/lib/plans";
import { BogenHeading } from "@/components/BogenProvider";
import { ProGlowText } from "@/components/ProGlowText";

interface MoversTableProps {
  movers: MarketMover[];
}

export function MoveMark({ up }: { up: boolean }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
        up ? "bg-emerald-400/20 text-emerald-600" : "bg-coral/20 text-coral"
      }`}
      aria-label={up ? "Up from previous close" : "Down from previous close"}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
        {up ? (
          <path
            d="M10 15.5V5M10 5 5.8 9.2M10 5l4.2 4.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M10 4.5V15M10 15l-4.2-4.2M10 15l4.2-4.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}

function bySessionMove<T extends { price: number; change: number; ohlcv?: Array<{ close: number }> }>(
  left: T,
  right: T,
) {
  const a = sessionMove(left);
  const b = sessionMove(right);
  const aPct = a.previous ? Math.abs(a.current - a.previous) / a.previous : 0;
  const bPct = b.previous ? Math.abs(b.current - b.previous) / b.previous : 0;
  return bPct - aPct;
}

export function MoversTable({ movers }: MoversTableProps) {
  const { entitlement } = useAuth();
  const isPro = planHasPro(entitlement.plan);
  const ranked = [...movers].sort(bySessionMove);
  const limit = isPro ? PRO_MOVER_LIMIT : FREE_MOVER_LIMIT;
  const visible = ranked.slice(0, limit);
  const locked = isPro ? [] : ranked.slice(FREE_MOVER_LIMIT, PRO_MOVER_LIMIT);

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-2xl text-ink mb-1">
        <BogenHeading id="movers">
          Top {isPro ? Math.min(ranked.length, PRO_MOVER_LIMIT) : FREE_MOVER_LIMIT} Price Movers
        </BogenHeading>
      </h2>
      <p className="text-ink-soft text-sm mb-6">
        Largest moves versus the previous close across the daily scan of about
        2,800 US stocks and ETFs.
        {isPro ? (
          <>
            {" "}
            <ProGlowText>Pro shows the top 20.</ProGlowText>
          </>
        ) : (
          " Free shows the top 10."
        )}
      </p>
      <MoverRows movers={visible} />
      {locked.length > 0 && (
        <div className="mt-3">
          <PaywallLock locked cta="Upgrade to Pro for top 20">
            <MoverRows movers={locked} />
          </PaywallLock>
        </div>
      )}
    </div>
  );
}

function MoverRows({ movers }: { movers: MarketMover[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-soft border-b border-ink/[0.08]">
            <th className="pb-3 pr-4"> </th>
            <th className="pb-3 pr-4">Symbol</th>
            <th className="pb-3 pr-4">Company</th>
            <th className="pb-3 pr-4">Index</th>
            <th className="pb-3 pr-4">Sector</th>
            <th className="pb-3 pr-4 text-right">Prev close</th>
            <th className="pb-3 pr-4 text-right">Current</th>
            <th className="pb-3 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {movers.map((m) => {
            const move = sessionMove(m);
            return (
              <tr key={m.symbol} className="border-b border-ink/[0.05] hover:bg-white/50">
                <td className="py-3 pr-4">
                  <MoveMark up={move.up} />
                </td>
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
                <td className="py-3 pr-4 text-right text-ink-soft">
                  ${move.previous.toFixed(2)}
                </td>
                <td
                  className={`py-3 pr-4 text-right font-medium ${
                    move.up ? "text-emerald-600" : "text-coral"
                  }`}
                >
                  ${move.current.toFixed(2)}
                </td>
                <td className="py-3 text-right">
                  <span className="inline-flex rounded-full bg-violet/10 px-2 py-0.5 text-violet">
                    {m.compositeScore.toFixed(0)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
