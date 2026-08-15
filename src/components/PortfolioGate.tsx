"use client";

import type { ScreenedStock, StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { PortfolioWorkbench } from "@/components/PortfolioWorkbench";
import {
  PortfolioConstructionMark,
  PortfolioLock,
} from "@/components/TestingSuiteLock";
import { canUsePreviewFeature } from "@/lib/plans";
import { showBeta3Labs } from "@/lib/beta-labs";
import { BogenHeading } from "@/components/BogenProvider";

export function PortfolioGate({
  stocks,
  screened = [],
}: {
  stocks: StockCandidate[];
  screened?: ScreenedStock[];
}) {
  const { entitlement } = useAuth();
  if (showBeta3Labs() || canUsePreviewFeature(entitlement.role, "portfolio")) {
    return (
      <div className="dashboard-research">
        <PortfolioWorkbench stocks={stocks} screened={screened} />
      </div>
    );
  }

  return (
    <div className="dashboard-research">
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
      </div>
    </div>
  );
}
