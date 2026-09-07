import { NextRequest, NextResponse } from "next/server";
import { requirePredictQuota } from "@/lib/api-guard";
import { showTvm10Labs } from "@/lib/beta-labs";
import { parseTicker } from "@/lib/ticker";
import {
  clampAdvancedSettings,
  ohlcvToHistory,
} from "@/lib/advanced-forecast";
import {
  applyUltraAdvancedSettings,
  fitUltraEnsemble,
} from "@/lib/ultra-ensemble";
import { fetchYahooOhlcvSeries } from "@/lib/providers/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!showTvm10Labs()) {
    return NextResponse.json({ error: "Advanced Predictions are not available." }, { status: 404 });
  }

  const gate = await requirePredictQuota(request, "advanced");
  if (!gate.ok) return gate.response;

  if (gate.plan !== "ultra") {
    return NextResponse.json(
      { error: "Advanced Predictions are Ultra only." },
      { status: 403 },
    );
  }

  let body: { symbol?: unknown; settings?: unknown } = {};
  try {
    body = (await request.json()) as { symbol?: unknown; settings?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const symbol = parseTicker(typeof body.symbol === "string" ? body.symbol : "");
  if (!symbol) {
    return NextResponse.json({ error: "Valid ticker required" }, { status: 400 });
  }

  const settings = clampAdvancedSettings(body.settings);

  try {
    const bars = await fetchYahooOhlcvSeries(symbol, Math.max(90, settings.lookback + 12));
    const ensemble = fitUltraEnsemble(bars);
    if (!ensemble) {
      return NextResponse.json(
        { error: "Not enough daily bars to sketch this name." },
        { status: 422 },
      );
    }
    const stats = applyUltraAdvancedSettings(ensemble.stats, settings);
    const history = ohlcvToHistory(bars).slice(-Math.max(12, settings.lookback));
    return NextResponse.json({
      symbol,
      history,
      last: stats.last,
      dailyDrift: stats.dailyDrift,
      dailyVol: stats.dailyVol,
      kappa: stats.kappa,
      thetaLog: stats.thetaLog,
      lastDelta: stats.lastDelta,
      rho: stats.rho,
      avgBlend: stats.avgBlend,
      equationCount: ensemble.equationCount,
      note: `Ultra Advanced · ${ensemble.equationCount}-equation algorithm (sliders applied).`,
      usage: gate.usage,
    });
  } catch (error) {
    console.error("Advanced forecast error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build an Advanced Prediction for this name.",
      },
      { status: 502 },
    );
  }
}
