import type { Metadata } from "next";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { uniqueStocks } from "@/lib/chart-series";
import { POPULAR_WATCHLIST } from "@/lib/watchlist-symbols";
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
  const names = new Map<string, string>();
  snapshot.screenedStocks.forEach((stock) => names.set(stock.symbol, stock.name));
  [...snapshot.topMovers, ...snapshot.topPicks].forEach((stock) => {
    names.set(stock.symbol, stock.name);
  });

  const stocks = POPULAR_WATCHLIST.map((stock) => ({
    symbol: stock.symbol,
    name: names.get(stock.symbol) ?? stock.name,
  }));

  return (
    <div className="dashboard-research">
      <WatchlistPanel
        stocks={stocks}
        quoted={uniqueStocks([...snapshot.topMovers, ...snapshot.topPicks])}
        screened={snapshot.screenedStocks}
        reports={snapshot.reports}
        sessionDate={snapshot.date}
        externalQuery={q ?? ""}
      />
    </div>
  );
}
