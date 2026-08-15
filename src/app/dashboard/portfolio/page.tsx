import type { Metadata } from "next";
import { PortfolioWorkbench } from "@/components/PortfolioWorkbench";
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

  return (
    <div className="dashboard-research">
      <PortfolioWorkbench stocks={stocks} screened={snapshot.screenedStocks} />
    </div>
  );
}
