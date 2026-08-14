import type { MarketEvent, NewsHeadline, OHLCVBar, StockCandidate } from "@/types";
import { YAHOO_SCAN_UNIVERSE } from "./yahoo";

const FINNHUB = "https://finnhub.io/api/v1";

function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY not configured");
  return key;
}

async function finnhubGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FINNHUB}${path}`);
  url.searchParams.set("token", apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchLiveUniverse(): Promise<StockCandidate[]> {
  const candidates: StockCandidate[] = [];

  for (const symbol of YAHOO_SCAN_UNIVERSE.slice(0, 20)) {
    try {
      const [quote, profile, candles, news, metrics] = await Promise.all([
        finnhubGet<{ c: number; d: number; dp: number }>("/quote", { symbol }),
        finnhubGet<{ name: string; finnhubIndustry: string; marketCapitalization: number }>(
          "/stock/profile2",
          { symbol }
        ),
        finnhubGet<{ o: number[]; h: number[]; l: number[]; c: number[]; v: number[]; t: number[] }>(
          "/stock/candle",
          { symbol, resolution: "D", from: String(Math.floor(Date.now() / 1000) - 86400 * 120), to: String(Math.floor(Date.now() / 1000)) }
        ),
        finnhubGet<Array<{ headline: string; source: string; datetime: number; url: string }>>(
          "/company-news",
          { symbol, from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) }
        ),
        finnhubGet<{ metric: Record<string, number> }>("/stock/metric", { symbol, metric: "all" }),
      ]);

      const ohlcv: OHLCVBar[] = (candles.t ?? []).map((t, i) => ({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        open: candles.o[i],
        high: candles.h[i],
        low: candles.l[i],
        close: candles.c[i],
        volume: candles.v[i],
      }));

      const headlines: NewsHeadline[] = (news ?? []).slice(0, 6).map((n) => ({
        headline: n.headline,
        source: n.source,
        datetime: new Date(n.datetime * 1000).toISOString(),
        url: n.url,
      }));

      const m = metrics?.metric ?? {};

      candidates.push({
        symbol,
        name: profile?.name ?? symbol,
        sector: inferSector(profile?.finnhubIndustry ?? ""),
        industry: profile?.finnhubIndustry ?? "Unknown",
        price: quote.c,
        change: quote.d,
        changePercent: quote.dp,
        volume: ohlcv[ohlcv.length - 1]?.volume ?? 0,
        fundamentals: {
          peRatio: m.peBasicExclExtraTTM ?? null,
          beta: m.beta ?? null,
          eps: m.epsBasicExclExtraItemsTTM ?? null,
          marketCap: profile?.marketCapitalization
            ? profile.marketCapitalization * 1_000_000
            : null,
          avgVolume: m["10DayAverageTradingVolume"] ?? null,
          shortInterestPct: null,
        },
        ohlcv,
        headlines,
        signals: [],
        compositeScore: 0,
        maxCompositeScore: 100,
      });
    } catch (e) {
      console.warn(`Skipping ${symbol}:`, e);
    }
  }

  return candidates;
}

function inferSector(industry: string): string {
  const lower = industry.toLowerCase();
  if (lower.includes("semiconductor") || lower.includes("software") || lower.includes("technology"))
    return "Technology";
  if (lower.includes("bank") || lower.includes("financial")) return "Financial Services";
  if (lower.includes("health") || lower.includes("pharma")) return "Healthcare";
  if (lower.includes("auto") || lower.includes("retail")) return "Consumer Cyclical";
  return "Other";
}

export async function fetchMarketEvents(): Promise<MarketEvent[]> {
  try {
    const news = await finnhubGet<Array<{ headline: string; summary: string; datetime: number }>>(
      "/news",
      { category: "general" }
    );

    return (news ?? []).slice(0, 6).map((n) => ({
      title: n.headline,
      region: n.headline.toLowerCase().includes("fed") || n.headline.toLowerCase().includes("u.s")
        ? ("US" as const)
        : ("Global" as const),
      impact: "mixed" as const,
      summary: n.summary?.slice(0, 220) ?? n.headline,
      detail: n.summary || n.headline,
      source: "Market wire",
      date: new Date(n.datetime * 1000).toISOString().slice(0, 10),
    }));
  } catch {
    const { DEMO_MARKET_EVENTS } = await import("../demo-data");
    return DEMO_MARKET_EVENTS;
  }
}

export async function fetchTechAnalysis(): Promise<string> {
  try {
    const news = await finnhubGet<Array<{ headline: string; summary: string }>>("/news", {
      category: "technology",
    });
    const bullets = (news ?? [])
      .slice(0, 5)
      .map((n) => `- ${n.headline}`)
      .join("\n");
    return `Tech sector headlines today:\n${bullets}\n\nComposite screener favors names with sympathy dips and oversold RSI on low volume.`;
  } catch {
    const { DEMO_TECH_ANALYSIS } = await import("../demo-data");
    return DEMO_TECH_ANALYSIS;
  }
}
