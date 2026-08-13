import type { DailySnapshot, FilterCriteria, StockCandidate } from "@/types";
import {
  buildDemoCandidates,
  buildDemoMovers,
  DEMO_MARKET_EVENTS,
  DEMO_TECH_ANALYSIS,
  DISCLAIMER,
  METHODOLOGY_NOTE,
} from "./demo-data";
import {
  analyzeStock,
  generateCompanyReport,
  rankCandidates,
} from "./scoring";
import { DOW_30, SP500 } from "./indices/constituents";

const SECTOR_CHANGES: Record<string, number> = {
  Technology: -3.2,
  "Consumer Cyclical": -4.1,
  "Communication Services": 0.8,
  "Financial Services": -1.2,
  Healthcare: -2.0,
  Industrials: -1.5,
};

const MARKET_CHANGE = -1.8;
const DOW_SYMBOLS = new Set(DOW_30);
const SP500_SYMBOLS = new Set(SP500);

function addIndexMembership(stock: StockCandidate): StockCandidate {
  const indexMembership: NonNullable<StockCandidate["indexMembership"]> = [];
  if (SP500_SYMBOLS.has(stock.symbol)) indexMembership.push("sp500");
  if (DOW_SYMBOLS.has(stock.symbol)) indexMembership.push("dow30");
  return { ...stock, indexMembership };
}

function buildHorizonViews(ranked: StockCandidate[]) {
  const shortTermPicks = [...ranked]
    .sort(
      (a, b) =>
        (b.shortTermScore ?? b.compositeScore) -
        (a.shortTermScore ?? a.compositeScore),
    )
    .slice(0, 3);
  const longTermPicks = [...ranked]
    .sort(
      (a, b) =>
        (b.longTermScore ?? b.compositeScore) -
        (a.longTermScore ?? a.compositeScore),
    )
    .slice(0, 3);

  return {
    shortTermPicks,
    longTermPicks,
    shortTermReports: shortTermPicks.map(generateCompanyReport),
    longTermReports: longTermPicks.map(generateCompanyReport),
  };
}

function summarizeUniverse(candidates: StockCandidate[]) {
  return {
    sp500: candidates.filter((stock) => stock.indexMembership?.includes("sp500")).length,
    dow30: candidates.filter((stock) => stock.indexMembership?.includes("dow30")).length,
    combined: candidates.length,
  };
}

export function isDemoMode(): boolean {
  return (
    process.env.DATA_MODE === "demo" ||
    !process.env.FINNHUB_API_KEY ||
    process.env.FINNHUB_API_KEY.length === 0
  );
}

export async function runDailyAnalysis(
  useLLM = false
): Promise<DailySnapshot> {
  if (isDemoMode()) {
    return runDemoAnalysis(useLLM);
  }
  return runLiveAnalysis(useLLM);
}

async function runDemoAnalysis(useLLM: boolean): Promise<DailySnapshot> {
  const raw = buildDemoCandidates();
  const analyzed: StockCandidate[] = [];

  for (const stock of raw) {
    const sectorChange = SECTOR_CHANGES[stock.sector] ?? MARKET_CHANGE;
    analyzed.push(
      await analyzeStock(addIndexMembership(stock), sectorChange, MARKET_CHANGE, useLLM),
    );
  }

  const ranked = rankCandidates(analyzed);
  const topPicks = ranked.slice(0, 3);
  const reports = topPicks.map(generateCompanyReport);
  const topMovers = buildDemoMovers(analyzed);
  const horizonViews = buildHorizonViews(ranked);
  const now = new Date();

  return {
    id: now.toISOString().slice(0, 10),
    date: now.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
    dataMode: "demo",
    scanUniverse: summarizeUniverse(analyzed),
    topMovers,
    topPicks,
    ...horizonViews,
    reports,
    marketEvents: DEMO_MARKET_EVENTS,
    techSectorAnalysis: DEMO_TECH_ANALYSIS,
    methodologyNote: METHODOLOGY_NOTE,
    disclaimer: DISCLAIMER,
  };
}

async function runLiveAnalysis(useLLM: boolean): Promise<DailySnapshot> {
  const { fetchLiveUniverse, fetchMarketEvents, fetchTechAnalysis } =
    await import("./providers/finnhub");

  const raw = await fetchLiveUniverse();
  const analyzed: StockCandidate[] = [];

  for (const stock of raw) {
    const sectorChange = SECTOR_CHANGES[stock.sector] ?? MARKET_CHANGE;
    analyzed.push(
      await analyzeStock(addIndexMembership(stock), sectorChange, MARKET_CHANGE, useLLM),
    );
  }

  const ranked = rankCandidates(analyzed);
  const topPicks = ranked.slice(0, 3);
  const reports = topPicks.map(generateCompanyReport);
  const horizonViews = buildHorizonViews(ranked);
  const topMovers = [...analyzed]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 10)
    .map((c) => ({
      ...c,
      direction: c.changePercent >= 0 ? ("gainer" as const) : ("loser" as const),
    }));

  const now = new Date();
  const marketEvents = await fetchMarketEvents();
  const techSectorAnalysis = await fetchTechAnalysis();

  return {
    id: now.toISOString().slice(0, 10),
    date: now.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
    dataMode: "live",
    scanUniverse: summarizeUniverse(analyzed),
    topMovers,
    topPicks,
    ...horizonViews,
    reports,
    marketEvents,
    techSectorAnalysis,
    methodologyNote: METHODOLOGY_NOTE,
    disclaimer: DISCLAIMER,
  };
}

export async function filterStocks(
  snapshot: DailySnapshot,
  filters: FilterCriteria
): Promise<StockCandidate[]> {
  const { applyFilters } = await import("./scoring");
  const all = snapshot.topMovers.map(({ direction, ...rest }) => {
    void direction;
    return rest;
  });
  return applyFilters(all, filters);
}

export async function getStockQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}> {
  if (isDemoMode()) {
    const candidates = buildDemoCandidates();
    const found = candidates.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
    if (found) {
      return {
        symbol: found.symbol,
        price: found.price,
        change: found.change,
        changePercent: found.changePercent,
        currency: "USD",
      };
    }
    return {
      symbol: symbol.toUpperCase(),
      price: 100,
      change: 0,
      changePercent: 0,
      currency: "USD",
    };
  }

  const { fetchYahooQuote } = await import("./providers/yahoo");
  return fetchYahooQuote(symbol);
}
