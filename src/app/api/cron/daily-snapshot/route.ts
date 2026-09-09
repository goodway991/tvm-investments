import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runDailyAnalysis } from "@/lib/analysis-pipeline";
import { persistSnapshot } from "@/lib/snapshot-cache";
import { hasNewsLlm } from "@/lib/scoring";
import { hasLiveSnapshotForDate } from "@/lib/firebase/admin";
import { etDateString, isUsCashSessionDay } from "@/lib/archive-window";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

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

  const force = request.nextUrl.searchParams.get("force") === "1";
  const date = etDateString();

  if (!force && !isUsCashSessionDay(date)) {
    return NextResponse.json({
      success: true,
      skipped: true,
      date,
      reason: "US cash market holiday or weekend — keeping last live session.",
    });
  }

  if (!force && (await hasLiveSnapshotForDate(date))) {
    return NextResponse.json({
      success: true,
      skipped: true,
      date,
      reason: "Today's live snapshot is already saved.",
    });
  }

  try {
    const snapshot = await runDailyAnalysis(hasNewsLlm());
    if (snapshot.dataMode !== "live" || snapshot.screenedStocks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          saved: false,
          date: snapshot.date,
          dataMode: snapshot.dataMode,
          reason: "Live universe empty — refused to overwrite desk with demo.",
        },
        { status: 503 },
      );
    }
    const saved = await persistSnapshot(snapshot);
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/brief");

    return NextResponse.json({
      success: true,
      saved,
      date: snapshot.date,
      dataMode: snapshot.dataMode,
      marketEvents: snapshot.marketEvents.length,
      sectorDives: snapshot.sectorDives.map((dive) => ({
        id: dive.id,
        filled: !/no .+ names printed/i.test(dive.body),
      })),
      screened: snapshot.screenedStocks.length,
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
