import { computeRSI } from "@/lib/indicators";
import type { DailySnapshot, OHLCVBar, ScreenedStock, StockCandidate } from "@/types";

type ScoreRow = {
  symbol: string;
  composite: number;
  peRatio: number | null;
  sector: string;
  industry: string;
  ohlcv: OHLCVBar[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function scorePe(pe: number | null): number | null {
  if (pe == null || !Number.isFinite(pe) || pe <= 0) return null;
  if (pe < 8) return 48;
  if (pe < 18) return 90;
  if (pe < 28) return 78;
  if (pe < 40) return 62;
  if (pe < 60) return 44;
  return 28;
}

function scoreRsi(rsi: number | null): number | null {
  if (rsi == null || !Number.isFinite(rsi)) return null;
  if (rsi >= 40 && rsi <= 60) return 92;
  if (rsi >= 30 && rsi < 40) return 74;
  if (rsi > 60 && rsi <= 70) return 70;
  if (rsi >= 20 && rsi < 30) return 64;
  if (rsi > 70 && rsi <= 80) return 48;
  return 32;
}

function scoreNiche(
  sector: string,
  industry: string,
  sectorCounts: Map<string, number>,
  total: number,
) {
  const niche = `${sector} ${industry}`.trim();
  const known = Boolean(sector) && sector !== "Other" && sector !== "—" && niche.length > 2;
  const share = (sectorCounts.get(sector) ?? 1) / Math.max(total, 1);
  const spread = clamp(100 - share * 55);
  return clamp((known ? 82 : 46) * 0.62 + spread * 0.38);
}

function blendStock(row: ScoreRow, sectorCounts: Map<string, number>, total: number) {
  const rsi = scoreRsi(
    row.ohlcv.length ? computeRSI(row.ohlcv.map((bar) => bar.close)) : null,
  );
  const pe = scorePe(row.peRatio);
  const niche = scoreNiche(row.sector, row.industry, sectorCounts, total);
  const parts = [
    { value: clamp(row.composite), weight: 0.5 },
    pe != null ? { value: pe, weight: 0.2 } : null,
    rsi != null ? { value: rsi, weight: 0.15 } : null,
    { value: niche, weight: 0.15 },
  ].filter((part): part is { value: number; weight: number } => Boolean(part));
  const weight = parts.reduce((sum, part) => sum + part.weight, 0);
  return parts.reduce((sum, part) => sum + (part.value * part.weight) / weight, 0);
}

function asRow(
  symbol: string,
  screened: ScreenedStock | undefined,
  quoted: StockCandidate | undefined,
): ScoreRow | null {
  const composite = quoted?.compositeScore ?? screened?.compositeScore;
  if (composite == null) return null;
  return {
    symbol,
    composite,
    peRatio: quoted?.fundamentals.peRatio ?? screened?.fundamentals.peRatio ?? null,
    sector: quoted?.sector || screened?.sector || "",
    industry: quoted?.industry || screened?.industry || "",
    ohlcv: quoted?.ohlcv ?? [],
  };
}

export function computeAccountScore({
  watchlist,
  positions,
  snapshot,
}: {
  watchlist: string[];
  positions: { symbol: string; shares: number; currentPrice: number; averageCost: number }[];
  snapshot: DailySnapshot;
}): { score: number | null; counted: number; tracked: number } {
  const tracked = new Map<string, number>();
  for (const symbol of watchlist) {
    const key = symbol.trim().toUpperCase();
    if (key) tracked.set(key, Math.max(tracked.get(key) ?? 0, 1));
  }
  for (const position of positions) {
    const key = position.symbol.trim().toUpperCase();
    if (!key) continue;
    const value = Math.max(
      position.shares * (position.currentPrice || 0),
      position.shares * (position.averageCost || 0),
      1,
    );
    tracked.set(key, Math.max(tracked.get(key) ?? 0, value));
  }

  const quoted = new Map<string, StockCandidate>();
  for (const stock of [
    ...snapshot.topPicks,
    ...snapshot.topMovers,
    ...snapshot.shortTermPicks,
    ...snapshot.longTermPicks,
  ]) {
    quoted.set(stock.symbol.toUpperCase(), stock);
  }
  const screened = new Map(
    snapshot.screenedStocks.map((stock) => [stock.symbol.toUpperCase(), stock] as const),
  );

  const rows: { row: ScoreRow; weight: number }[] = [];
  for (const [symbol, weight] of tracked) {
    const row = asRow(symbol, screened.get(symbol), quoted.get(symbol));
    if (row) rows.push({ row, weight });
  }

  const sectorCounts = new Map<string, number>();
  for (const { row } of rows) {
    const sector = row.sector || "Other";
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
  }

  const totalWeight = rows.reduce((sum, item) => sum + item.weight, 0);
  if (!rows.length || totalWeight <= 0) {
    return { score: null, counted: 0, tracked: tracked.size };
  }

  const score = rows.reduce(
    (sum, item) =>
      sum + blendStock(item.row, sectorCounts, rows.length) * (item.weight / totalWeight),
    0,
  );

  return { score: clamp(score), counted: rows.length, tracked: tracked.size };
}
