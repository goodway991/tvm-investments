import type { ChartPoint } from "@/lib/chart-series";
import {
  MAX_DAILY_DRIFT,
  MAX_SIGMA,
  MIN_SIGMA,
  horizonStats,
  type HorizonStats,
} from "@/lib/horizon-forecast";
import {
  fetchYahooAnalystView,
  fetchYahooChartSeries,
  fetchYahooNews,
} from "@/lib/providers/yahoo";

const CACHE_MS = 15 * 60 * 1000;
const GEMINI_TIMEOUT_MS = 9000;
const ANALYST_YEAR_DAYS = 252;

export type LiveForecast = {
  symbol: string;
  history: ChartPoint[];
  last: number;
  dailyDrift: number;
  dailyVol: number;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cacheKey(symbol: string, asOf?: string) {
  return `${symbol}:${asOf ?? "live"}`;
}

function blendDrift(stats: HorizonStats, targetMean: number | null) {
  if (!(targetMean && targetMean > 0 && stats.last > 0)) return stats.dailyDrift;
  const analystDaily = Math.log(targetMean / stats.last) / ANALYST_YEAR_DAYS;
  return clamp(
    stats.dailyDrift * 0.65 + analystDaily * 0.35,
    -MAX_DAILY_DRIFT,
    MAX_DAILY_DRIFT,
  );
}

async function geminiShortTermDrift(input: {
  symbol: string;
  last: number;
  dailyDrift: number;
  dailyVol: number;
  targetMean: number | null;
  recommendation: string | null;
  headlines: string[];
}): Promise<{ dailyDrift: number; note: string } | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return null;

  const news =
    input.headlines.slice(0, 6).map((line) => `- ${line}`).join("\n") ||
    "- No recent headlines";
  const prompt = `Estimate an educational 10-trading-day price drift from live market data. Not advice. JSON only:
{"dailyDrift": number, "note": "one sentence"}
dailyDrift is the expected daily log return for the next 10 trading days, between -0.03 and 0.03.

${input.symbol} last close ${input.last}. Historical daily drift ${input.dailyDrift.toFixed(5)}, daily vol ${input.dailyVol.toFixed(5)}. Yahoo 12-month mean target ${input.targetMean ?? "n/a"}, recommendation ${input.recommendation ?? "n/a"}.
Headlines:
${news}`;

  const models = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
  ].filter((model, index, list): model is string => Boolean(model) && list.indexOf(model) === index);

  for (const model of models) {
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
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        },
      );
      if (!response.ok) {
        console.warn(`Gemini ${model} returned ${response.status}`);
        continue;
      }
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { dailyDrift?: unknown; note?: unknown };
      if (typeof parsed.dailyDrift !== "number" || !Number.isFinite(parsed.dailyDrift)) {
        continue;
      }
      return {
        dailyDrift: clamp(parsed.dailyDrift, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT),
        note:
          typeof parsed.note === "string" && parsed.note.trim()
            ? parsed.note.trim().slice(0, 220)
            : "Path blends recent closes with the live analyst target.",
      };
    } catch {
      continue;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

export async function buildLiveForecast(
  symbol: string,
  asOf?: string,
): Promise<LiveForecast> {
  const key = cacheKey(symbol, asOf);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const [history, analyst, headlines] = await Promise.all([
    fetchYahooChartSeries(symbol, "month", asOf),
    asOf ? Promise.resolve({
      targetMean: null,
      targetLow: null,
      targetHigh: null,
      recommendation: null,
      analystCount: null,
    }) : fetchYahooAnalystView(symbol),
    asOf ? Promise.resolve([]) : fetchYahooNews(symbol, 6),
  ]);

  const stats = horizonStats(history.map((point) => point.value));
  if (!stats) {
    throw new Error("Not enough daily closes to project this name.");
  }

  let dailyDrift = blendDrift(stats, analyst.targetMean);
  let source: LiveForecast["source"] = "yahoo";
  let note = analyst.targetMean
        ? `12-month mean target ${analyst.targetMean.toFixed(2)}${analyst.recommendation ? ` · ${analyst.recommendation.replace(/_/g, " ")}` : ""}.`
    : "Path uses recent daily drift and volatility.";

  if (!asOf) {
    try {
      const gemini = await geminiShortTermDrift({
        symbol,
        last: stats.last,
        dailyDrift,
        dailyVol: stats.dailyVol,
        targetMean: analyst.targetMean,
        recommendation: analyst.recommendation,
        headlines: headlines.map((item) => `${item.headline} (${item.source})`),
      });
      if (gemini) {
        dailyDrift = gemini.dailyDrift;
        note = gemini.note;
        source = "yahoo+gemini";
      }
    } catch (error) {
      console.warn("Gemini forecast fallback:", error);
    }
  }

  const value: LiveForecast = {
    symbol,
    history,
    last: stats.last,
    dailyDrift,
    dailyVol: clamp(stats.dailyVol, MIN_SIGMA, MAX_SIGMA),
    source,
    targetMean: analyst.targetMean,
    targetLow: analyst.targetLow,
    targetHigh: analyst.targetHigh,
    recommendation: analyst.recommendation,
    analystCount: analyst.analystCount,
    note,
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
