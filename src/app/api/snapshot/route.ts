import { NextResponse } from "next/server";
import { runDailyAnalysis } from "@/lib/analysis-pipeline";
import { getLatestSnapshot, saveDailySnapshot } from "@/lib/firebase/admin";
import { normalizeSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let snapshot = await getLatestSnapshot();
    const today = new Date().toISOString().slice(0, 10);

    if (!snapshot || snapshot.date !== today) {
      snapshot = await runDailyAnalysis(Boolean(process.env.OPENAI_API_KEY));
      await saveDailySnapshot(snapshot);
    }

    return NextResponse.json(normalizeSnapshot(snapshot));
  } catch (error) {
    console.error("Snapshot API error:", error);
    const snapshot = await runDailyAnalysis(false);
    return NextResponse.json(normalizeSnapshot(snapshot));
  }
}
