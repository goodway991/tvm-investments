import { NextRequest, NextResponse } from "next/server";
import { runDailyAnalysis } from "@/lib/analysis-pipeline";
import { saveDailySnapshot } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await runDailyAnalysis(Boolean(process.env.OPENAI_API_KEY));
    const saved = await saveDailySnapshot(snapshot);

    return NextResponse.json({
      success: true,
      saved,
      date: snapshot.date,
      topPicks: snapshot.topPicks.map((p) => ({
        symbol: p.symbol,
        score: p.compositeScore,
      })),
    });
  } catch (error) {
    console.error("Cron snapshot error:", error);
    return NextResponse.json({ error: "Snapshot failed" }, { status: 500 });
  }
}
