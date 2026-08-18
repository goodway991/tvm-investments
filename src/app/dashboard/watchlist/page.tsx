import type { Metadata } from "next";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { uniqueStocks } from "@/lib/chart-series";
import { POPULAR_WATCHLIST } from "@/lib/watchlist-symbols";
import { getDashboardSnapshot } from "@/lib/snapshot";
import { slimCandidate } from "@/lib/snapshot-view";

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
  POPULAR_WATCHLIST.forEach((stock) => {
    if (!names.has(stock.symbol)) names.set(stock.symbol, stock.name);
  });

  const seen = new Set<string>();
  const stocks: Array<{ symbol: string; name: string }> = [];
  for (const stock of POPULAR_WATCHLIST) {
    if (seen.has(stock.symbol)) continue;
    seen.add(stock.symbol);
    stocks.push({ symbol: stock.symbol, name: names.get(stock.symbol) ?? stock.name });
  }
  for (const stock of snapshot.screenedStocks) {
    if (seen.has(stock.symbol)) continue;
    seen.add(stock.symbol);
    stocks.push({ symbol: stock.symbol, name: stock.name });
  }

  return (
    <div className="dashboard-research">
      <WatchlistPanel
        stocks={stocks}
        quoted={uniqueStocks([...snapshot.topMovers, ...snapshot.topPicks]).map(
          slimCandidate,
        )}
        screened={snapshot.screenedStocks}
        reports={snapshot.reports}
        sessionDate={snapshot.date}
        externalQuery={q ?? ""}
      />
    </div>
  );
}
