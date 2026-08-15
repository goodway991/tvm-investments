"use client";

import { useState } from "react";
import type { StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { PortfolioPanel } from "@/components/AccountPanels";
import { InvestmentCalculator } from "@/components/InvestmentCalculator";
import { PortfolioConstructionMark, PortfolioLock } from "@/components/TestingSuiteLock";
import { BogenHeading } from "@/components/BogenProvider";

export function PortfolioGate({
  stocks,
  defaultSymbol,
}: {
  stocks: StockCandidate[];
  defaultSymbol: string;
}) {
  const { entitlement } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const isAdmin = entitlement.role === "admin";

  return (
    <div className="dashboard-research space-y-8">
      <div className="glass-strong max-w-xl rounded-[24px] p-6">
        <div className="flex items-start gap-4">
          <PortfolioConstructionMark />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">
              Under construction
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-ink">
              <BogenHeading id="portfolio">Portfolio</BogenHeading>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              A bigger Portfolio is in the works. The current tracker is hidden
              until that version is ready.
            </p>
          </div>
        </div>
        <div className="mt-5 max-w-xs">
          <PortfolioLock />
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setShowCurrent((open) => !open)}
            className="mt-5 text-sm font-semibold text-violet"
          >
            {showCurrent ? "Hide current tracker" : "Admin: view current tracker"}
          </button>
        ) : null}
      </div>
      {isAdmin && showCurrent ? (
        <>
          <PortfolioPanel stocks={stocks} />
          <InvestmentCalculator defaultSymbol={defaultSymbol} />
        </>
      ) : null}
    </div>
  );
}
