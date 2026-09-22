import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { isAdminEmail } from "@/lib/firebase/admin";
import { fitHour72Forecast } from "@/lib/hour72-forecast";
import { parseTicker } from "@/lib/ticker";
import {
  fetchYahooAtmIv,
  fetchYahooHourlyOhlcv,
  fetchYahooMarketRegime,
  fetchYahooOhlcvSeries,
} from "@/lib/providers/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  if (!isAdminEmail(gate.email)) {
    return NextResponse.json(
      { error: "72-hour desk is admin-only until the Ultra October unlock." },
      { status: 403 },
    );
  }

  let body: { symbol?: unknown } = {};
  try {
    body = (await request.json()) as { symbol?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const symbol = parseTicker(typeof body.symbol === "string" ? body.symbol : "");
  if (!symbol) {
    return NextResponse.json({ error: "Valid ticker required." }, { status: 400 });
  }

  try {
    const [hourly, daily, regime, iv] = await Promise.all([
      fetchYahooHourlyOhlcv(symbol, 70),
      fetchYahooOhlcvSeries(symbol, 120),
      fetchYahooMarketRegime(),
      fetchYahooAtmIv(symbol),
    ]);

    if (hourly.length < 48) {
      return NextResponse.json(
        { error: "Not enough hourly bars yet for a 72-hour path on this name." },
        { status: 422 },
      );
    }

    const result = fitHour72Forecast(hourly, daily, {
      vix: regime.vix,
      spyDailyVol: regime.spyDailyVol,
      impliedDailyVol: iv,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Could not fit the 72-hour research path." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      symbol,
      last: result.last,
      hourlyDrift: result.hourlyDrift,
      hourlyVol: result.hourlyVol,
      equationCount: result.equationCount,
      variableCount: result.variableCount,
      history: result.history,
      path: result.path,
      calibration: result.calibration,
      equations: result.equations,
      note: result.note,
      unlock: "ultra-october",
    });
  } catch (error) {
    console.error("Hour72 forecast error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build the 72-hour path.",
      },
      { status: 502 },
    );
  }
}
