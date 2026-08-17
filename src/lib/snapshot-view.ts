import type {
  DailySnapshot,
  MarketMover,
  OHLCVBar,
  StockCandidate,
} from "@/types";

const DAILY_BARS = 32;
const YEAR_BARS = 12;
const HEADLINES = 4;

function monthEndCloses(ohlcv: OHLCVBar[]): OHLCVBar[] {
  const byMonth = new Map<string, OHLCVBar>();
  for (const bar of ohlcv) {
    byMonth.set(bar.date.slice(0, 7), bar);
  }
  return [...byMonth.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-YEAR_BARS)
    .map(([, bar]) => bar);
}

export function slimCandidate<T extends StockCandidate>(stock: T): T {
  const yearCloses =
    stock.yearCloses && stock.yearCloses.length >= 2
      ? stock.yearCloses.slice(-YEAR_BARS)
      : monthEndCloses(stock.ohlcv);
  return {
    ...stock,
    ohlcv: stock.ohlcv.slice(-DAILY_BARS),
    yearCloses: yearCloses.length ? yearCloses : undefined,
    headlines: stock.headlines.slice(0, HEADLINES),
    businessSummary: undefined,
  };
}

function slimMovers(movers: MarketMover[]): MarketMover[] {
  return movers.map(slimCandidate);
}

export function slimSnapshot(snapshot: DailySnapshot): DailySnapshot {
  return {
    ...snapshot,
    topMovers: slimMovers(snapshot.topMovers),
    topPicks: snapshot.topPicks.map(slimCandidate),
    shortTermPicks: snapshot.shortTermPicks.map(slimCandidate),
    longTermPicks: snapshot.longTermPicks.map(slimCandidate),
  };
}

function deskShell(snapshot: DailySnapshot): DailySnapshot {
  return {
    ...snapshot,
    screenedStocks: [],
    topMovers: [],
    topPicks: [],
    shortTermPicks: [],
    longTermPicks: [],
    reports: [],
    shortTermReports: [],
    longTermReports: [],
    marketEvents: [],
    sectorDives: [],
    techSectorAnalysis: "",
  };
}

export function dashboardView(snapshot: DailySnapshot): DailySnapshot {
  return {
    ...deskShell(snapshot),
    topMovers: snapshot.topMovers,
    topPicks: snapshot.topPicks,
    shortTermPicks: snapshot.shortTermPicks,
    longTermPicks: snapshot.longTermPicks,
    reports: snapshot.reports,
  };
}

export function briefView(snapshot: DailySnapshot): DailySnapshot {
  return {
    ...deskShell(snapshot),
    marketEvents: snapshot.marketEvents,
    sectorDives: snapshot.sectorDives,
    techSectorAnalysis: snapshot.techSectorAnalysis,
  };
}

export function reportsView(snapshot: DailySnapshot): DailySnapshot {
  return {
    ...deskShell(snapshot),
    topPicks: snapshot.topPicks,
    shortTermPicks: snapshot.shortTermPicks,
    longTermPicks: snapshot.longTermPicks,
    reports: snapshot.reports,
    shortTermReports: snapshot.shortTermReports,
    longTermReports: snapshot.longTermReports,
  };
}
