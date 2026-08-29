import type { ChartPoint } from "@/lib/chart-series";
import type { PlanId } from "@/lib/plans";
import {
  MAX_DAILY_DRIFT,
  MAX_SIGMA,
  MIN_SIGMA,
  horizonStats,
  simpleHorizonStats,
  type HorizonStats,
} from "@/lib/horizon-forecast";
import {
  lastDayChangePct,
  researchHorizonRead,
  sectorEtfSymbol,
  tapeWeightForPlan,
  walkResearchStats,
} from "@/lib/horizon-research";
import {
  DEFAULT_ADVANCED_SETTINGS,
  fitAdvancedForecast,
  ohlcvToHistory,
} from "@/lib/advanced-forecast";
import { resolveSector } from "@/lib/sector-dives";
import {
  fetchYahooAnalystView,
  fetchYahooCandidate,
  fetchYahooChartSeries,
  fetchYahooNews,
  fetchYahooOhlcvSeries,
} from "@/lib/providers/yahoo";
import type { StockCandidate } from "@/types";

const CACHE_MS = 15 * 60 * 1000;
const GEMINI_TIMEOUT_MS = 4000;
const ANALYST_YEAR_DAYS = 252;

export type LiveForecast = {
  symbol: string;
  history: ChartPoint[];
  last: number;
  dailyDrift: number;
  dailyVol: number;
  kappa: number;
  thetaLog: number;
  lastDelta: number;
  rho: number;
  avgBlend: number;
  source: "yahoo" | "yahoo+gemini";
  targetMean: number | null;
  targetLow: number | null;
  targetHigh: number | null;
  recommendation: string | null;
  analystCount: number | null;
  note: string | null;
};

type CacheEntry = { at: number; value: LiveForecast };
const cache = new Map<string, CacheEntry>();

const EMPTY_ANALYST = {
  targetMean: null as number | null,
  targetLow: null as number | null,
  targetHigh: null as number | null,
  recommendation: null as string | null,
  analystCount: null as number | null,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cacheKey(symbol: string, asOf: string | undefined, plan: PlanId) {
  return `${symbol}:${asOf ?? "live"}:${plan}`;
}

function analystDailyDrift(last: number, targetMean: number | null) {
  if (!(targetMean && targetMean > 0 && last > 0)) return 0;
  return clamp(
    Math.log(targetMean / last) / ANALYST_YEAR_DAYS,
    -MAX_DAILY_DRIFT,
    MAX_DAILY_DRIFT,
  );
}

function blendGeminiDrift(
  statistical: number,
  gemini: number,
  dailyVol: number,
) {
  const cap = Math.max(dailyVol * 1.6, 0.005);
  const bounded = clamp(gemini, statistical - cap, statistical + cap);
  return clamp(
    statistical * 0.55 + bounded * 0.45,
    -MAX_DAILY_DRIFT,
    MAX_DAILY_DRIFT,
  );
}

async function geminiShortTermDrift(input: {
  symbol: string;
  last: number;
  dailyDrift: number;
  dailyVol: number;
  sector: string;
  sectorEtf: string;
  sectorChange: number;
  marketChange: number;
  researchNote: string;
  targetMean: number | null;
  recommendation: string | null;
  headlines: string[];
}): Promise<{ dailyDrift: number; note: string } | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_MODEL?.trim();
  if (!geminiKey || !model) return null;

  const news =
    input.headlines.slice(0, 8).map((line) => `- ${line}`).join("\n") ||
    "- No recent headlines";
  const prompt = `Estimate expected daily log return for the NEXT 5 to 10 trading days. JSON only:
{"dailyDrift": number, "note": "one sentence"}
Use the stock tape, sector tape, and headlines. Do not flatten to the last close. Do not treat the 12-month analyst target as a 2-week price. Typical dailyDrift is between -0.012 and 0.012.

${input.symbol} last close ${input.last}. Research tilt ${input.dailyDrift.toFixed(5)} (daily vol ${input.dailyVol.toFixed(5)}).
Sector ${input.sector} via ${input.sectorEtf} 1-day ${input.sectorChange.toFixed(2)}%. SPY 1-day ${input.marketChange.toFixed(2)}%.
8-signal read: ${input.researchNote}
Yahoo 12-month mean target ${input.targetMean ?? "n/a"} (context only), recommendation ${input.recommendation ?? "n/a"}.
Headlines:
${news}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dailyDrift?: unknown; note?: unknown };
    if (typeof parsed.dailyDrift !== "number" || !Number.isFinite(parsed.dailyDrift)) {
      return null;
    }
    return {
      dailyDrift: clamp(parsed.dailyDrift, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT),
      note:
        typeof parsed.note === "string" && parsed.note.trim()
          ? parsed.note.trim().slice(0, 220)
          : input.researchNote,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadCandidate(symbol: string, asOf?: string): Promise<StockCandidate> {
  const ticker = symbol.toUpperCase();
  if (asOf) {
    const bars = await fetchYahooOhlcvSeries(ticker, 90, asOf);
    return emptyCandidate(ticker, bars);
  }
  try {
    return await fetchYahooCandidate(ticker);
  } catch {
    const [bars, headlines] = await Promise.all([
      fetchYahooOhlcvSeries(ticker, 90),
      fetchYahooNews(ticker, 6).catch(() => []),
    ]);
    return { ...emptyCandidate(ticker, bars), headlines };
  }
}

function emptyCandidate(symbol: string, bars: Awaited<ReturnType<typeof fetchYahooOhlcvSeries>>): StockCandidate {
  const last = bars.at(-1);
  const prev = bars.at(-2);
  const price = last?.close ?? 0;
  const prevClose = prev?.close ?? price;
  return {
    symbol,
    name: symbol,
    sector: resolveSector(symbol, "", ""),
    industry: "",
    price,
    change: price - prevClose,
    changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    volume: last?.volume ?? 0,
    fundamentals: {
      peRatio: null,
      beta: null,
      eps: null,
      marketCap: null,
      avgVolume: null,
      shortInterestPct: null,
    },
    ohlcv: bars,
    yearCloses: [],
    headlines: [],
    signals: [],
    compositeScore: 0,
    maxCompositeScore: 100,
  };
}

async function loadPeerReturns(sector: string, asOf?: string) {
  const etf = sectorEtfSymbol(sector);
  try {
    const [sectorSeries, spySeries] = await Promise.all([
      fetchYahooChartSeries(etf, "month", asOf, 16),
      etf === "SPY"
        ? Promise.resolve(null)
        : fetchYahooChartSeries("SPY", "month", asOf, 16).catch(() => null),
    ]);
    const sectorCloses = sectorSeries.map((point) => point.value);
    const marketCloses = (spySeries ?? sectorSeries).map((point) => point.value);
    return {
      etf,
      sectorChange: lastDayChangePct(sectorCloses),
      marketChange: lastDayChangePct(marketCloses),
    };
  } catch {
    return { etf, sectorChange: 0, marketChange: 0 };
  }
}

function planNote(plan: PlanId, researchNote: string, usedGemini: boolean) {
  if (plan === "ultra") {
    return usedGemini
      ? researchNote
      : `Ultra 8-signal research-read. ${researchNote}`;
  }
  if (plan === "pro") {
    return `Non-algorithm path from tape, sector, and headlines. ${researchNote}`;
  }
  return `Decent short-term path from tape, sector, and headlines. ${researchNote}`;
}

export async function buildLiveForecast(
  symbol: string,
  asOf?: string,
  plan: PlanId = "free",
): Promise<LiveForecast> {
  const key = cacheKey(symbol, asOf, plan);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const [candidate, analyst] = await Promise.all([
    loadCandidate(symbol, asOf),
    plan !== "free" && !asOf
      ? fetchYahooAnalystView(symbol).catch(() => EMPTY_ANALYST)
      : Promise.resolve(EMPTY_ANALYST),
  ]);

  const history = ohlcvToHistory(candidate.ohlcv).slice(-90);
  if (history.length < 3) {
    throw new Error("Not enough daily bars to project this name.");
  }

  const tape: HorizonStats | null =
    plan === "ultra"
      ? fitAdvancedForecast(candidate.ohlcv, DEFAULT_ADVANCED_SETTINGS)
      : plan === "pro"
        ? horizonStats(history.map((point) => point.value))
        : simpleHorizonStats(history.map((point) => point.value));
  if (!tape) {
    throw new Error("Not enough daily closes to project this name.");
  }

  const peers = await loadPeerReturns(candidate.sector, asOf);
  const research = await researchHorizonRead({
    stock: candidate,
    sectorChangePercent: peers.sectorChange,
    marketChangePercent: peers.marketChange,
    sectorEtf: peers.etf,
    useLlm: plan === "ultra" && !asOf,
  });

  let walked = walkResearchStats(
    tape,
    research.dailyDrift,
    tapeWeightForPlan(plan),
  );
  if (plan === "pro") {
    const analystDaily = analystDailyDrift(walked.last, analyst.targetMean);
    const blended = clamp(
      walked.dailyDrift * 0.88 + analystDaily * 0.12,
      -MAX_DAILY_DRIFT,
      MAX_DAILY_DRIFT,
    );
    walked = { ...walked, dailyDrift: blended, thetaLog: blended, lastDelta: blended };
  }

  let source: LiveForecast["source"] = "yahoo";
  let note = research.note;
  if (plan === "ultra" && !asOf) {
    const gemini = await geminiShortTermDrift({
      symbol,
      last: walked.last,
      dailyDrift: walked.dailyDrift,
      dailyVol: walked.dailyVol,
      sector: candidate.sector,
      sectorEtf: peers.etf,
      sectorChange: peers.sectorChange,
      marketChange: peers.marketChange,
      researchNote: research.note,
      targetMean: analyst.targetMean,
      recommendation: analyst.recommendation,
      headlines: candidate.headlines.map((item) => item.headline),
    });
    if (gemini) {
      const blended = blendGeminiDrift(
        walked.dailyDrift,
        gemini.dailyDrift,
        walked.dailyVol,
      );
      walked = { ...walked, dailyDrift: blended, thetaLog: blended, lastDelta: blended };
      note = gemini.note;
      source = "yahoo+gemini";
    }
  }

  const value: LiveForecast = {
    symbol,
    history,
    last: walked.last,
    dailyDrift: walked.dailyDrift,
    dailyVol: clamp(walked.dailyVol, MIN_SIGMA, MAX_SIGMA),
    kappa: 0,
    thetaLog: walked.thetaLog,
    lastDelta: walked.lastDelta,
    rho: 0,
    avgBlend: 0,
    source,
    targetMean: analyst.targetMean,
    targetLow: analyst.targetLow,
    targetHigh: analyst.targetHigh,
    recommendation: analyst.recommendation,
    analystCount: analyst.analystCount,
    note: planNote(plan, note, source === "yahoo+gemini").slice(0, 280),
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
