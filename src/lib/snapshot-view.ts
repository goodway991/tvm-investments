import type {
  DailySnapshot,
  MarketMover,
  OHLCVBar,
  StockCandidate,
} from "@/types";
import {
  FREE_MOVER_LIMIT,
  PRO_MOVER_LIMIT,
  planHasPro,
  sectorDiveLimit,
  type PlanId,
} from "@/lib/plans";

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
  const next = {
    ...stock,
    ohlcv: stock.ohlcv.slice(-DAILY_BARS),
    headlines: stock.headlines.slice(0, HEADLINES),
  };
  delete next.businessSummary;
  if (yearCloses.length) next.yearCloses = yearCloses;
  else delete next.yearCloses;
  return next;
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

/** Enforce free/pro payload caps on the server so the UI gate is not the only wall. */
export function applyPlanSnapshotCaps(
  snapshot: DailySnapshot,
  plan: PlanId,
): DailySnapshot {
  const moverCap = planHasPro(plan) ? PRO_MOVER_LIMIT : FREE_MOVER_LIMIT;
  const diveCap = sectorDiveLimit(plan);
  const dives = snapshot.sectorDives || [];
  return {
    ...snapshot,
    topMovers: snapshot.topMovers.slice(0, moverCap),
    sectorDives: Number.isFinite(diveCap) ? dives.slice(0, diveCap) : dives,
    techSectorAnalysis: planHasPro(plan) ? snapshot.techSectorAnalysis : "",
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
