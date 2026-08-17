import type { DailySnapshot, FilterCriteria, ScreenedStock, StockCandidate } from "@/types";
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
  applyProCulture,
  buildProCultureMap,
  generateCompanyReport,
  generateProCulture,
  rankCandidates,
  toScreenedStock,
} from "./scoring";
import { fillDiveHeadlines, writeDailySectorDives } from "./sector-dives";
import { etDateString } from "./archive-window";
import { DOW_30, SP500 } from "./indices/constituents";
import {
  fetchMorningBrewMarketEvents,
  mergeNewsSources,
} from "./providers/morning-brew";

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
  return process.env.DATA_MODE === "demo";
}

function hasFinnhub(): boolean {
  return Boolean(process.env.FINNHUB_API_KEY);
}

function averageBySector(stocks: StockCandidate[]): Record<string, number> {
  const buckets: Record<string, number[]> = {};
  for (const stock of stocks) {
    (buckets[stock.sector] ??= []).push(stock.changePercent);
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([sector, values]) => [
      sector,
      values.reduce((sum, value) => sum + value, 0) / values.length,
    ]),
  );
}

export async function runDailyAnalysis(
  useLLM = false,
): Promise<DailySnapshot> {
  if (isDemoMode()) {
    return runDemoAnalysis(useLLM);
  }
  return runLiveAnalysis(useLLM);
}

export async function runFallbackSnapshot(): Promise<DailySnapshot> {
  return runDemoAnalysis(false);
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
  let reports = topPicks.map(generateCompanyReport);
  const topMovers = buildDemoMovers(analyzed);
  const horizonViews = buildHorizonViews(ranked);
  if (useLLM) {
    const unique = uniquePicks([
      ...topPicks,
      ...horizonViews.shortTermPicks,
      ...horizonViews.longTermPicks,
    ]);
    const cultureBySymbol = await buildProCultureMap(unique);
    reports = applyProCulture(reports, cultureBySymbol);
    horizonViews.shortTermReports = applyProCulture(
      horizonViews.shortTermReports,
      cultureBySymbol,
    );
    horizonViews.longTermReports = applyProCulture(
      horizonViews.longTermReports,
      cultureBySymbol,
    );
  }
  const sessionDate = etDateString();
  const sectorDives = await writeDailySectorDives(ranked, sessionDate, useLLM);

  return {
    id: sessionDate,
    date: sessionDate,
    generatedAt: new Date().toISOString(),
    dataMode: "demo",
    scanUniverse: summarizeUniverse(analyzed),
    screenedStocks: ranked.map(toScreenedStock),
    topMovers,
    topPicks,
    ...horizonViews,
    reports,
    marketEvents: DEMO_MARKET_EVENTS.map((event) => ({ ...event, date: sessionDate })),
    sectorDives,
    techSectorAnalysis: DEMO_TECH_ANALYSIS,
    methodologyNote: METHODOLOGY_NOTE,
    disclaimer: DISCLAIMER,
  };
}

async function runLiveAnalysis(useLLM: boolean): Promise<DailySnapshot> {
  const finnhubEnabled = hasFinnhub();
  const yahoo = await import("./providers/yahoo");
  const finnhub = finnhubEnabled ? await import("./providers/finnhub") : null;

  const raw = await yahoo.fetchYahooUniverse();

  if (raw.length === 0) {
    console.warn("Live universe empty; falling back to demo snapshot");
    return runDemoAnalysis(useLLM);
  }

  const sectorChanges = averageBySector(raw);
  const marketChange =
    raw.reduce((sum, stock) => sum + stock.changePercent, 0) / raw.length;

  const analyzed: StockCandidate[] = [];
  for (const stock of raw) {
    const sectorChange = sectorChanges[stock.sector] ?? marketChange;
    analyzed.push(
      await analyzeStock(addIndexMembership(stock), sectorChange, marketChange, useLLM),
    );
  }

  let ranked = rankCandidates(analyzed);
  ranked = await fillDiveHeadlines(ranked);
  const topPicks = ranked.slice(0, 3);
  let reports = topPicks.map(generateCompanyReport);
  const horizonViews = buildHorizonViews(ranked);
  if (useLLM) {
    const unique = uniquePicks([
      ...topPicks,
      ...horizonViews.shortTermPicks,
      ...horizonViews.longTermPicks,
    ]);
    const cultureBySymbol = await buildProCultureMap(unique);
    reports = applyProCulture(reports, cultureBySymbol);
    horizonViews.shortTermReports = applyProCulture(
      horizonViews.shortTermReports,
      cultureBySymbol,
    );
    horizonViews.longTermReports = applyProCulture(
      horizonViews.longTermReports,
      cultureBySymbol,
    );
  }
  const topMovers = [...ranked]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 20)
    .map((candidate) => ({
      ...candidate,
      direction: candidate.changePercent >= 0 ? ("gainer" as const) : ("loser" as const),
    }));

  const sessionDate = etDateString();
  const [brewEvents, wireEvents, techSectorAnalysis, sectorDives] = await Promise.all([
    fetchMorningBrewMarketEvents(6),
    finnhub ? finnhub.fetchMarketEvents() : yahoo.fetchYahooMarketEvents(),
    finnhub ? finnhub.fetchTechAnalysis() : yahoo.fetchYahooTechAnalysis(),
    writeDailySectorDives(ranked, sessionDate, useLLM),
  ]);
  const marketEvents = mergeNewsSources(brewEvents, wireEvents, 6);

  return {
    id: sessionDate,
    date: sessionDate,
    generatedAt: new Date().toISOString(),
    dataMode: "live",
    scanUniverse: summarizeUniverse(analyzed),
    screenedStocks: ranked.map(toScreenedStock),
    topMovers,
    topPicks,
    ...horizonViews,
    reports,
    marketEvents,
    sectorDives,
    techSectorAnalysis,
    methodologyNote: `${METHODOLOGY_NOTE} Live snapshots scan about 1,500 liquid US names after the weekday close, including the S&P 500 and Dow 30. The daily brief and sector deep dives are rewritten from that session’s closes and headlines.`,
    disclaimer: DISCLAIMER,
  };
}

function uniquePicks(stocks: StockCandidate[]): StockCandidate[] {
  const seen = new Set<string>();
  return stocks.filter((stock) => {
    if (seen.has(stock.symbol)) return false;
    seen.add(stock.symbol);
    return true;
  });
}

export async function filterStocks(
  snapshot: DailySnapshot,
  filters: FilterCriteria
): Promise<ScreenedStock[]> {
  const { applyFilters } = await import("./scoring");
  const pool =
    snapshot.screenedStocks?.length > 0
      ? snapshot.screenedStocks
      : snapshot.topMovers.map((stock) => ({
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          industry: stock.industry,
          price: stock.price,
          changePercent: stock.changePercent,
          volume: stock.volume,
          compositeScore: stock.compositeScore,
          shortTermScore: stock.shortTermScore ?? stock.compositeScore,
          longTermScore: stock.longTermScore ?? stock.compositeScore,
          fundamentals: stock.fundamentals,
          indexMembership: stock.indexMembership,
        }));
  return applyFilters(pool, filters);
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

export async function researchSymbol(
  symbol: string,
  withProCulture = false,
): Promise<{ stock: StockCandidate; report: ReturnType<typeof generateCompanyReport> }> {
  if (isDemoMode()) {
    const candidates = buildDemoCandidates();
    const found =
      candidates.find((stock) => stock.symbol === symbol.toUpperCase()) ??
      candidates[0];
    const analyzed = await analyzeStock(
      addIndexMembership(found),
      found.changePercent,
      found.changePercent,
      false,
    );
    return { stock: analyzed, report: generateCompanyReport(analyzed) };
  }

  const yahoo = await import("./providers/yahoo");
  const raw = await yahoo.fetchYahooCandidate(symbol);
  const analyzed = await analyzeStock(
    addIndexMembership(raw),
    raw.changePercent,
    raw.changePercent,
    false,
  );
  let report = generateCompanyReport(analyzed);
  if (withProCulture) {
    const culture = await generateProCulture(analyzed);
    if (culture) report = { ...report, cultureAndLongTermPro: culture };
  }
  return { stock: analyzed, report };
}
