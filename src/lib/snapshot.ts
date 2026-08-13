import "server-only";

import type { DailySnapshot } from "@/types";
import { runDailyAnalysis } from "@/lib/analysis-pipeline";
import { getLatestSnapshot } from "@/lib/firebase/admin";

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
    topMovers,
    topPicks,
    shortTermPicks: snapshot.shortTermPicks ?? topPicks,
    longTermPicks: snapshot.longTermPicks ?? topPicks,
    reports,
    shortTermReports: snapshot.shortTermReports ?? reports,
    longTermReports: snapshot.longTermReports ?? reports,
  };
}

export async function getDashboardSnapshot(): Promise<DailySnapshot> {
  try {
    const cached = await getLatestSnapshot();
    const today = new Date().toISOString().slice(0, 10);
    if (cached && cached.date === today) return normalizeSnapshot(cached);
  } catch {
    // Firebase is optional; the analysis pipeline supplies demo data as a fallback.
  }

  return normalizeSnapshot(
    await runDailyAnalysis(Boolean(process.env.OPENAI_API_KEY)),
  );
}
