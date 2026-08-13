import "server-only";
import { cache } from "react";
import { after } from "next/server";

import type { DailySnapshot } from "@/types";
import { isDemoMode, runDailyAnalysis, runFallbackSnapshot } from "@/lib/analysis-pipeline";
import { lastCompletedSessionDate } from "@/lib/archive-window";
import { getLatestSnapshot, getSnapshotByDate } from "@/lib/firebase/admin";
import { ARCHIVE_DEMO_DATE, buildArchiveDemoSnapshot } from "@/lib/archive-demo";
import { fallbackSectorDives } from "@/lib/sector-dives";
import { hasNewsLlm } from "@/lib/scoring";
import {
  newerLive,
  persistSnapshot,
  readDiskSnapshot,
} from "@/lib/snapshot-cache";

let inflightLiveSnapshot: Promise<DailySnapshot> | null = null;
const SNAPSHOT_MEMORY_TTL_MS = 45_000;
let latestMemory: { at: number; snapshot: DailySnapshot } | null = null;

function rememberLatest(snapshot: DailySnapshot) {
  latestMemory = { at: Date.now(), snapshot };
  return snapshot;
}

function coversCompletedSession(snapshot: DailySnapshot) {
  return snapshot.date >= lastCompletedSessionDate();
}

function queueSessionRebuild() {
  if (isDemoMode()) return;
  const run = () =>
    buildAndSaveLiveSnapshot().catch((error) => {
      console.error("Background session snapshot failed:", error);
    });
  try {
    after(run);
  } catch {
    void run();
  }
}

async function buildAndSaveLiveSnapshot(): Promise<DailySnapshot> {
  if (!inflightLiveSnapshot) {
    inflightLiveSnapshot = runDailyAnalysis(hasNewsLlm())
      .then(async (snapshot) => {
        await persistSnapshot(snapshot);
        return snapshot;
      })
      .finally(() => {
        inflightLiveSnapshot = null;
      });
  }
  return inflightLiveSnapshot;
}

export function normalizeSnapshot(snapshot: DailySnapshot): DailySnapshot {
  const topMovers = snapshot.topMovers ?? [];
  const topPicks = snapshot.topPicks ?? [];
  const reports = snapshot.reports ?? [];
  const combinedSymbols = new Set([
    ...topMovers.map((stock) => stock.symbol),
    ...topPicks.map((stock) => stock.symbol),
  ]).size;

  return {
    ...snapshot,
    scanUniverse: snapshot.scanUniverse ?? {
      sp500: 0,
      dow30: 0,
      combined: combinedSymbols,
    },
    screenedStocks:
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
      })),
    topMovers,
    topPicks,
    shortTermPicks: snapshot.shortTermPicks ?? topPicks,
    longTermPicks: snapshot.longTermPicks ?? topPicks,
    reports,
    shortTermReports: snapshot.shortTermReports ?? reports,
    longTermReports: snapshot.longTermReports ?? reports,
    sectorDives:
      snapshot.sectorDives && snapshot.sectorDives.length >= 2
        ? snapshot.sectorDives
        : fallbackSectorDives(),
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
  try {
    if (date) {
      const archived = await getSnapshotByDate(date);
      if (archived) return normalizeSnapshot(archived);
      if (date === ARCHIVE_DEMO_DATE) {
        return normalizeSnapshot(buildArchiveDemoSnapshot());
      }
    }
    if (
      latestMemory &&
      Date.now() - latestMemory.at < SNAPSHOT_MEMORY_TTL_MS &&
      coversCompletedSession(latestMemory.snapshot)
    ) {
      return normalizeSnapshot(latestMemory.snapshot);
    }

    const disk = await readDiskSnapshot();
    if (disk && coversCompletedSession(disk)) {
      return normalizeSnapshot(rememberLatest(disk));
    }

    const cached = await getLatestSnapshot();
    const live = newerLive(cached, disk);
    if (live && coversCompletedSession(live)) {
      return normalizeSnapshot(rememberLatest(live));
    }
    if (live && !coversCompletedSession(live)) {
      queueSessionRebuild();
      return normalizeSnapshot(rememberLatest(live));
    }
    if (cached && isDemoMode()) return normalizeSnapshot(rememberLatest(cached));

    if (!isDemoMode()) {
      try {
        return normalizeSnapshot(
          rememberLatest(await buildAndSaveLiveSnapshot()),
        );
      } catch (error) {
        console.error("Live Yahoo snapshot failed:", error);
        if (cached) return normalizeSnapshot(rememberLatest(cached));
      }
    } else if (cached) {
      return normalizeSnapshot(rememberLatest(cached));
    }
  } catch {
    // Firebase is optional; the analysis pipeline supplies a snapshot as a fallback.
  }

  if (!isDemoMode()) {
    try {
      return normalizeSnapshot(rememberLatest(await buildAndSaveLiveSnapshot()));
    } catch (error) {
      console.error("Live Yahoo snapshot failed:", error);
    }
  }

  if (date === ARCHIVE_DEMO_DATE) {
    return normalizeSnapshot(buildArchiveDemoSnapshot());
  }

  return normalizeSnapshot(await runFallbackSnapshot());
});
