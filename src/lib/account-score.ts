import type { DailySnapshot, ScreenedStock, StockCandidate } from "@/types";

export type AccountScoreQuote = {
  symbol: string;
  sector: string;
  peRatio: number | null;
  beta: number | null;
  composite: number | null;
};

type HeldRow = {
  symbol: string;
  weight: number;
  sector: string;
  peRatio: number | null;
  beta: number | null;
  composite: number | null;
};

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function scorePe(pe: number | null): number | null {
  if (pe == null || !Number.isFinite(pe) || pe <= 0) return null;
  if (pe < 8) return 50;
  if (pe < 14) return 84;
  if (pe < 22) return 92;
  if (pe < 30) return 76;
  if (pe < 45) return 54;
  return 32;
}

function scoreBeta(beta: number | null): number | null {
  if (beta == null || !Number.isFinite(beta) || beta <= 0) return null;
  if (beta >= 0.75 && beta <= 1.2) return 92;
  if (beta >= 0.55 && beta < 0.75) return 78;
  if (beta > 1.2 && beta <= 1.45) return 72;
  if (beta > 1.45 && beta <= 1.8) return 52;
  if (beta < 0.55) return 60;
  return 34;
}

function weightedMean(rows: { value: number; weight: number }[]) {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  if (!(total > 0)) return null;
  return rows.reduce((sum, row) => sum + row.value * (row.weight / total), 0);
}

function quoteFromScreened(stock: ScreenedStock): AccountScoreQuote {
  return {
    symbol: stock.symbol.toUpperCase(),
    sector: stock.sector || "",
    peRatio: stock.fundamentals.peRatio,
    beta: stock.fundamentals.beta,
    composite: stock.compositeScore,
  };
}

function quoteFromCandidate(stock: StockCandidate): AccountScoreQuote {
  return {
    symbol: stock.symbol.toUpperCase(),
    sector: stock.sector || "",
    peRatio: stock.fundamentals.peRatio,
    beta: stock.fundamentals.beta,
    composite: stock.compositeScore,
  };
}

function mergeQuote(
  map: Map<string, AccountScoreQuote>,
  quote: AccountScoreQuote,
) {
  const key = quote.symbol.toUpperCase();
  const prev = map.get(key);
  map.set(key, {
    symbol: key,
    sector: quote.sector || prev?.sector || "",
    peRatio: quote.peRatio ?? prev?.peRatio ?? null,
    beta: quote.beta ?? prev?.beta ?? null,
    composite: quote.composite ?? prev?.composite ?? null,
  });
}

export function collectAccountScoreQuotes(
  snapshot: DailySnapshot,
): AccountScoreQuote[] {
  const map = new Map<string, AccountScoreQuote>();
  for (const stock of snapshot.screenedStocks) {
    mergeQuote(map, quoteFromScreened(stock));
  }
  for (const stock of [
    ...snapshot.topPicks,
    ...snapshot.topMovers,
    ...snapshot.shortTermPicks,
    ...snapshot.longTermPicks,
  ]) {
    mergeQuote(map, quoteFromCandidate(stock));
  }
  return [...map.values()];
}

function lookupMap(
  snapshot: DailySnapshot,
  extra: AccountScoreQuote[] = [],
) {
  const map = new Map<string, AccountScoreQuote>();
  for (const quote of collectAccountScoreQuotes(snapshot)) {
    mergeQuote(map, quote);
  }
  for (const quote of extra) {
    mergeQuote(map, quote);
  }
  return map;
}

export function computeAccountScore({
  watchlist,
  positions,
  snapshot,
  quotes = [],
}: {
  watchlist: string[];
  positions: { symbol: string; shares: number; currentPrice: number; averageCost: number }[];
  snapshot: DailySnapshot;
  quotes?: AccountScoreQuote[];
}): { score: number | null; counted: number; tracked: number } {
  const lookup = lookupMap(snapshot, quotes);
  const holdings = new Map<string, number>();

  for (const position of positions) {
    const key = position.symbol.trim().toUpperCase();
    if (!key) continue;
    const value = Math.max(
      position.shares * (position.currentPrice || 0),
      position.shares * (position.averageCost || 0),
      0,
    );
    if (value > 0) holdings.set(key, (holdings.get(key) ?? 0) + value);
  }

  const watched: string[] = [];
  for (const symbol of watchlist) {
    const key = symbol.trim().toUpperCase();
    if (key) watched.push(key);
  }

  const tracked = new Set([...holdings.keys(), ...watched]);
  if (tracked.size === 0) {
    return { score: null, counted: 0, tracked: 0 };
  }

  const book = [...holdings.values()].reduce((sum, value) => sum + value, 0);
  const rows: HeldRow[] = [];

  if (book > 0) {
    for (const [symbol, value] of holdings) {
      const quote = lookup.get(symbol);
      rows.push({
        symbol,
        weight: value / book,
        sector: quote?.sector || "Other",
        peRatio: quote?.peRatio ?? null,
        beta: quote?.beta ?? null,
        composite: quote?.composite ?? null,
      });
    }
  } else {
    const unique = [...new Set(watched)];
    const share = 1 / unique.length;
    for (const symbol of unique) {
      const quote = lookup.get(symbol);
      rows.push({
        symbol,
        weight: share,
        sector: quote?.sector || "Other",
        peRatio: quote?.peRatio ?? null,
        beta: quote?.beta ?? null,
        composite: quote?.composite ?? null,
      });
    }
  }

  const sectorWeights = new Map<string, number>();
  for (const row of rows) {
    sectorWeights.set(row.sector, (sectorWeights.get(row.sector) ?? 0) + row.weight);
  }
  const diversity = clamp(
    (1 - [...sectorWeights.values()].reduce((sum, weight) => sum + weight * weight, 0)) *
      125,
  );
  const concentration = (() => {
    const maxWeight = Math.max(...rows.map((row) => row.weight));
    if (maxWeight <= 0.18) return 92;
    if (maxWeight <= 0.28) return 78;
    if (maxWeight <= 0.4) return 58;
    return clamp(100 - maxWeight * 140);
  })();
  const breadth = clamp(
    22 + Math.min(rows.length, 10) * 6 + Math.min(sectorWeights.size, 6) * 5,
  );
  const pe = weightedMean(
    rows
      .map((row) => {
        const value = scorePe(row.peRatio);
        return value == null ? null : { value, weight: row.weight };
      })
      .filter((row): row is { value: number; weight: number } => Boolean(row)),
  );
  const beta = weightedMean(
    rows
      .map((row) => {
        const value = scoreBeta(row.beta);
        return value == null ? null : { value, weight: row.weight };
      })
      .filter((row): row is { value: number; weight: number } => Boolean(row)),
  );
  const quality = weightedMean(
    rows
      .filter((row) => row.composite != null)
      .map((row) => ({ value: clamp(row.composite as number), weight: row.weight })),
  );

  const parts = [
    { value: diversity, weight: 0.22 },
    { value: concentration, weight: 0.14 },
    { value: breadth, weight: 0.12 },
    pe != null ? { value: pe, weight: 0.2 } : null,
    beta != null ? { value: beta, weight: 0.18 } : null,
    quality != null ? { value: quality, weight: 0.14 } : null,
  ].filter((part): part is { value: number; weight: number } => Boolean(part));
  const weight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (!(weight > 0)) {
    return { score: null, counted: 0, tracked: tracked.size };
  }
  const score = parts.reduce((sum, part) => sum + (part.value * part.weight) / weight, 0);

  return {
    score: clamp(score),
    counted: rows.length,
    tracked: tracked.size,
  };
}
