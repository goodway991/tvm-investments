import type {
  DailySnapshot,
  MarketEvent,
  MarketMover,
  OHLCVBar,
  StockCandidate,
  StockFundamentals,
} from "@/types";

function generateOHLCV(
  basePrice: number,
  tradingDays: number,
  trend: "down" | "up" | "flat" = "flat",
): OHLCVBar[] {
  const bars: OHLCVBar[] = [];
  let price = basePrice * (trend === "down" ? 1.08 : trend === "up" ? 0.92 : 1);
  const cursor = new Date();
  cursor.setHours(16, 0, 0, 0);

  while (bars.length < tradingDays) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      const drift = trend === "down" ? -0.003 : trend === "up" ? 0.003 : 0;
      const noise = (Math.random() - 0.5) * 0.025;
      const close = price;
      const open = close / (1 + drift + noise);
      const high = Math.max(open, close) * (1 + Math.random() * 0.012);
      const low = Math.min(open, close) * (1 - Math.random() * 0.012);
      const volume = Math.floor(8_000_000 + Math.random() * 12_000_000);
      const stamp = new Date(cursor);

      bars.push({
        date: `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")}`,
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        volume,
      });
      price = open;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return bars.reverse();
}

const DEMO_STOCKS: Array<{
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  changePercent: number;
  fundamentals: StockFundamentals;
  headlines: { headline: string; source: string }[];
  trend: "down" | "up" | "flat";
}> = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Technology",
    industry: "Semiconductors",
    price: 875.42,
    changePercent: -4.2,
    trend: "down",
    fundamentals: {
      peRatio: 68.5,
      beta: 1.72,
      eps: 12.78,
      marketCap: 2_150_000_000_000,
      avgVolume: 45_000_000,
      shortInterestPct: 1.2,
    },
    headlines: [
      { headline: "Semiconductor index rebalancing triggers sector-wide selloff", source: "Reuters" },
      { headline: "AI chip demand remains strong per industry survey", source: "Bloomberg" },
    ],
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    industry: "Consumer Electronics",
    price: 198.76,
    changePercent: -1.8,
    trend: "flat",
    fundamentals: {
      peRatio: 31.2,
      beta: 1.24,
      eps: 6.37,
      marketCap: 3_050_000_000_000,
      avgVolume: 52_000_000,
      shortInterestPct: 0.8,
    },
    headlines: [
      { headline: "Apple outperforms tech peers amid broad Nasdaq weakness", source: "CNBC" },
      { headline: "Analyst reiterates buy rating ahead of product event", source: "MarketWatch" },
    ],
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
    price: 242.18,
    changePercent: -6.1,
    trend: "down",
    fundamentals: {
      peRatio: 62.1,
      beta: 2.05,
      eps: 3.9,
      marketCap: 770_000_000_000,
      avgVolume: 98_000_000,
      shortInterestPct: 3.1,
    },
    headlines: [
      { headline: "EV sector pressured as competitor cuts prices", source: "Reuters" },
      { headline: "Tesla sympathy move on sector news, no company update", source: "News" },
    ],
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    sector: "Communication Services",
    industry: "Internet Content",
    price: 512.33,
    changePercent: 2.4,
    trend: "up",
    fundamentals: {
      peRatio: 27.8,
      beta: 1.28,
      eps: 18.42,
      marketCap: 1_320_000_000_000,
      avgVolume: 14_000_000,
      shortInterestPct: 1.0,
    },
    headlines: [
      { headline: "Meta beats revenue estimates in latest quarter", source: "Bloomberg" },
      { headline: "Analyst upgrade cites AI monetization progress", source: "Barron's" },
    ],
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    sector: "Financial Services",
    industry: "Banks",
    price: 198.55,
    changePercent: -0.9,
    trend: "flat",
    fundamentals: {
      peRatio: 11.4,
      beta: 1.08,
      eps: 17.4,
      marketCap: 570_000_000_000,
      avgVolume: 9_500_000,
      shortInterestPct: 0.9,
    },
    headlines: [
      { headline: "Fed minutes signal higher-for-longer rates", source: "WSJ" },
      { headline: "Bank stocks mixed after CPI print", source: "Reuters" },
    ],
  },
  {
    symbol: "PFE",
    name: "Pfizer Inc.",
    sector: "Healthcare",
    industry: "Drug Manufacturers",
    price: 27.84,
    changePercent: -3.5,
    trend: "down",
    fundamentals: {
      peRatio: 48.2,
      beta: 0.62,
      eps: 0.58,
      marketCap: 157_000_000_000,
      avgVolume: 28_000_000,
      shortInterestPct: 2.4,
    },
    headlines: [
      { headline: "Healthcare sector drifts lower on policy headlines", source: "Reuters" },
      { headline: "No Pfizer-specific clinical setback reported", source: "FiercePharma" },
    ],
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    sector: "Technology",
    industry: "Semiconductors",
    price: 156.22,
    changePercent: -5.3,
    trend: "down",
    fundamentals: {
      peRatio: 45.6,
      beta: 1.85,
      eps: 3.42,
      marketCap: 252_000_000_000,
      avgVolume: 42_000_000,
      shortInterestPct: 2.8,
    },
    headlines: [
      { headline: "Chip stocks fall on index rebalancing flows", source: "CNBC" },
      { headline: "AMD data center revenue growth cited by bulls", source: "Seeking Alpha" },
    ],
  },
  {
    symbol: "NFLX",
    name: "Netflix Inc.",
    sector: "Communication Services",
    industry: "Entertainment",
    price: 628.45,
    changePercent: 3.8,
    trend: "up",
    fundamentals: {
      peRatio: 44.2,
      beta: 1.35,
      eps: 14.21,
      marketCap: 270_000_000_000,
      avgVolume: 3_200_000,
      shortInterestPct: 1.6,
    },
    headlines: [
      { headline: "Netflix subscriber beat drives shares higher", source: "Bloomberg" },
      { headline: "Streaming sector rallies on Netflix results", source: "Variety" },
    ],
  },
  {
    symbol: "BA",
    name: "Boeing Company",
    sector: "Industrials",
    industry: "Aerospace & Defense",
    price: 178.92,
    changePercent: -2.1,
    trend: "down",
    fundamentals: {
      peRatio: null,
      beta: 1.42,
      eps: -3.67,
      marketCap: 110_000_000_000,
      avgVolume: 7_800_000,
      shortInterestPct: 4.2,
    },
    headlines: [
      { headline: "Boeing faces new production scrutiny", source: "Reuters" },
      { headline: "Airline orders remain stable per industry data", source: "Aviation Week" },
    ],
  },
  {
    symbol: "COIN",
    name: "Coinbase Global",
    sector: "Financial Services",
    industry: "Capital Markets",
    price: 245.67,
    changePercent: 8.2,
    trend: "up",
    fundamentals: {
      peRatio: 28.5,
      beta: 2.45,
      eps: 8.62,
      marketCap: 62_000_000_000,
      avgVolume: 11_000_000,
      shortInterestPct: 18.5,
    },
    headlines: [
      { headline: "Bitcoin rally lifts crypto-related stocks", source: "CoinDesk" },
      { headline: "Coinbase volume spikes on institutional inflows", source: "Bloomberg" },
    ],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    sector: "Technology",
    industry: "Software",
    price: 415.88,
    changePercent: -2.5,
    trend: "flat",
    fundamentals: {
      peRatio: 35.1,
      beta: 0.92,
      eps: 11.85,
      marketCap: 3_090_000_000_000,
      avgVolume: 22_000_000,
      shortInterestPct: 0.7,
    },
    headlines: [
      { headline: "Cloud software names slip on rate concerns", source: "CNBC" },
      { headline: "Microsoft Azure growth in line with expectations", source: "TechCrunch" },
    ],
  },
  {
    symbol: "RIVN",
    name: "Rivian Automotive",
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
    price: 11.42,
    changePercent: -7.8,
    trend: "down",
    fundamentals: {
      peRatio: null,
      beta: 2.1,
      eps: -5.42,
      marketCap: 11_000_000_000,
      avgVolume: 18_000_000,
      shortInterestPct: 22.3,
    },
    headlines: [
      { headline: "EV makers sell off on tariff headline", source: "Reuters" },
      { headline: "Rivian production ramp on track per company blog", source: "Electrek" },
    ],
  },
];

export function buildDemoCandidates(): StockCandidate[] {
  const now = new Date().toISOString();

  return DEMO_STOCKS.map((s) => {
    const ohlcv = generateOHLCV(s.price, 252, s.trend);
    const last = ohlcv[ohlcv.length - 1];
    last.close = s.price;
    last.open = s.price / (1 + s.changePercent / 100);
    last.high = Math.max(last.open, last.close) * 1.01;
    last.low = Math.min(last.open, last.close) * 0.99;

    const change = s.price - last.open;
    const volume = Math.floor(
      (s.fundamentals.avgVolume ?? 10_000_000) *
        (Math.abs(s.changePercent) > 4 ? 0.55 : 1.1)
    );

    return {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      industry: s.industry,
      price: s.price,
      change,
      changePercent: s.changePercent,
      volume,
      fundamentals: s.fundamentals,
      ohlcv,
      yearCloses: ohlcv.filter((bar, index, bars) => {
        const month = bar.date.slice(0, 7);
        const next = bars[index + 1];
        return !next || next.date.slice(0, 7) !== month;
      }).slice(-12),
      headlines: s.headlines.map((h) => ({
        ...h,
        datetime: now,
      })),
      signals: [],
      compositeScore: 0,
      maxCompositeScore: 100,
    };
  });
}

export const DEMO_MARKET_EVENTS: MarketEvent[] = [
  {
    title: "Fed holds rates steady, signals data-dependent path",
    region: "US",
    impact: "mixed",
    summary:
      "The Federal Reserve kept benchmark rates unchanged while emphasizing inflation progress remains uneven. Equities traded choppy as investors parsed dot-plot shifts.",
    date: new Date().toISOString().slice(0, 10),
  },
  {
    title: "CPI cools slightly, easing near-term rate hike fears",
    region: "US",
    impact: "bullish",
    summary:
      "Consumer prices rose less than expected, supporting risk assets and growth stocks. Bond yields dipped on the print.",
    date: new Date().toISOString().slice(0, 10),
  },
  {
    title: "China stimulus measures boost global commodity sentiment",
    region: "Global",
    impact: "bullish",
    summary:
      "Beijing announced targeted fiscal support for property and infrastructure, lifting mining and industrial names globally.",
    date: new Date().toISOString().slice(0, 10),
  },
  {
    title: "Middle East shipping disruptions raise oil volatility",
    region: "Global",
    impact: "bearish",
    summary:
      "Geopolitical tension along key shipping lanes pushed crude higher and pressured airlines and transport stocks.",
    date: new Date().toISOString().slice(0, 10),
  },
  {
    title: "Semiconductor index rebalancing drives sector volatility",
    region: "Tech",
    impact: "bearish",
    summary:
      "Passive fund flows from index reconstitution hit chip names disproportionately, creating sympathy moves unrelated to individual earnings.",
    date: new Date().toISOString().slice(0, 10),
  },
  {
    title: "Big Tech earnings beat estimates, AI capex in focus",
    region: "Tech",
    impact: "bullish",
    summary:
      "Mega-cap tech reported strong cloud and AI revenue, though guidance on datacenter spend sparked debate on ROI timelines.",
    date: new Date().toISOString().slice(0, 10),
  },
];

export const DEMO_TECH_ANALYSIS = `
The technology sector closed mixed today, with semiconductors underperforming software by roughly 2.5 percentage points. The primary driver was index rebalancing flows that disproportionately hit high-beta chip names — a classic setup for sympathy-driven dips rather than fundamental repricing.

**Relative strength leaders:** Apple and Microsoft declined less than the SOX semiconductor index, suggesting institutional preference for quality mega-cap tech during volatility. Meta and Netflix outperformed on company-specific positive catalysts (earnings beat, subscriber growth).

**Oversold watchlist:** AMD and NVIDIA both saw RSI approach oversold territory on low relative volume, fitting criteria for potential mean-reversion bounces if sector sentiment stabilizes. However, confirm that no new export-control headlines emerge before treating the move as noise.

**Catalyst calendar:** Several cloud software names report next week. Options activity data (paid tier) would improve conviction on directional bets; free-tier headline scanning flags upgrade language on Meta.

**Sector view:** Tech remains structurally supported by AI capex cycles, but near-term price action is dominated by macro (rates, CPI) and passive flow technicals. Day-traders should favor names with multi-signal composite scores; long-term investors should separate noise from names with durable earnings moats.
`.trim();

export const DISCLAIMER =
  "TVM Investments is an educational research tool. Flagged stocks are identified by quantitative heuristics and historical patterns — not investment advice. Past flagged performance does not guarantee future results. Always conduct your own due diligence and consult a licensed financial advisor before investing.";

export const METHODOLOGY_NOTE =
  "Eight weighted strategies (dip-without-fundamental-cause, oversold RSI/Bollinger, volume/momentum, support bounces, relative strength, catalysts, gap fills, short interest) combine into a composite score. Short interest and options flow use simplified or unavailable markers on free data tiers. News cause is classified via OpenAI when configured, otherwise rule-based keywords.";

export function buildDemoMovers(candidates: StockCandidate[]): MarketMover[] {
  return [...candidates]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 20)
    .map((c) => ({
      ...c,
      direction: c.changePercent >= 0 ? ("gainer" as const) : ("loser" as const),
    }));
}

export function emptySnapshot(): DailySnapshot {
  return {
    id: "",
    date: "",
    generatedAt: "",
    dataMode: "demo",
    scanUniverse: { sp500: 0, dow30: 0, combined: 0 },
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
    methodologyNote: METHODOLOGY_NOTE,
    disclaimer: DISCLAIMER,
  };
}
