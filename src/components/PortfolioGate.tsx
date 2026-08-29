"use client";

import type { ScreenedStock, StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { PortfolioWorkbench } from "@/components/PortfolioWorkbench";
import { PaidDeskUpgrade } from "@/components/PaidDeskUpgrade";
import { planHasPro } from "@/lib/plans";

export function PortfolioGate({
  stocks,
  screened = [],
}: {
  stocks: StockCandidate[];
  screened?: ScreenedStock[];
}) {
  const { entitlement } = useAuth();
  if (!planHasPro(entitlement.plan)) {
    return <PaidDeskUpgrade title="Portfolio" bogenId="portfolio" />;
  }

  return (
    <div className="dashboard-research">
      <PortfolioWorkbench stocks={stocks} screened={screened} />
    </div>
  );
}
