#!/usr/bin/env tsx
/**
 * Run end-of-day snapshot manually (same logic as Vercel cron).
 * Usage: npm run snapshot
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { runDailyAnalysis } = await import("../src/lib/analysis-pipeline");
  const { persistSnapshot } = await import("../src/lib/snapshot-cache");
  const { hasNewsLlm } = await import("../src/lib/scoring");

  console.log("Running TVM daily snapshot…");
  const snapshot = await runDailyAnalysis(hasNewsLlm());
  const saved = await persistSnapshot(snapshot);

  console.log(`Date: ${snapshot.date}`);
  console.log(`Mode: ${snapshot.dataMode}`);
  console.log(`Firebase saved: ${saved}`);
  console.log(`Market events: ${snapshot.marketEvents.length}`);
  console.log("Sector dives:");
  for (const dive of snapshot.sectorDives) {
    console.log(`  ${dive.id} — ${dive.subtitle}`);
  }
  console.log("Top picks:");
  for (const pick of snapshot.topPicks) {
    console.log(
      `  #${pick.rank} ${pick.symbol} — $${pick.price.toFixed(2)} (${pick.changePercent >= 0 ? "+" : ""}${pick.changePercent.toFixed(2)}%) score ${pick.compositeScore.toFixed(1)}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
