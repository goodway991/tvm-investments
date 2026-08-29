import "server-only";
import { cache } from "react";

import type { DailySnapshot, StockCandidate } from "@/types";
import { getLatestSnapshot, getSnapshotByDate } from "@/lib/firebase/admin";
import { buildArchiveDemoSnapshot, isArchiveDemoDate } from "@/lib/archive-demo";
import { etDateString, lastCompletedSessionDate } from "@/lib/archive-window";
import { hydrateSectorDives } from "@/lib/sector-dives";
import { newerLive, readDiskSnapshot, writeDiskSnapshot } from "@/lib/snapshot-cache";
import { slimSnapshot } from "@/lib/snapshot-view";

const SNAPSHOT_MEMORY_TTL_MS = 15 * 60_000;
const FIRESTORE_WAIT_MS = 8000;
const DISK_WAIT_MS = 400;
let latestMemory: { at: number; snapshot: DailySnapshot } | null = null;

function rememberLatest(snapshot: DailySnapshot) {
  latestMemory = { at: Date.now(), snapshot };
  return snapshot;
}

function serveSnapshot(
  snapshot: DailySnapshot,
  options: { freeze?: boolean } = {},
) {
  return rememberLatest(slimSnapshot(normalizeSnapshot(snapshot, options)));
}

async function firstSettled<T>(
  promise: Promise<T | null>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.catch(() => null),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function stocksForDiveHydration(
  snapshot: DailySnapshot,
  screened: DailySnapshot["screenedStocks"],
): StockCandidate[] {
  const bySymbol = new Map<string, StockCandidate>();
  for (const stock of screened) {
    bySymbol.set(stock.symbol, {
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      industry: stock.industry,
      price: stock.price,
      change: 0,
      changePercent: stock.changePercent,
      volume: stock.volume,
      fundamentals: stock.fundamentals,
      ohlcv: [],
      headlines: [],
      signals: [],
      compositeScore: stock.compositeScore,
      maxCompositeScore: 100,
      shortTermScore: stock.shortTermScore,
      longTermScore: stock.longTermScore,
      indexMembership: stock.indexMembership,
    });
  }
  for (const stock of [...(snapshot.topMovers ?? []), ...(snapshot.topPicks ?? [])]) {
    bySymbol.set(stock.symbol, stock);
  }
  return [...bySymbol.values()];
}

export function normalizeSnapshot(
  snapshot: DailySnapshot,
  options: { freeze?: boolean } = {},
): DailySnapshot {
  const topMovers = snapshot.topMovers ?? [];
  const topPicks = snapshot.topPicks ?? [];
  const reports = snapshot.reports ?? [];
  const combinedSymbols = new Set([
    ...topMovers.map((stock) => stock.symbol),
    ...topPicks.map((stock) => stock.symbol),
  ]).size;
  const screenedStocks =
    snapshot.screenedStocks ??
    topMovers.map((stock) => ({
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
    }));

  return {
    ...snapshot,
    scanUniverse: snapshot.scanUniverse ?? {
      sp500: 0,
      dow30: 0,
      combined: combinedSymbols,
    },
    screenedStocks,
    topMovers,
    topPicks,
    shortTermPicks: snapshot.shortTermPicks ?? topPicks,
    longTermPicks: snapshot.longTermPicks ?? topPicks,
    reports,
    shortTermReports: snapshot.shortTermReports ?? reports,
    longTermReports: snapshot.longTermReports ?? reports,
    sectorDives: options.freeze
      ? snapshot.sectorDives ?? []
      : hydrateSectorDives(
          snapshot.sectorDives,
          stocksForDiveHydration(snapshot, screenedStocks),
          snapshot.date,
        ),
  };
}

export function parseArchiveDate(value?: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return value;
}

export const getDashboardSnapshot = cache(async function getDashboardSnapshot(
  archiveDate?: string | null,
): Promise<DailySnapshot> {
  const date = parseArchiveDate(archiveDate);
  if (date) {
    if (isArchiveDemoDate(date)) {
      return slimSnapshot(normalizeSnapshot(buildArchiveDemoSnapshot(date), { freeze: true }));
    }
    const archived = await firstSettled(getSnapshotByDate(date), FIRESTORE_WAIT_MS);
    if (archived) {
      return slimSnapshot(normalizeSnapshot(archived, { freeze: true }));
    }
    return slimSnapshot(normalizeSnapshot(buildArchiveDemoSnapshot(date), { freeze: true }));
  }

  const session = lastCompletedSessionDate();

  if (
    latestMemory &&
    Date.now() - latestMemory.at < SNAPSHOT_MEMORY_TTL_MS &&
    latestMemory.snapshot.date >= session
  ) {
    return latestMemory.snapshot;
  }

  const [disk, cached] = await Promise.all([
    firstSettled(readDiskSnapshot(), DISK_WAIT_MS),
    firstSettled(getLatestSnapshot(), FIRESTORE_WAIT_MS),
  ]);
  const dated =
    disk && disk.date < session
      ? await firstSettled(getSnapshotByDate(session), FIRESTORE_WAIT_MS)
      : null;
  const newest =
    newerLive(dated, cached, disk) ||
    [dated, cached, disk].filter((row): row is DailySnapshot => Boolean(row)).sort(
      (left, right) => `${right.date}${right.generatedAt}`.localeCompare(`${left.date}${left.generatedAt}`),
    )[0];

  if (newest) {
    if (newest.date > (disk?.date || "")) {
      void writeDiskSnapshot(slimSnapshot(newest)).catch(() => undefined);
    }
    return serveSnapshot(newest);
  }

  return serveSnapshot(buildArchiveDemoSnapshot(etDateString()), { freeze: true });
});
