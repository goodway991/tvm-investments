import type { Metadata } from "next";
import { DailyBrief } from "@/components/DailyBrief";
import { showTvm10Labs } from "@/lib/beta-labs";
import { getDashboardSnapshot } from "@/lib/snapshot";
import { briefView } from "@/lib/snapshot-view";
import {
  fetchMorningBrewMarketEvents,
  mergeNewsSources,
} from "@/lib/providers/morning-brew";
import type { MarketEvent } from "@/types";

export const metadata: Metadata = {
  title: "Daily Brief — TVM Investments",
};

async function brewHeadlines(): Promise<MarketEvent[]> {
  try {
    return await fetchMorningBrewMarketEvents(6);
  } catch {
    return [];
  }
}

function emptyHeadlines(ms: number): Promise<MarketEvent[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([]), ms);
  });
}

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  if (archive || !showTvm10Labs()) {
    const snapshot = await getDashboardSnapshot(archive);
    return <DailyBrief snapshot={briefView(snapshot)} />;
  }

  const [snapshot, brewEvents] = await Promise.all([
    getDashboardSnapshot(),
    Promise.race([brewHeadlines(), emptyHeadlines(2000)]),
  ]);

  return (
    <DailyBrief
      snapshot={briefView({
        ...snapshot,
        marketEvents: brewEvents.length
          ? mergeNewsSources(brewEvents, snapshot.marketEvents, 6)
          : snapshot.marketEvents,
      })}
    />
  );
}
