import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runDailyAnalysis } from "@/lib/analysis-pipeline";
import { persistSnapshot } from "@/lib/snapshot-cache";
import { hasNewsLlm } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isDev && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await runDailyAnalysis(hasNewsLlm());
    const saved = await persistSnapshot(snapshot);
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/brief");

    return NextResponse.json({
      success: true,
      saved,
      date: snapshot.date,
      dataMode: snapshot.dataMode,
      marketEvents: snapshot.marketEvents.length,
      sectorDives: snapshot.sectorDives.map((dive) => dive.id),
      topPicks: snapshot.topPicks.map((pick) => ({
        symbol: pick.symbol,
        score: pick.compositeScore,
      })),
    });
  } catch (error) {
    console.error("Cron snapshot error:", error);
    return NextResponse.json({ error: "Snapshot failed" }, { status: 500 });
  }
}
