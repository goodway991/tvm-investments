#!/usr/bin/env tsx
/**
 * Run end-of-day snapshot manually (same logic as Vercel cron).
 * Usage: npm run snapshot
 */
import { runDailyAnalysis } from "../src/lib/analysis-pipeline";
import { saveDailySnapshot } from "../src/lib/firebase/admin";

async function main() {
  console.log("Running TVM daily snapshot…");
  const snapshot = await runDailyAnalysis(Boolean(process.env.OPENAI_API_KEY));
  const saved = await saveDailySnapshot(snapshot);

  console.log(`Date: ${snapshot.date}`);
  console.log(`Mode: ${snapshot.dataMode}`);
  console.log(`Firebase saved: ${saved}`);
  console.log("Top picks:");
  for (const p of snapshot.topPicks) {
    console.log(`  #${p.rank} ${p.symbol} — score ${p.compositeScore.toFixed(1)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
