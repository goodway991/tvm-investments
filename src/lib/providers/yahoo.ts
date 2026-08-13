import YahooFinance from "yahoo-finance2";
import type { ChartPoint, ChartRange } from "@/lib/chart-series";
import type { MarketEvent, NewsHeadline, OHLCVBar, StockCandidate } from "@/types";
import { YAHOO_SCAN_UNIVERSE } from "@/lib/watchlist-symbols";
import { fetchNasdaqQuoteMap, type NasdaqQuote } from "@/lib/providers/nasdaq";
import { sectorNewsSymbols } from "@/lib/sector-dives";

export { YAHOO_SCAN_UNIVERSE, WATCHLIST_ALLOWED_SYMBOLS, WATCHLIST_EXTRA_SYMBOLS } from "@/lib/watchlist-symbols";

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

function inferSector(sector: string, industry: string): string {
  const text = `${sector} ${industry}`.toLowerCase();
  if (text.includes("semiconductor") || text.includes("software") || text.includes("technology")) {
    return "Technology";
  }
  if (text.includes("bank") || text.includes("financial") || text.includes("credit") || text.includes("insurance")) {
    return "Financial Services";
  }
  if (text.includes("health") || text.includes("pharma") || text.includes("biotech") || text.includes("drug")) {
    return "Healthcare";
  }
  if (
    text.includes("auto") ||
    text.includes("retail") ||
    text.includes("consumer") ||
    text.includes("restaurant") ||
    text.includes("beverage") ||
    text.includes("household")
  ) {
    return "Consumer Cyclical";
  }
  if (text.includes("communication") || text.includes("media") || text.includes("internet") || text.includes("telecom")) {
    return "Communication Services";
  }
  if (text.includes("industrial") || text.includes("aerospace") || text.includes("machinery") || text.includes("defense")) {
    return "Industrials";
  }
  if (
    text.includes("energy") ||
    text.includes("oil") ||
    text.includes("petroleum") ||
    text.includes("natural gas") ||
    text.includes("midstream")
  ) {
    return "Energy";
  }
  return sector || "Other";
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
  regularMarketChange?: unknown;
  regularMarketChangePercent?: unknown;
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
  if (Array.isArray(result)) return result as YahooQuote[];
  return result ? [result as YahooQuote] : [];
}

export async function fetchYahooQuotesBatch(symbols: string[]) {
  const yahooFinance = getYahoo();
  const quotes = new Map<string, YahooQuote>();
  const chunkSize = 40;
  for (let index = 0; index < symbols.length; index += chunkSize) {
    const chunk = symbols.slice(index, index + chunkSize);
    try {
      const result = await yahooFinance.quote(chunk);
      for (const quote of asQuoteList(result)) {
        const symbol = String(quote.symbol ?? "").toUpperCase();
        if (symbol) quotes.set(symbol, quote);
      }
    } catch (error) {
      console.warn(`Yahoo quote batch failed at ${chunk[0]}:`, error);
    }
    await sleep(80);
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
  const prevClose = ohlcv.at(-2)?.close ?? lastClose;
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
    sector: inferSector(String(quote?.sector ?? ""), String(quote?.industry ?? "")),
    industry: String(quote?.industry || quote?.sector || "Unknown"),
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
    date: Date;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
  }>,
): OHLCVBar[] {
  return quotes
    .filter((bar) => bar.close != null && Number.isFinite(bar.close))
    .map((bar) => {
      const close = bar.close as number;
      return {
        date: bar.date.toISOString().slice(0, 10),
        open: bar.open ?? close,
        high: bar.high ?? close,
        low: bar.low ?? close,
        close,
        volume: bar.volume ?? 0,
      };
    });
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
  const sector = inferSector(profile?.sector ?? "", profile?.industry ?? "");
  const ohlcv = barsFromChart(dailyChart.quotes).slice(-90);
  const yearCloses = monthlyChart ? barsFromChart(monthlyChart.quotes).slice(-12) : [];

  return {
    symbol: ticker,
    name: quote.longName || quote.shortName || ticker,
    sector,
    industry: profile?.industry || sector,
    price: num(quote.regularMarketPrice) ?? num(quote.postMarketPrice) ?? ohlcv.at(-1)?.close ?? 0,
    change: num(quote.regularMarketChange) ?? 0,
    changePercent: num(quote.regularMarketChangePercent) ?? 0,
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
): Promise<ChartPoint[]> {
  if (range === "day") return fetchYahooIntraday(symbol, asOf);

  const yahooFinance = getYahoo();
  const ticker = symbol.toUpperCase();
  const end =
    asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)
      ? new Date(`${asOf}T23:59:59-04:00`)
      : new Date();
  const start = new Date(end);
  if (range === "month") start.setDate(start.getDate() - 40);
  else start.setFullYear(start.getFullYear() - 1);

  const result = await yahooFinance.chart(ticker, {
    period1: start,
    period2: end,
    interval: range === "month" ? "1d" : "1wk",
    includePrePost: false,
  });

  return result.quotes
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

export async function fetchYahooUniverse(): Promise<StockCandidate[]> {
  const nasdaqMap = await fetchNasdaqQuoteMap(1500);
  const extraLiquid = [...nasdaqMap.values()]
    .filter((row) => (row.marketCap ?? 0) >= 8_000_000_000)
    .map((row) => row.symbol);
  const symbols = Array.from(
    new Set([...YAHOO_SCAN_UNIVERSE, ...extraLiquid]),
  ).sort();

  const quotes = await fetchYahooQuotesBatch(symbols);
  const bars = new Array<{ ohlcv: OHLCVBar[]; yearCloses: OHLCVBar[] } | null>(
    symbols.length,
  ).fill(null);
  let cursor = 0;
  const workers = 8;

  async function worker() {
    while (cursor < symbols.length) {
      const index = cursor++;
      const symbol = symbols[index];
      try {
        bars[index] = await fetchYahooDailyBars(symbol);
      } catch (error) {
        console.warn(`Skipping ${symbol} chart:`, error);
      }
      await sleep(20);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));

  const drafted = symbols
    .map((symbol, index) => {
      const series = bars[index];
      if (!series || series.ohlcv.length < 5) return null;
      return candidateFromQuote(
        symbol,
        quotes.get(symbol),
        nasdaqMap.get(symbol),
        series.ohlcv,
        series.yearCloses,
        [],
      );
    })
    .filter((candidate): candidate is StockCandidate => candidate != null);

  const newsTargets = Array.from(
    new Set([
      ...[...drafted]
        .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))
        .slice(0, 40)
        .map((candidate) => candidate.symbol),
      ...sectorNewsSymbols(drafted, 4),
    ]),
  );

  const headlinesBySymbol = new Map<string, NewsHeadline[]>();
  await Promise.all(
    newsTargets.map(async (symbol) => {
      headlinesBySymbol.set(symbol, await fetchYahooNews(symbol, 5));
    }),
  );

  return drafted.map((candidate) => ({
    ...candidate,
    headlines: headlinesBySymbol.get(candidate.symbol) ?? [],
  }));
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
      const tickers = item.relatedTickers?.length
        ? ` Tickers: ${item.relatedTickers.slice(0, 4).join(", ")}.`
        : "";
      return {
        title,
        region: regionFromText(`${title} ${item.publisher ?? ""}`),
        impact: impactFromText(title),
        summary: `${publicPublisher(item.publisher)}.${tickers}`.slice(0, 280),
        date: toIso(item.providerPublishTime).slice(0, 10),
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
