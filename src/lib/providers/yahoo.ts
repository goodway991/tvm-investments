import YahooFinance from "yahoo-finance2";
import type { ChartPoint, ChartRange } from "@/lib/chart-series";
import type { MarketEvent, NewsHeadline, OHLCVBar, StockCandidate } from "@/types";
import { YAHOO_SCAN_UNIVERSE, SCAN_UNIVERSE_LIMIT } from "@/lib/watchlist-symbols";
import {
  fetchNasdaqEtfs,
  fetchNasdaqScreener,
  mixScanUniverse,
  type NasdaqQuote,
} from "@/lib/providers/nasdaq";
import { resolveSector, sectorNewsSymbols } from "@/lib/sector-dives";

export { YAHOO_SCAN_UNIVERSE, WATCHLIST_ALLOWED_SYMBOLS, WATCHLIST_EXTRA_SYMBOLS, SCAN_UNIVERSE_LIMIT, POPULAR_WATCHLIST_SYMBOLS } from "@/lib/watchlist-symbols";

let yahooClient: InstanceType<typeof YahooFinance> | null = null;

function getYahoo() {
  if (!yahooClient) {
    yahooClient = new YahooFinance({
      suppressNotices: ["yahooSurvey"],
    });
  }
  return yahooClient;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function publicPublisher(raw?: string | null) {
  const publisher = raw?.trim() || "News";
  return /yahoo/i.test(publisher) ? "News" : publisher;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "raw" in value) {
    const raw = (value as { raw: unknown }).raw;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return null;
}

function toIso(value: Date | number | string | undefined) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    return new Date(value < 1e12 ? value * 1000 : value).toISOString();
  }
  return new Date(value).toISOString();
}

export async function fetchYahooQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}> {
  try {
    const yahooFinance = getYahoo();
    const quote = await yahooFinance.quote(symbol.toUpperCase());

    const price = quote.regularMarketPrice ?? quote.postMarketPrice ?? 0;
    const change = quote.regularMarketChange ?? 0;
    const changePercent = quote.regularMarketChangePercent ?? 0;

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      currency: quote.currency ?? "USD",
    };
  } catch (error) {
    console.error("Yahoo Finance quote error:", error);
    throw new Error(`Unable to fetch quote for ${symbol}`);
  }
}

export async function fetchYahooHistory(
  symbol: string,
  days = 90
): Promise<Array<{ date: string; close: number; volume: number }>> {
  const yahooFinance = getYahoo();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const result = await yahooFinance.historical(symbol.toUpperCase(), {
    period1: start,
    period2: new Date(),
    interval: "1d",
  });

  return result.map((bar) => ({
    date: bar.date.toISOString().slice(0, 10),
    close: bar.close,
    volume: bar.volume,
  }));
}

export async function fetchYahooCloseOnDate(symbol: string, ymd: string) {
  const yahooFinance = getYahoo();
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) return null;
  const target = new Date(Date.UTC(year, month - 1, day));
  const period1 = new Date(target);
  period1.setUTCDate(period1.getUTCDate() - 12);
  const period2 = new Date(target);
  period2.setUTCDate(period2.getUTCDate() + 2);

  const result = await yahooFinance.historical(symbol.toUpperCase(), {
    period1,
    period2,
    interval: "1d",
  });

  const bars = result
    .map((bar) => ({
      date: bar.date.toISOString().slice(0, 10),
      close: bar.close,
    }))
    .filter((bar) => bar.date <= ymd && Number.isFinite(bar.close))
    .sort((left, right) => left.date.localeCompare(right.date));
  const match = bars.find((bar) => bar.date === ymd) ?? bars.at(-1);
  if (!match) return null;
  return { date: match.date, close: Number(match.close.toFixed(4)) };
}

export async function fetchYahooNews(
  symbol: string,
  count = 6,
): Promise<NewsHeadline[]> {
  try {
    const yahooFinance = getYahoo();
    const result = await yahooFinance.search(symbol.toUpperCase(), {
      newsCount: count,
      quotesCount: 1,
    });

    return (result.news ?? []).slice(0, count).map((item) => ({
      headline: item.title,
      source: publicPublisher(item.publisher),
      datetime: toIso(item.providerPublishTime),
      url: item.link,
    }));
  } catch (error) {
    console.error("Yahoo Finance news error:", error);
    return [];
  }
}

export async function searchYahooSymbols(
  query: string,
  limit = 12,
): Promise<Array<{ symbol: string; name: string }>> {
  const needle = query.trim();
  if (needle.length < 1) return [];
  try {
    const yahooFinance = getYahoo();
    const result = await yahooFinance.search(needle, {
      quotesCount: limit,
      newsCount: 0,
    });
    const seen = new Set<string>();
    const matches: Array<{ symbol: string; name: string }> = [];
    for (const quote of result.quotes ?? []) {
      const type = String(
        (quote as { quoteType?: string }).quoteType ?? "",
      ).toUpperCase();
      if (type && type !== "EQUITY" && type !== "ETF") continue;
      const symbol = String(quote.symbol ?? "")
        .trim()
        .toUpperCase();
      if (!symbol || seen.has(symbol)) continue;
      seen.add(symbol);
      const quoteNames = quote as {
        longname?: unknown;
        shortname?: unknown;
        longName?: unknown;
        shortName?: unknown;
      };
      const nameCandidate = [
        quoteNames.longname,
        quoteNames.shortname,
        quoteNames.longName,
        quoteNames.shortName,
      ].find(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      );
      matches.push({
        symbol,
        name: nameCandidate ?? symbol,
      });
    }
    return matches.slice(0, limit);
  } catch (error) {
    console.error("Symbol search error:", error);
    return [];
  }
}

function impactFromText(text: string): MarketEvent["impact"] {
  const t = text.toLowerCase();
  const bullish = ["rally", "surge", "beats", "record high", "eases", "cut rates", "cool inflation"];
  const bearish = ["plunge", "crash", "misses", "war", "tariff", "selloff", "inflation jumps"];
  const up = bullish.filter((word) => t.includes(word)).length;
  const down = bearish.filter((word) => t.includes(word)).length;
  if (up > down) return "bullish";
  if (down > up) return "bearish";
  return "mixed";
}

function regionFromText(text: string): MarketEvent["region"] {
  const t = text.toLowerCase();
  if (
    t.includes("fed") ||
    t.includes("wall street") ||
    t.includes("nasdaq") ||
    t.includes("s&p") ||
    t.includes("dow ") ||
    t.includes("u.s") ||
    t.includes("us ")
  ) {
    return "US";
  }
  if (t.includes("tech") || t.includes("nvidia") || t.includes("semiconductor") || t.includes("ai ")) {
    return "Tech";
  }
  return "Global";
}

function monthEndCloses(ohlcv: OHLCVBar[]): OHLCVBar[] {
  const byMonth = new Map<string, OHLCVBar>();
  ohlcv.forEach((bar) => byMonth.set(bar.date.slice(0, 7), bar));
  return Array.from(byMonth.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-12)
    .map(([, bar]) => bar);
}

type YahooQuote = {
  symbol?: string;
  longName?: string;
  shortName?: string;
  sector?: string;
  industry?: string;
  regularMarketPrice?: unknown;
  postMarketPrice?: unknown;
  preMarketPrice?: unknown;
  regularMarketChange?: unknown;
  regularMarketChangePercent?: unknown;
  regularMarketPreviousClose?: unknown;
  regularMarketVolume?: unknown;
  trailingPE?: unknown;
  beta?: unknown;
  epsTrailingTwelveMonths?: unknown;
  marketCap?: unknown;
  averageDailyVolume3Month?: unknown;
  sharesShort?: unknown;
  sharesOutstanding?: unknown;
  fiftyTwoWeekHigh?: unknown;
  fiftyTwoWeekLow?: unknown;
};

function asQuoteList(result: unknown): YahooQuote[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as YahooQuote[];
  if (typeof result === "object") {
    const record = result as Record<string, unknown>;
    if ("regularMarketPrice" in record || "regularMarketPreviousClose" in record || "symbol" in record) {
      return [record as YahooQuote];
    }
    return Object.values(record).filter(
      (value): value is YahooQuote =>
        Boolean(value) && typeof value === "object",
    );
  }
  return [];
}

function yahooSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\./g, "-");
}

export async function fetchYahooQuotesBatch(symbols: string[]) {
  const yahooFinance = getYahoo();
  const quotes = new Map<string, YahooQuote>();
  const chunkSize = 40;
  const concurrency = 3;
  const chunks: string[][] = [];
  for (let index = 0; index < symbols.length; index += chunkSize) {
    chunks.push(symbols.slice(index, index + chunkSize));
  }
  for (let index = 0; index < chunks.length; index += concurrency) {
    const wave = chunks.slice(index, index + concurrency);
    await Promise.all(
      wave.map(async (chunk) => {
        try {
          const result = await yahooFinance.quote(chunk.map(yahooSymbol));
          for (const quote of asQuoteList(result)) {
            const symbol = String(quote.symbol ?? "").toUpperCase();
            if (symbol) quotes.set(symbol, quote);
          }
        } catch (error) {
          console.warn(`Yahoo quote batch failed at ${chunk[0]}:`, error);
        }
      }),
    );
    await sleep(40);
  }
  for (const requested of symbols) {
    const key = requested.trim().toUpperCase();
    if (!key || quotes.has(key)) continue;
    const yahoo = yahooSymbol(key);
    const hit =
      quotes.get(yahoo) ??
      [...quotes.values()].find(
        (quote) => yahooSymbol(String(quote.symbol ?? "")) === yahoo,
      );
    if (hit) quotes.set(key, hit);
  }
  return quotes;
}

async function fetchYahooDailyBars(symbol: string): Promise<{
  ohlcv: OHLCVBar[];
  yearCloses: OHLCVBar[];
}> {
  const yahooFinance = getYahoo();
  const start = new Date();
  start.setDate(start.getDate() - 400);
  const result = await yahooFinance.chart(symbol.toUpperCase(), {
    period1: start,
    period2: new Date(),
    interval: "1d",
    includePrePost: false,
  });
  const ohlcv = barsFromChart(result.quotes).slice(-260);
  return { ohlcv, yearCloses: monthEndCloses(ohlcv) };
}

function candidateFromQuote(
  symbol: string,
  quote: YahooQuote | undefined,
  nasdaq: NasdaqQuote | undefined,
  ohlcv: OHLCVBar[],
  yearCloses: OHLCVBar[],
  headlines: NewsHeadline[],
): StockCandidate {
  const lastClose = ohlcv.at(-1)?.close ?? 0;
  const prevClose =
    num(quote?.regularMarketPreviousClose) ??
    ohlcv.at(-2)?.close ??
    lastClose;
  const price = num(quote?.regularMarketPrice) ?? nasdaq?.price ?? lastClose;
  const change =
    num(quote?.regularMarketChange) ??
    nasdaq?.change ??
    price - prevClose;
  const changePercent =
    num(quote?.regularMarketChangePercent) ??
    nasdaq?.changePercent ??
    (prevClose ? ((price - prevClose) / prevClose) * 100 : 0);

  return {
    symbol,
    name: quote?.longName || quote?.shortName || nasdaq?.name || symbol,
    sector: resolveSector(
      symbol,
      String(quote?.sector || nasdaq?.sector || ""),
      String(quote?.industry || nasdaq?.industry || ""),
    ),
    industry: String(
      quote?.industry || nasdaq?.industry || quote?.sector || nasdaq?.sector || "Unknown",
    ),
    price,
    change,
    changePercent,
    volume: num(quote?.regularMarketVolume) ?? ohlcv.at(-1)?.volume ?? 0,
    fundamentals: {
      peRatio: num(quote?.trailingPE),
      beta: num(quote?.beta),
      eps: num(quote?.epsTrailingTwelveMonths),
      marketCap: num(quote?.marketCap) ?? nasdaq?.marketCap ?? null,
      avgVolume: num(quote?.averageDailyVolume3Month),
      shortInterestPct: num(quote?.sharesShort) && num(quote?.sharesOutstanding)
        ? (num(quote?.sharesShort) as number) / (num(quote?.sharesOutstanding) as number)
        : null,
    },
    ohlcv,
    yearCloses,
    fiftyTwoWeekHigh: num(quote?.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(quote?.fiftyTwoWeekLow),
    headlines,
    signals: [],
    compositeScore: 0,
    maxCompositeScore: 100,
  };
}

function barsFromChart(
  quotes: Array<{
    date: Date | number | string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
  }> | undefined,
): OHLCVBar[] {
  if (!quotes?.length) return [];
  return quotes
    .filter((bar) => bar.close != null && Number.isFinite(bar.close))
    .map((bar) => {
      const close = bar.close as number;
      const stamp =
        bar.date instanceof Date
          ? bar.date
          : new Date(typeof bar.date === "number" ? bar.date : String(bar.date));
      const iso = Number.isFinite(stamp.getTime())
        ? stamp.toISOString().slice(0, 10)
        : "";
      return {
        date: iso,
        open: bar.open ?? close,
        high: bar.high ?? close,
        low: bar.low ?? close,
        close,
        volume: bar.volume ?? 0,
      };
    })
    .filter((bar) => /^\d{4}-\d{2}-\d{2}$/.test(bar.date));
}

export async function fetchYahooCandidate(symbol: string): Promise<StockCandidate> {
  const yahooFinance = getYahoo();
  const ticker = symbol.toUpperCase();
  const dailyStart = new Date();
  dailyStart.setDate(dailyStart.getDate() - 140);
  const yearStart = new Date();
  yearStart.setFullYear(yearStart.getFullYear() - 1);

  const [quote, dailyChart, monthlyChart, headlines, summary] = await Promise.all([
    yahooFinance.quote(ticker),
    yahooFinance.chart(ticker, {
      period1: dailyStart,
      period2: new Date(),
      interval: "1d",
      includePrePost: false,
    }),
    yahooFinance
      .chart(ticker, {
        period1: yearStart,
        period2: new Date(),
        interval: "1mo",
        includePrePost: false,
      })
      .catch(() => null),
    fetchYahooNews(ticker, 6),
    yahooFinance
      .quoteSummary(ticker, {
        modules: ["assetProfile", "defaultKeyStatistics", "summaryDetail"],
      })
      .catch(() => null),
  ]);

  const profile = summary?.assetProfile;
  const stats = summary?.defaultKeyStatistics;
  const detail = summary?.summaryDetail;
  const sector = resolveSector(ticker, profile?.sector ?? "", profile?.industry ?? "");
  const ohlcv = barsFromChart(dailyChart.quotes).slice(-90);
  const yearCloses = monthlyChart ? barsFromChart(monthlyChart.quotes).slice(-12) : [];
  const lastClose = ohlcv.at(-1)?.close ?? 0;
  const prevClose =
    num(quote.regularMarketPreviousClose) ?? ohlcv.at(-2)?.close ?? lastClose;
  const price =
    num(quote.regularMarketPrice) ?? num(quote.postMarketPrice) ?? lastClose;
  const change = num(quote.regularMarketChange) ?? price - prevClose;
  const changePercent =
    num(quote.regularMarketChangePercent) ??
    (prevClose ? ((price - prevClose) / prevClose) * 100 : 0);

  return {
    symbol: ticker,
    name: quote.longName || quote.shortName || ticker,
    sector,
    industry: profile?.industry || sector,
    price,
    change,
    changePercent,
    volume: num(quote.regularMarketVolume) ?? ohlcv.at(-1)?.volume ?? 0,
    fundamentals: {
      peRatio: num(quote.trailingPE) ?? num(detail?.trailingPE),
      beta: num(stats?.beta) ?? num(detail?.beta),
      eps: num(quote.epsTrailingTwelveMonths) ?? num(stats?.trailingEps),
      marketCap: num(quote.marketCap) ?? num(detail?.marketCap),
      avgVolume: num(quote.averageDailyVolume3Month) ?? num(detail?.averageVolume),
      shortInterestPct: num(stats?.shortPercentOfFloat),
    },
    ohlcv,
    yearCloses,
    businessSummary: profile?.longBusinessSummary?.slice(0, 700),
    fiftyTwoWeekHigh: num(quote.fiftyTwoWeekHigh) ?? num(detail?.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(quote.fiftyTwoWeekLow) ?? num(detail?.fiftyTwoWeekLow),
    headlines,
    signals: [],
    compositeScore: 0,
    maxCompositeScore: 100,
  };
}

export async function fetchYahooIntraday(
  symbol: string,
  date?: string,
): Promise<ChartPoint[]> {
  const yahooFinance = getYahoo();
  const ticker = symbol.toUpperCase();
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  const period1 = day
    ? new Date(`${day}T00:00:00-04:00`)
    : new Date(Date.now() - 36 * 60 * 60 * 1000);
  const period2 = day ? new Date(`${day}T23:59:59-04:00`) : new Date();

  const result = await yahooFinance.chart(ticker, {
    period1,
    period2,
    interval: "5m",
    includePrePost: false,
  });

  return result.quotes
    .filter((bar) => bar.close != null && Number.isFinite(bar.close))
    .map((bar) => ({
      label: bar.date.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
      }),
      value: +(bar.close as number).toFixed(2),
      timestamp: bar.date.getTime(),
    }));
}

export async function fetchYahooChartSeries(
  symbol: string,
  range: ChartRange,
  asOf?: string,
  lookbackDays?: number,
): Promise<ChartPoint[]> {
  if (range === "day") return fetchYahooIntraday(symbol, asOf);

  const yahooFinance = getYahoo();
  const ticker = symbol.toUpperCase();
  const end =
    asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)
      ? new Date(`${asOf}T23:59:59-04:00`)
      : new Date();
  const start = new Date(end);
  if (range === "month") start.setDate(start.getDate() - (lookbackDays ?? 40));
  else start.setFullYear(start.getFullYear() - 1);

  const result = await yahooFinance.chart(ticker, {
    period1: start,
    period2: end,
    interval: range === "month" ? "1d" : "1wk",
    includePrePost: false,
  });

  return (result.quotes ?? [])
    .filter((bar) => bar.close != null && Number.isFinite(bar.close))
    .map((bar) => ({
      label: bar.date.toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: range === "month" ? "numeric" : undefined,
        year: range === "year" ? "2-digit" : undefined,
      }),
      value: +(bar.close as number).toFixed(2),
      timestamp: bar.date.getTime(),
    }));
}

export async function fetchYahooOhlcvSeries(
  symbol: string,
  lookbackDays = 90,
  asOf?: string,
): Promise<OHLCVBar[]> {
  const yahooFinance = getYahoo();
  const ticker = symbol.toUpperCase();
  const end =
    asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)
      ? new Date(`${asOf}T23:59:59-04:00`)
      : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(40, Math.min(120, lookbackDays)));
  let bars: OHLCVBar[] = [];
  try {
    const result = await yahooFinance.chart(ticker, {
      period1: Math.floor(start.getTime() / 1000),
      period2: Math.floor(end.getTime() / 1000),
      interval: "1d",
      includePrePost: false,
    });
    bars = barsFromChart(result.quotes);
  } catch (error) {
    console.warn(`Yahoo OHLCV chart failed for ${ticker}:`, error);
  }
  if (bars.length >= 8) return bars;
  try {
    const closes = await fetchYahooChartSeries(ticker, "month", asOf, lookbackDays);
    return closes
      .filter((point) => point.value > 0 && Number.isFinite(point.timestamp))
      .map((point) => ({
        date: new Date(point.timestamp).toISOString().slice(0, 10),
        open: point.value,
        high: point.value,
        low: point.value,
        close: point.value,
        volume: 0,
      }));
  } catch (error) {
    console.warn(`Yahoo OHLCV fallback failed for ${ticker}:`, error);
    return bars;
  }
}

export async function fetchYahooUniverse(): Promise<StockCandidate[]> {
  let nasdaqRows: NasdaqQuote[] = [];
  try {
    const [stocks, etfs] = await Promise.all([
      fetchNasdaqScreener(12_000),
      fetchNasdaqEtfs(8_000),
    ]);
    nasdaqRows = mixScanUniverse(stocks, etfs, SCAN_UNIVERSE_LIMIT);
  } catch (error) {
    console.warn("NASDAQ screener unavailable for universe:", error);
  }
  const nasdaqMap = new Map(nasdaqRows.map((row) => [row.symbol, row]));
  const symbols: string[] = [];
  const seen = new Set<string>();

  function addSymbol(symbol: string) {
    if (seen.has(symbol) || symbols.length >= SCAN_UNIVERSE_LIMIT) return;
    seen.add(symbol);
    symbols.push(symbol);
  }

  for (const row of nasdaqRows) addSymbol(row.symbol);
  for (const symbol of YAHOO_SCAN_UNIVERSE) addSymbol(symbol);

  if (symbols.length === 0) {
    YAHOO_SCAN_UNIVERSE.forEach(addSymbol);
  }

  const quotes = await fetchYahooQuotesBatch(symbols);
  return symbols
    .map((symbol) => {
      const quote = quotes.get(symbol);
      const nasdaq = nasdaqMap.get(symbol);
      if (!quote && !nasdaq) return null;
      const price =
        num(quote?.regularMarketPrice) ?? nasdaq?.price ?? 0;
      if (!(price > 0)) return null;
      return candidateFromQuote(symbol, quote, nasdaq, [], [], []);
    })
    .filter((candidate): candidate is StockCandidate => candidate != null);
}

export async function hydrateYahooCandidates(
  candidates: StockCandidate[],
  options: { news?: boolean } = {},
): Promise<StockCandidate[]> {
  const bars = new Array<{ ohlcv: OHLCVBar[]; yearCloses: OHLCVBar[] } | null>(
    candidates.length,
  ).fill(null);
  let cursor = 0;
  const workers = Math.min(8, Math.max(1, candidates.length));

  async function worker() {
    while (cursor < candidates.length) {
      const index = cursor++;
      const symbol = candidates[index]?.symbol;
      if (!symbol) continue;
      try {
        bars[index] = await fetchYahooDailyBars(symbol);
      } catch (error) {
        console.warn(`Skipping ${symbol} chart:`, error);
      }
      await sleep(8);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));

  const withBars = candidates.map((candidate, index) => {
    const series = bars[index];
    if (!series || series.ohlcv.length < 5) return candidate;
    return {
      ...candidate,
      ohlcv: series.ohlcv,
      yearCloses: series.yearCloses,
    };
  });

  if (!options.news) return withBars;

  const newsTargets = Array.from(
    new Set([
      ...[...withBars]
        .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))
        .slice(0, 40)
        .map((candidate) => candidate.symbol),
      ...sectorNewsSymbols(withBars, 4),
    ]),
  );
  const headlinesBySymbol = new Map<string, NewsHeadline[]>();
  await Promise.all(
    newsTargets.map(async (symbol) => {
      headlinesBySymbol.set(symbol, await fetchYahooNews(symbol, 5));
    }),
  );
  return withBars.map((candidate) => ({
    ...candidate,
    headlines: headlinesBySymbol.get(candidate.symbol) ?? candidate.headlines,
  }));
}

function lastTradePrice(quote: YahooQuote | undefined) {
  if (!quote) return null;
  const price =
    num(quote.regularMarketPrice) ??
    num(quote.postMarketPrice) ??
    num(quote.preMarketPrice) ??
    num(quote.regularMarketPreviousClose);
  return price && price > 0 ? price : null;
}

export function quoteCardFromYahoo(symbol: string, quote: YahooQuote | undefined) {
  const price = lastTradePrice(quote);
  if (!price) return null;
  return {
    symbol: symbol.toUpperCase(),
    name: String(quote?.shortName || quote?.longName || "").trim() || undefined,
    price,
    change: num(quote?.regularMarketChange) ?? 0,
    changePercent: num(quote?.regularMarketChangePercent) ?? 0,
    volume: num(quote?.regularMarketVolume) ?? 0,
    peRatio: num(quote?.trailingPE),
  };
}

async function fillMissingQuotes(
  symbols: string[],
  quotes: Map<string, YahooQuote>,
) {
  const missing = symbols.filter(
    (symbol) => !quotes.has(symbol) && !quotes.has(yahooSymbol(symbol)),
  );
  if (missing.length === 0) return quotes;
  const yahooFinance = getYahoo();
  await Promise.all(
    missing.map(async (symbol) => {
      try {
        const result = await yahooFinance.quote(yahooSymbol(symbol));
        const quote = asQuoteList(result)[0];
        if (quote) quotes.set(symbol.toUpperCase(), quote);
      } catch (error) {
        console.warn(`Yahoo quote fallback failed for ${symbol}:`, error);
      }
    }),
  );
  return quotes;
}

async function lastCloseFromChart(symbol: string): Promise<{
  price: number;
  changePercent: number;
} | null> {
  try {
    const points = await fetchYahooChartSeries(yahooSymbol(symbol), "month", undefined, 40);
    const last = points.at(-1);
    const prev = points.at(-2);
    if (!last || !(last.value > 0)) return null;
    const changePercent =
      prev && prev.value > 0 ? ((last.value - prev.value) / prev.value) * 100 : 0;
    return { price: last.value, changePercent };
  } catch (error) {
    console.warn(`Yahoo chart quote fallback failed for ${symbol}:`, error);
    return null;
  }
}

async function quoteCardWithChartFallback(symbol: string, quote: YahooQuote | undefined) {
  const card = quoteCardFromYahoo(symbol, quote);
  if (card?.price) return card;
  const close = await lastCloseFromChart(symbol);
  if (!close) return card;
  return {
    symbol: symbol.toUpperCase(),
    name: card?.name,
    price: close.price,
    change: card?.change ?? 0,
    changePercent: close.changePercent,
    volume: card?.volume ?? 0,
    peRatio: card?.peRatio ?? num(quote?.trailingPE),
  };
}

export async function fetchYahooQuoteCards(symbols: string[]) {
  const unique = Array.from(
    new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ).slice(0, 40);
  const quotes = await fillMissingQuotes(
    unique,
    await fetchYahooQuotesBatch(unique),
  );
  const rows = await Promise.all(
    unique.map((symbol) =>
      quoteCardWithChartFallback(
        symbol,
        quotes.get(symbol) ?? quotes.get(yahooSymbol(symbol)),
      ),
    ),
  );
  return rows.filter((row): row is NonNullable<typeof row> => row != null);
}

export type YahooCompareCard = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  peRatio: number | null;
  recommendation: string | null;
  analystCount: number | null;
  targetMean: number | null;
};

export async function fetchYahooCompareCards(symbols: string[]) {
  const unique = Array.from(
    new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ).slice(0, 4);
  const quotes = await fillMissingQuotes(
    unique,
    await fetchYahooQuotesBatch(unique),
  );
  const emptyAnalyst = {
    targetMean: null as number | null,
    recommendation: null as string | null,
    analystCount: null as number | null,
  };

  return Promise.all(
    unique.map(async (symbol) => {
      const quote = quotes.get(symbol) ?? quotes.get(yahooSymbol(symbol));
      const card = await quoteCardWithChartFallback(symbol, quote);
      const analyst = await Promise.race([
        fetchYahooAnalystView(yahooSymbol(symbol)),
        sleep(2800).then(() => emptyAnalyst),
      ]).catch(() => emptyAnalyst);
      return {
        symbol,
        name:
          card?.name ||
          String(quote?.shortName || quote?.longName || symbol),
        price: card?.price ?? 0,
        changePercent: card?.changePercent ?? 0,
        peRatio: card?.peRatio ?? num(quote?.trailingPE) ?? null,
        recommendation: analyst.recommendation,
        analystCount: analyst.analystCount,
        targetMean: analyst.targetMean,
      } satisfies YahooCompareCard;
    }),
  );
}

export async function fetchYahooMarketEvents(): Promise<MarketEvent[]> {
  try {
    const yahooFinance = getYahoo();
    const result = await yahooFinance.search("stock market news", {
      newsCount: 10,
      quotesCount: 0,
    });
    return (result.news ?? []).slice(0, 6).map((item) => {
      const title = item.title;
      const tickers = (item.relatedTickers ?? []).slice(0, 6);
      const source = publicPublisher(item.publisher);
      const published = toIso(item.providerPublishTime);
      const tickerLine = tickers.length
        ? `Names in the headline: ${tickers.join(", ")}.`
        : "";
      const summary = (
        tickerLine ||
        (source ? `${source} filed this as a session headline.` : "A market-moving note from this session.")
      ).slice(0, 220);
      const detail = [
        `What moved: ${title.endsWith(".") ? title : `${title}.`}`,
        tickerLine,
        source ? `Reported by ${source}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      return {
        title,
        region: regionFromText(`${title} ${item.publisher ?? ""} ${tickers.join(" ")}`),
        impact: impactFromText(title),
        summary: summary || title,
        detail,
        source,
        url: item.link || undefined,
        tickers,
        date: published.slice(0, 10),
      };
    });
  } catch (error) {
    console.error("Yahoo market news error:", error);
    return [];
  }
}

export async function fetchYahooAnalystView(symbol: string): Promise<{
  targetMean: number | null;
  targetLow: number | null;
  targetHigh: number | null;
  recommendation: string | null;
  analystCount: number | null;
}> {
  try {
    const yahooFinance = getYahoo();
    const result = await yahooFinance.quoteSummary(symbol.toUpperCase(), {
      modules: ["financialData"],
    });
    const data = result.financialData;
    return {
      targetMean: num(data?.targetMeanPrice),
      targetLow: num(data?.targetLowPrice),
      targetHigh: num(data?.targetHighPrice),
      recommendation: data?.recommendationKey ?? null,
      analystCount: num(data?.numberOfAnalystOpinions),
    };
  } catch (error) {
    console.error("Yahoo analyst view error:", error);
    return {
      targetMean: null,
      targetLow: null,
      targetHigh: null,
      recommendation: null,
      analystCount: null,
    };
  }
}

export async function fetchYahooTechAnalysis(): Promise<string> {
  try {
    const yahooFinance = getYahoo();
    const result = await yahooFinance.search("technology sector stocks", {
      newsCount: 8,
      quotesCount: 0,
    });
    const bullets = (result.news ?? [])
      .slice(0, 5)
      .map((item) => `- ${item.title} (${publicPublisher(item.publisher)})`)
      .join("\n");
    return `Tech headlines:\n${bullets}`;
  } catch (error) {
    console.error("Yahoo tech news error:", error);
    return "Tech headlines were unavailable for this snapshot.";
  }
}
