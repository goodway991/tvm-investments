import type { Metadata } from "next";
import { PortfolioGate } from "@/components/PortfolioGate";
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

  return <PortfolioGate stocks={stocks} defaultSymbol={defaultSymbol} />;
}
