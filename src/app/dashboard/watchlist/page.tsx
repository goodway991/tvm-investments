import type { Metadata } from "next";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { YAHOO_SCAN_UNIVERSE } from "@/lib/watchlist-symbols";
import { getDashboardSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: "Watchlist — TVM Investments",
};

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archive?: string }>;
}) {
  const { q, archive } = await searchParams;
  const snapshot = await getDashboardSnapshot(archive);
  const stocks = new Map<string, { symbol: string; name: string }>();
  snapshot.screenedStocks.forEach((stock) => {
    stocks.set(stock.symbol, { symbol: stock.symbol, name: stock.name });
  });
  [...snapshot.topMovers, ...snapshot.topPicks].forEach((stock) => {
    stocks.set(stock.symbol, { symbol: stock.symbol, name: stock.name });
  });
  YAHOO_SCAN_UNIVERSE.forEach((symbol) => {
    if (!stocks.has(symbol)) stocks.set(symbol, { symbol, name: symbol });
  });

  return (
    <div className="dashboard-research">
      <WatchlistPanel stocks={Array.from(stocks.values())} externalQuery={q ?? ""} />
    </div>
  );
}
