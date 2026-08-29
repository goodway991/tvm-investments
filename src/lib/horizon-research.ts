import type { PlanId } from "@/lib/plans";
import {
  MAX_DAILY_DRIFT,
  type HorizonStats,
} from "@/lib/horizon-forecast";
import { analyzeStock } from "@/lib/scoring";
import type { StockCandidate } from "@/types";

export const SECTOR_ETFS: Record<string, string> = {
  "Communication Services": "XLC",
  "Consumer Discretionary": "XLY",
  "Consumer Staples": "XLP",
  Energy: "XLE",
  Financials: "XLF",
  "Health Care": "XLV",
  Industrials: "XLI",
  "Information Technology": "XLK",
  Materials: "XLB",
  "Real Estate": "XLRE",
  Utilities: "XLU",
};

export function sectorEtfSymbol(sector: string) {
  return SECTOR_ETFS[sector] ?? "SPY";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function periodReturnPct(closes: number[], days: number) {
  if (closes.length < days + 1) return 0;
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 1 - days];
  if (!(prev > 0) || !(last > 0)) return 0;
  return ((last - prev) / prev) * 100;
}

export function lastDayChangePct(closes: number[]) {
  return periodReturnPct(closes, 1);
}

export function researchDriftFromScore(score: number, closes: number[]) {
  const centered = clamp((score - 50) / 50, -1, 1);
  const scoreDrift = centered * 0.008;
  const momentum = clamp(periodReturnPct(closes, 5) / 100 / 8, -0.004, 0.004);
  return clamp(scoreDrift * 0.78 + momentum * 0.22, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT);
}

export async function researchHorizonRead(input: {
  stock: StockCandidate;
  sectorChangePercent: number;
  marketChangePercent: number;
  sectorEtf: string;
  useLlm: boolean;
}): Promise<{ dailyDrift: number; score: number; note: string }> {
  const analyzed = await analyzeStock(
    input.stock,
    input.sectorChangePercent,
    input.marketChangePercent,
    input.useLlm,
  );
  const closes = analyzed.ohlcv.map((bar) => bar.close);
  const score = analyzed.shortTermScore ?? analyzed.compositeScore ?? 50;
  const dailyDrift = researchDriftFromScore(score, closes);
  const hits = (analyzed.signals ?? [])
    .filter((signal) => signal.triggered)
    .slice(0, 3)
    .map((signal) => signal.strategyName);
  const headline = analyzed.headlines[0]?.headline;
  const note = hits.length
    ? `2-week path from ${hits.join(", ")} vs ${input.sectorEtf}${
        headline ? ` · ${headline}` : ""
      }.`
    : `2-week path from tape, ${analyzed.sector || "sector"} (${input.sectorEtf}), and headlines.`;

  return {
    dailyDrift,
    score,
    note: note.slice(0, 220),
  };
}

export function walkResearchStats(
  stats: HorizonStats,
  researchDrift: number,
  tapeWeight: number,
): HorizonStats {
  const dailyDrift = clamp(
    stats.dailyDrift * tapeWeight + researchDrift * (1 - tapeWeight),
    -MAX_DAILY_DRIFT,
    MAX_DAILY_DRIFT,
  );
  return {
    ...stats,
    dailyDrift,
    thetaLog: dailyDrift,
    lastDelta: dailyDrift,
    rho: 0,
    kappa: 0,
    avgBlend: 0,
  };
}

export function tapeWeightForPlan(plan: PlanId) {
  if (plan === "ultra") return 0.38;
  if (plan === "pro") return 0.34;
  return 0.42;
}
