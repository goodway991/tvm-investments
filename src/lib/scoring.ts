import type {
  NewsClassification,
  NewsHeadline,
  StockCandidate,
  StrategyId,
  StrategySignal,
} from "@/types";
import {
  LONG_TERM_WEIGHTS,
  SHORT_TERM_WEIGHTS,
  STRATEGY_NAMES,
  STRATEGY_WEIGHTS,
} from "@/types";
import {
  averageVolume,
  computeBollingerBands,
  computeRSI,
  detectGapDown,
  findSupportLevel,
} from "./indicators";

const KEYWORDS_COMPANY_BAD = [
  "earnings miss",
  "guidance cut",
  "lawsuit",
  "fraud",
  "accounting",
  "scandal",
  "ceo resign",
  "recall",
  "fda rejection",
  "bankruptcy",
  "downgrade",
];

const KEYWORDS_SECTOR_MARKET = [
  "fed",
  "interest rate",
  "sector",
  "market selloff",
  "index",
  "rebalancing",
  "sympathy",
  "tariff",
  "inflation",
  "jobs report",
  "cpi",
];

export function classifyNewsRules(
  headlines: NewsHeadline[]
): NewsClassification {
  const text = headlines.map((h) => h.headline.toLowerCase()).join(" ");

  const companyHits = KEYWORDS_COMPANY_BAD.filter((k) => text.includes(k)).length;
  const sectorHits = KEYWORDS_SECTOR_MARKET.filter((k) => text.includes(k)).length;

  if (companyHits >= 2) {
    return {
      cause: "company_specific",
      confidence: companyHits >= 3 ? "high" : "medium",
      summary:
        "Headlines suggest company-specific issues (earnings, guidance, or governance).",
    };
  }

  if (sectorHits >= 1 && companyHits === 0) {
    return {
      cause: "sector_market_wide",
      confidence: sectorHits >= 2 ? "high" : "medium",
      summary:
        "News appears driven by sector-wide or macro factors rather than company-specific problems.",
    };
  }

  return {
    cause: "no_clear_cause",
    confidence: "low",
    summary: "No strong company-specific negative catalyst identified in recent headlines.",
  };
}

export function hasNewsLlm(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.OPENAI_API_KEY,
  );
}

export async function classifyNewsWithLLM(
  symbol: string,
  headlines: NewsHeadline[]
): Promise<NewsClassification> {
  if (headlines.length === 0) {
    return classifyNewsRules(headlines);
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    const { default: OpenAI } = await import("openai");
    const openai = geminiKey
      ? new OpenAI({
          apiKey: geminiKey,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        })
      : openaiKey
        ? new OpenAI({ apiKey: openaiKey })
        : null;

    if (!openai) return classifyNewsRules(headlines);

    const model = geminiKey
      ? process.env.GEMINI_MODEL || "gemini-2.5-flash"
      : "gpt-4o-mini";

    const headlineText = headlines
      .slice(0, 8)
      .map((h) => `- ${h.headline} (${h.source})`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You classify stock news causes for trading research. Respond JSON only:
{"cause":"company_specific"|"sector_market_wide"|"no_clear_cause","confidence":"high"|"medium"|"low","summary":"one sentence"}`,
        },
        {
          role: "user",
          content: `Classify news for ${symbol}:\n${headlineText}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return classifyNewsRules(headlines);

    const parsed = JSON.parse(raw) as NewsClassification;
    if (
      ["company_specific", "sector_market_wide", "no_clear_cause"].includes(
        parsed.cause
      )
    ) {
      return parsed;
    }
    return classifyNewsRules(headlines);
  } catch (error) {
    console.error("News LLM classification failed:", error);
    return classifyNewsRules(headlines);
  }
}

function evaluateStrategies(
  stock: StockCandidate,
  sectorChangePercent: number,
  marketChangePercent: number
): StrategySignal[] {
  const closes = stock.ohlcv.map((b) => b.close);
  const rsi = computeRSI(closes);
  const bb = computeBollingerBands(closes);
  const support = findSupportLevel(stock.ohlcv);
  const gap = detectGapDown(stock.ohlcv);
  const avgVol = averageVolume(stock.ohlcv);
  const todayVol = stock.volume;
  const news = stock.newsClassification ?? classifyNewsRules(stock.headlines);

  const signals: StrategySignal[] = [];

  // 1. Dip with no fundamental cause
  const dipTriggered =
    stock.changePercent < -2 &&
    (news.cause === "sector_market_wide" || news.cause === "no_clear_cause");
  signals.push({
    strategyId: "dip_no_fundamental",
    strategyName: STRATEGY_NAMES.dip_no_fundamental,
    triggered: dipTriggered,
    score: dipTriggered
      ? news.cause === "no_clear_cause"
        ? 90
        : 75
      : news.cause === "company_specific"
        ? 10
        : 30,
    maxScore: 100,
    detail: dipTriggered
      ? `Down ${stock.changePercent.toFixed(1)}% with ${news.cause.replace(/_/g, " ")} news (${news.confidence} confidence).`
      : news.cause === "company_specific"
        ? "Drop may reflect real company-specific repricing."
        : "No qualifying dip setup today.",
  });

  // 2. Oversold technical
  const rsiOversold = rsi !== null && rsi < 30;
  const atLowerBB = bb !== null && stock.price <= bb.lower * 1.01;
  const oversoldTriggered = rsiOversold || atLowerBB;
  signals.push({
    strategyId: "oversold_technical",
    strategyName: STRATEGY_NAMES.oversold_technical,
    triggered: oversoldTriggered,
    score: oversoldTriggered
      ? rsiOversold && atLowerBB
        ? 95
        : rsiOversold
          ? 80
          : 70
      : rsi !== null
        ? Math.max(0, 50 - rsi)
        : 20,
    maxScore: 100,
    detail: rsi !== null
      ? `RSI ${rsi.toFixed(1)}${bb ? `, price vs lower BB: ${((stock.price / bb.lower - 1) * 100).toFixed(1)}%` : ""}.`
      : "Insufficient history for RSI.",
  });

  // 3. Volume & momentum
  const volRatio = avgVol > 0 ? todayVol / avgVol : 1;
  const lowVolDrop = stock.changePercent < 0 && volRatio < 0.7;
  const highVolDrop = stock.changePercent < 0 && volRatio > 1.5;
  signals.push({
    strategyId: "volume_momentum",
    strategyName: STRATEGY_NAMES.volume_momentum,
    triggered: lowVolDrop,
    score: lowVolDrop ? 85 : highVolDrop ? 25 : 50,
    maxScore: 100,
    detail: `Volume ${(volRatio * 100).toFixed(0)}% of 20-day avg on a ${stock.changePercent >= 0 ? "gain" : "decline"}.`,
  });

  // 4. Support bounce
  const nearSupport =
    support !== null && Math.abs(stock.price - support) / support < 0.02;
  signals.push({
    strategyId: "support_bounce",
    strategyName: STRATEGY_NAMES.support_bounce,
    triggered: nearSupport,
    score: nearSupport ? 88 : support ? 45 : 20,
    maxScore: 100,
    detail: support
      ? nearSupport
        ? `Price $${stock.price.toFixed(2)} near support $${support.toFixed(2)}.`
        : `Support at $${support.toFixed(2)} (${(((stock.price - support) / support) * 100).toFixed(1)}% away).`
      : "No clear historical support identified.",
  });

  // 5. Relative strength
  const vsSector = stock.changePercent - sectorChangePercent;
  const vsMarket = stock.changePercent - marketChangePercent;
  const outperforming = vsSector > 1 || (stock.changePercent > 0 && sectorChangePercent < -1);
  const underperforming = vsSector < -2;
  signals.push({
    strategyId: "relative_strength",
    strategyName: STRATEGY_NAMES.relative_strength,
    triggered: outperforming || underperforming,
    score: outperforming
      ? 82
      : underperforming
        ? 65
        : 40,
    maxScore: 100,
    detail: `Stock ${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(1)}% vs sector ${sectorChangePercent >= 0 ? "+" : ""}${sectorChangePercent.toFixed(1)}% (${vsSector >= 0 ? "+" : ""}${vsSector.toFixed(1)}% relative) and market (${vsMarket >= 0 ? "+" : ""}${vsMarket.toFixed(1)}% relative).`,
  });

  // 6. Catalyst upside
  const catalystKeywords = ["beat", "approval", "contract", "upgrade", "insider buying"];
  const headlineText = stock.headlines.map((h) => h.headline.toLowerCase()).join(" ");
  const hasCatalyst = catalystKeywords.some((k) => headlineText.includes(k));
  signals.push({
    strategyId: "catalyst_upside",
    strategyName: STRATEGY_NAMES.catalyst_upside,
    triggered: hasCatalyst,
    score: hasCatalyst ? 78 : 25,
    maxScore: 100,
    detail: hasCatalyst
      ? "Positive catalyst keywords detected in recent headlines."
      : "Options flow unavailable on free tier; headline catalyst scan only.",
  });

  // 7. Gap fill
  const gapTriggered = gap?.hasGap ?? false;
  signals.push({
    strategyId: "gap_fill",
    strategyName: STRATEGY_NAMES.gap_fill,
    triggered: gapTriggered && news.cause !== "company_specific",
    score:
      gapTriggered && news.cause !== "company_specific"
        ? 80
        : gapTriggered
          ? 30
          : 20,
    maxScore: 100,
    detail: gap
      ? gap.hasGap
        ? `Gap down ${gap.gapPercent.toFixed(1)}% from prior close $${gap.prevClose.toFixed(2)}.`
        : "No significant gap down at open."
      : "Insufficient data for gap detection.",
  });

  // 8. Short squeeze — limited on free tier
  const shortPct = stock.fundamentals.shortInterestPct;
  const squeezeTriggered = shortPct !== null && shortPct > 15 && stock.changePercent > 2;
  signals.push({
    strategyId: "short_squeeze",
    strategyName: STRATEGY_NAMES.short_squeeze,
    triggered: squeezeTriggered,
    score: squeezeTriggered ? 70 : shortPct !== null ? (shortPct > 10 ? 40 : 20) : 0,
    maxScore: 100,
    detail:
      shortPct !== null
        ? `Short interest ~${shortPct.toFixed(1)}% (FINRA biweekly; may be stale).`
        : "Short interest data unavailable on free tier — Ortex/FINRA required for live accuracy.",
    unavailable: shortPct === null,
  });

  return signals;
}

function computeWeightedScore(
  signals: StrategySignal[],
  weights: Record<StrategyId, number>,
): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const w = weights[signal.strategyId];
    weighted += (signal.score / signal.maxScore) * w * 100;
    totalWeight += w;
  }

  return totalWeight > 0 ? weighted / totalWeight : 0;
}

export function computeCompositeScore(signals: StrategySignal[]): number {
  return computeWeightedScore(signals, STRATEGY_WEIGHTS);
}

export async function analyzeStock(
  stock: StockCandidate,
  sectorChangePercent: number,
  marketChangePercent: number,
  useLLM = false
): Promise<StockCandidate> {
  const newsClassification = useLLM
    ? await classifyNewsWithLLM(stock.symbol, stock.headlines)
    : classifyNewsRules(stock.headlines);

  const withNews = { ...stock, newsClassification };
  const signals = evaluateStrategies(withNews, sectorChangePercent, marketChangePercent);
  const compositeScore = computeCompositeScore(signals);
  const shortTermScore = computeWeightedScore(signals, SHORT_TERM_WEIGHTS);
  const longTermScore = computeWeightedScore(signals, LONG_TERM_WEIGHTS);
  const maxCompositeScore = 100;

  return {
    ...withNews,
    signals,
    compositeScore,
    shortTermScore,
    longTermScore,
    maxCompositeScore,
  };
}

export function rankCandidates(candidates: StockCandidate[]): StockCandidate[] {
  return [...candidates]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

export function applyFilters<
  T extends { volume: number; fundamentals: import("@/types").StockFundamentals },
>(stocks: T[], filters: import("@/types").FilterCriteria): T[] {
  return stocks.filter((s) => {
    const f = s.fundamentals;
    if (filters.peMin != null && (f.peRatio == null || f.peRatio < filters.peMin)) return false;
    if (filters.peMax != null && (f.peRatio == null || f.peRatio > filters.peMax)) return false;
    if (filters.betaMin != null && (f.beta == null || f.beta < filters.betaMin)) return false;
    if (filters.betaMax != null && (f.beta == null || f.beta > filters.betaMax)) return false;
    if (filters.volumeMin != null && s.volume < filters.volumeMin) return false;
    if (filters.epsMin != null && (f.eps == null || f.eps < filters.epsMin)) return false;
    if (filters.marketCapMin != null && (f.marketCap == null || f.marketCap < filters.marketCapMin)) return false;
    if (filters.marketCapMax != null && (f.marketCap == null || f.marketCap > filters.marketCapMax)) return false;
    return true;
  });
}

export function toScreenedStock(
  stock: StockCandidate,
): import("@/types").ScreenedStock {
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

function signedPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function periodReturn(closes: number[]): number | null {
  if (closes.length < 2 || closes[0] === 0) return null;
  return ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
}

export function generateCompanyReport(stock: StockCandidate): import("@/types").CompanyReport {
  const news = stock.newsClassification;
  const rsi = computeRSI(stock.ohlcv.map((bar) => bar.close));
  const avgVol = stock.fundamentals.avgVolume;
  const volumeX = avgVol && avgVol > 0 ? stock.volume / avgVol : null;
  const monthReturn = periodReturn(stock.ohlcv.slice(-22).map((bar) => bar.close));
  const yearReturn = periodReturn((stock.yearCloses ?? stock.ohlcv).map((bar) => bar.close));
  const high = stock.fiftyTwoWeekHigh;
  const low = stock.fiftyTwoWeekLow;
  const rangePct =
    high != null && low != null && high > low
      ? ((stock.price - low) / (high - low)) * 100
      : null;
  const pe =
    stock.fundamentals.peRatio != null ? stock.fundamentals.peRatio.toFixed(1) : "n/a";
  const headlines = stock.headlines.slice(0, 4).map((item) => item.headline);
  const triggered = stock.signals.filter((signal) => signal.triggered);

  const shortTerm = [
    `Last close $${stock.price.toFixed(2)} (${signedPct(stock.changePercent)}).`,
    volumeX != null ? `Volume ${volumeX.toFixed(1)}× the 3-month average.` : null,
    rsi != null ? `14-day RSI ${rsi.toFixed(0)} from daily closes.` : null,
    monthReturn != null ? `1-month return ${signedPct(monthReturn)}.` : null,
    triggered.length
      ? `Flagged signals: ${triggered.map((signal) => signal.strategyName).join(", ")}.`
      : "No short-term screen flags on today’s tape.",
  ]
    .filter(Boolean)
    .join(" ");

  const longTerm = [
    high != null && low != null
      ? `52-week range $${low.toFixed(2)}–$${high.toFixed(2)}${
          rangePct != null ? ` (${rangePct.toFixed(0)}% of the range)` : ""
        }.`
      : null,
    `Trailing P/E ${pe}, beta ${stock.fundamentals.beta?.toFixed(2) ?? "n/a"}, EPS ${
      stock.fundamentals.eps != null ? `$${stock.fundamentals.eps.toFixed(2)}` : "n/a"
    }.`,
    yearReturn != null ? `12-month return ${signedPct(yearReturn)}.` : null,
    stock.fundamentals.marketCap
      ? `Market cap $${(stock.fundamentals.marketCap / 1e9).toFixed(1)}B.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const upsideDrivers = [
    ...triggered.filter((signal) => signal.score >= 60).map((signal) => signal.detail),
    rsi != null && rsi < 35 ? `RSI ${rsi.toFixed(0)} is in oversold territory on daily bars.` : null,
    monthReturn != null && monthReturn < -8
      ? `1-month return ${signedPct(monthReturn)} leaves room for mean reversion if news stays sector-wide.`
      : null,
    headlines[0] ? `Latest headline: ${headlines[0]}` : `Last close $${stock.price.toFixed(2)} (${signedPct(stock.changePercent)}).`,
  ].filter((item): item is string => Boolean(item));

  const downsideRisks = [
    news?.cause === "company_specific"
      ? `Headlines look company-specific: ${news.summary}`
      : news?.summary ?? null,
    stock.fundamentals.beta != null && stock.fundamentals.beta > 1.3
      ? `Beta ${stock.fundamentals.beta.toFixed(2)} — moves more than the market.`
      : null,
    rangePct != null && rangePct > 85
      ? `Last close sits near the 52-week high (${rangePct.toFixed(0)}% of the range).`
      : null,
    volumeX != null && volumeX > 1.8 && stock.changePercent < 0
      ? `Heavy volume (${volumeX.toFixed(1)}× average) on a down day.`
      : `Session move ${signedPct(stock.changePercent)} on ${stock.symbol}.`,
  ].filter((item): item is string => Boolean(item));

  const cultureAndLongTerm = stock.businessSummary
    ? stock.businessSummary
    : `${stock.name} (${stock.symbol}) is listed as ${stock.industry} in ${stock.sector}. Trailing P/E ${pe}; 12-month return ${
        yearReturn != null ? signedPct(yearReturn) : "n/a"
      }.`;

  return {
    symbol: stock.symbol,
    name: stock.name,
    shortTermOutlook: shortTerm,
    longTermOutlook: longTerm,
    recentEvents: headlines,
    upsideDrivers: upsideDrivers.slice(0, 4),
    downsideRisks: downsideRisks.slice(0, 4),
    cultureAndLongTerm,
    fullReport: buildFullReport(stock, shortTerm, longTerm, headlines),
  };
}

export async function generateProCulture(
  stock: StockCandidate,
): Promise<string | undefined> {
  if (!hasNewsLlm()) return undefined;

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!geminiKey && !openaiKey) return undefined;

  try {
    const { default: OpenAI } = await import("openai");
    const openai = geminiKey
      ? new OpenAI({
          apiKey: geminiKey,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        })
      : new OpenAI({ apiKey: openaiKey });
    const model = geminiKey
      ? process.env.GEMINI_MODEL || "gemini-2.5-flash"
      : "gpt-4o-mini";
    const headlines = stock.headlines
      .slice(0, 6)
      .map((item) => `- ${item.headline} (${item.source})`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You write educational equity research, not investment advice. Reply with 3-5 sentences only.",
        },
        {
          role: "user",
          content: `Company: ${stock.name} (${stock.symbol})
Sector/industry: ${stock.sector} / ${stock.industry}
P/E: ${stock.fundamentals.peRatio ?? "n/a"}, beta: ${stock.fundamentals.beta ?? "n/a"}
Headlines:
${headlines || "(none)"}

Describe likely company culture, capital-allocation style, and whether the name looks like a long-term hold versus a tactical trade. If headlines are thin, say so. Do not recommend buying or selling.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    return text || undefined;
  } catch (error) {
    console.error("Pro culture write-up failed:", error);
    return undefined;
  }
}

export async function buildProCultureMap(
  stocks: StockCandidate[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const stock of stocks) {
    if (map.has(stock.symbol)) continue;
    const culture = await generateProCulture(stock);
    if (culture) map.set(stock.symbol, culture);
  }
  return map;
}

export function applyProCulture(
  reports: import("@/types").CompanyReport[],
  cultureBySymbol: Map<string, string>,
): import("@/types").CompanyReport[] {
  return reports.map((report) => {
    const culture = cultureBySymbol.get(report.symbol);
    return culture ? { ...report, cultureAndLongTermPro: culture } : report;
  });
}

function buildFullReport(
  stock: StockCandidate,
  shortTerm: string,
  longTerm: string,
  headlines: string[],
): string {
  const news = stock.newsClassification;
  return `
## ${stock.name} (${stock.symbol}) — research snapshot

**Last close:** ${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}% to $${stock.price.toFixed(2)}

**Composite score:** ${stock.compositeScore.toFixed(1)} / 100
**Short-term score:** ${(stock.shortTermScore ?? stock.compositeScore).toFixed(1)} / 100
**Long-term score:** ${(stock.longTermScore ?? stock.compositeScore).toFixed(1)} / 100

### Short-term (quotes + daily bars)
${shortTerm}

### Long-term (fundamentals + 52-week range)
${longTerm}

### Headlines
${headlines.map((headline) => `- ${headline}`).join("\n") || "- None returned for this ticker"}

News classification: ${news?.cause.replace(/_/g, " ") ?? "pending"} (${news?.confidence ?? "n/a"} confidence). ${news?.summary ?? ""}

### Fundamentals
- P/E: ${stock.fundamentals.peRatio?.toFixed(1) ?? "N/A"}
- Beta: ${stock.fundamentals.beta?.toFixed(2) ?? "N/A"}
- EPS: $${stock.fundamentals.eps?.toFixed(2) ?? "N/A"}
- Market cap: ${stock.fundamentals.marketCap ? `$${(stock.fundamentals.marketCap / 1e9).toFixed(1)}B` : "N/A"}
- 52-week: ${
    stock.fiftyTwoWeekLow != null && stock.fiftyTwoWeekHigh != null
      ? `$${stock.fiftyTwoWeekLow.toFixed(2)} – $${stock.fiftyTwoWeekHigh.toFixed(2)}`
      : "N/A"
  }
`.trim();
}
