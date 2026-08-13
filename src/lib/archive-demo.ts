import type {
  CompanyReport,
  DailySnapshot,
  MarketMover,
  OHLCVBar,
  ScreenedStock,
  StockCandidate,
} from "@/types";
import { DISCLAIMER, METHODOLOGY_NOTE } from "@/lib/demo-data";

export const ARCHIVE_DEMO_DATE = "2026-08-12";

function bars(close: number, changePercent: number): OHLCVBar[] {
  const out: OHLCVBar[] = [];
  let price = close / (1 + changePercent / 100);
  const cursor = new Date(`${ARCHIVE_DEMO_DATE}T20:00:00.000Z`);
  for (let i = 0; i < 40; i += 1) {
    const day = new Date(cursor);
    day.setUTCDate(cursor.getUTCDate() - (39 - i));
    const iso = day.toISOString().slice(0, 10);
    const open = price;
    const drift = i === 39 ? changePercent / 100 : (Math.sin(i / 4) * 0.008);
    const next = open * (1 + drift);
    const high = Math.max(open, next) * 1.004;
    const low = Math.min(open, next) * 0.996;
    out.push({
      date: iso,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +next.toFixed(2),
      volume: 12_000_000 + i * 80_000,
    });
    price = next;
  }
  out[out.length - 1].close = close;
  return out;
}

function report(symbol: string, name: string, note: string): CompanyReport {
  return {
    symbol,
    name,
    shortTermOutlook: note,
    longTermOutlook: `${name} remains a core large-cap in the Aug 12 research tape.`,
    recentEvents: [
      "Aug 12 session: pretend archive tape for admin rewind testing.",
      "No live vendor pull — this snapshot is seeded so the calendar has a prior day.",
    ],
    upsideDrivers: ["Mean-reversion after the session’s tape", "Large-cap liquidity"],
    downsideRisks: ["Macro headline risk", "This day is sample research, not a live close"],
    cultureAndLongTerm: "Educational sample write-up for the archive calendar.",
    fullReport: `${name} (${symbol}) was flagged on the August 12, 2026 research desk. ${note} This is seeded archive data so an admin can rewind the site when no prior live snapshot exists.`,
  };
}

function candidate(input: {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  changePercent: number;
  score: number;
  shortTerm: number;
  longTerm: number;
}): StockCandidate {
  const ohlcv = bars(input.price, input.changePercent);
  const open = ohlcv[ohlcv.length - 1].open;
  return {
    symbol: input.symbol,
    name: input.name,
    sector: input.sector,
    industry: input.industry,
    price: input.price,
    change: +(input.price - open).toFixed(2),
    changePercent: input.changePercent,
    volume: 18_400_000,
    fundamentals: {
      peRatio: 28.4,
      beta: 1.12,
      eps: 6.4,
      marketCap: 900_000_000_000,
      avgVolume: 16_000_000,
      shortInterestPct: 1.8,
    },
    ohlcv,
    headlines: [
      {
        headline: `${input.name} on the Aug 12 pretend research tape`,
        source: "TVM Archive",
        datetime: `${ARCHIVE_DEMO_DATE}T20:15:00.000Z`,
      },
    ],
    newsClassification: {
      cause: "sector_market_wide",
      confidence: "medium",
      summary: "Seeded archive session — sector tape, not a live headline pull.",
    },
    signals: [
      {
        strategyId: "oversold_technical",
        strategyName: "Oversold technical indicators",
        triggered: input.changePercent < 0,
        score: input.changePercent < 0 ? 11 : 4,
        maxScore: 14,
        detail: "Archive demo signal for the Aug 12 rewind.",
      },
      {
        strategyId: "relative_strength",
        strategyName: "Relative strength vs sector/market",
        triggered: input.changePercent > 0,
        score: input.changePercent > 0 ? 10 : 3,
        maxScore: 12,
        detail: "Archive demo relative-strength marker.",
      },
    ],
    compositeScore: input.score,
    maxCompositeScore: 100,
    shortTermScore: input.shortTerm,
    longTermScore: input.longTerm,
    indexMembership: ["sp500"],
  };
}

function screened(stock: StockCandidate): ScreenedStock {
  return {
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
  };
}

export function buildArchiveDemoSnapshot(): DailySnapshot {
  const amzn = candidate({
    symbol: "AMZN",
    name: "Amazon.com, Inc.",
    sector: "Consumer Cyclical",
    industry: "Internet Retail",
    price: 178.42,
    changePercent: 2.6,
    score: 88,
    shortTerm: 84,
    longTerm: 90,
  });
  const meta = candidate({
    symbol: "META",
    name: "Meta Platforms, Inc.",
    sector: "Technology",
    industry: "Internet Content",
    price: 512.18,
    changePercent: 1.9,
    score: 85,
    shortTerm: 81,
    longTerm: 87,
  });
  const jpm = candidate({
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    sector: "Financial Services",
    industry: "Banks",
    price: 204.55,
    changePercent: 0.8,
    score: 79,
    shortTerm: 72,
    longTerm: 83,
  });
  const tsla = candidate({
    symbol: "TSLA",
    name: "Tesla, Inc.",
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
    price: 241.3,
    changePercent: 6.4,
    score: 61,
    shortTerm: 70,
    longTerm: 54,
  });
  const nvda = candidate({
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Technology",
    industry: "Semiconductors",
    price: 118.2,
    changePercent: -3.1,
    score: 74,
    shortTerm: 69,
    longTerm: 80,
  });
  const aapl = candidate({
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    industry: "Consumer Electronics",
    price: 227.15,
    changePercent: -1.2,
    score: 71,
    shortTerm: 66,
    longTerm: 78,
  });

  const pool = [amzn, meta, jpm, tsla, nvda, aapl];
  const topPicks = [amzn, meta, jpm];
  const topMovers: MarketMover[] = [tsla, nvda, meta, aapl, amzn, jpm].map((stock) => ({
    ...stock,
    direction: stock.changePercent >= 0 ? ("gainer" as const) : ("loser" as const),
  }));

  return {
    id: ARCHIVE_DEMO_DATE,
    date: ARCHIVE_DEMO_DATE,
    generatedAt: `${ARCHIVE_DEMO_DATE}T21:15:00.000Z`,
    dataMode: "demo",
    scanUniverse: { sp500: 6, dow30: 4, combined: 6 },
    screenedStocks: pool.map(screened),
    topMovers,
    topPicks,
    shortTermPicks: [tsla, amzn, meta],
    longTermPicks: [amzn, jpm, meta],
    reports: [
      report("AMZN", "Amazon.com, Inc.", "Retail and cloud names led the Aug 12 sample tape."),
      report("META", "Meta Platforms, Inc.", "Platform software held up while chips lagged."),
      report("JPM", "JPMorgan Chase & Co.", "Financials were the quiet relative-strength sleeve."),
    ],
    shortTermReports: [
      report("TSLA", "Tesla, Inc.", "Largest percentage gainer on the seeded Aug 12 movers list."),
    ],
    longTermReports: [
      report("AMZN", "Amazon.com, Inc.", "Highest composite on the seeded long-term sleeve."),
    ],
    marketEvents: [
      {
        title: "Aug 12 archive tape (seeded)",
        region: "US",
        impact: "mixed",
        summary:
          "This is pretend research for August 12, 2026 so the archive calendar can rewind the desk. Top flags were AMZN, META, and JPM. TSLA led movers.",
        date: ARCHIVE_DEMO_DATE,
      },
      {
        title: "Chip names cooled vs software",
        region: "Tech",
        impact: "bearish",
        summary:
          "On the sample tape, NVDA printed red while META held a modest gain — the opposite mix from a typical live NVIDIA-led session.",
        date: ARCHIVE_DEMO_DATE,
      },
    ],
    sectorDives: [
      {
        id: "tech",
        sector: "Technology",
        title: "Tech Sector Deep Dive",
        subtitle: "Seeded Aug 12 tape — software ahead of semiconductors.",
        body: "Archive demo: META held up, NVDA did not. Use this day to confirm the rewind is not today’s live snapshot.",
      },
      {
        id: "financials",
        sector: "Financial Services",
        title: "Financials Deep Dive",
        subtitle: "JPM as the quiet long-term flag.",
        body: "Archive demo: banks were the third flagged name on August 12.",
      },
    ],
    techSectorAnalysis:
      "August 12, 2026 (seeded archive): software outperformed chips on this pretend tape. NVIDIA is a loser here on purpose so a rewind is obvious next to a live session.",
    methodologyNote: METHODOLOGY_NOTE,
    disclaimer: DISCLAIMER,
  };
}

export function mergeArchiveDates(dates: string[]) {
  const merged = new Set(dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)));
  merged.add(ARCHIVE_DEMO_DATE);
  return [...merged].sort().reverse();
}
