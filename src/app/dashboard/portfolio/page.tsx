import type { Metadata } from "next";
import { PortfolioPanel } from "@/components/AccountPanels";
import { InvestmentCalculator } from "@/components/InvestmentCalculator";
import { uniqueStocks } from "@/lib/chart-series";
import { getDashboardSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: "Portfolio — TVM Investments",
};

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  const snapshot = await getDashboardSnapshot(archive);
  const stocks = uniqueStocks([...snapshot.topMovers, ...snapshot.topPicks]);
  const defaultSymbol = snapshot.topPicks[0]?.symbol ?? stocks[0]?.symbol ?? "AAPL";

  return (
    <div className="dashboard-research space-y-8">
      <PortfolioPanel stocks={stocks} />
      <InvestmentCalculator defaultSymbol={defaultSymbol} />
    </div>
  );
}
