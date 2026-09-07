import { NextRequest, NextResponse } from "next/server";
import {
  requireApiUser,
  requireSignedIn,
  requireDeskAccess,
  type PredictKindGate,
} from "@/lib/api-guard";
import {
  consumeApiQuota,
  consumeServerPredictUsage,
  getPlanForUser,
} from "@/lib/firebase/admin";
import { buildLiveForecast } from "@/lib/live-forecast";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parsePredictKind(value: string | null): PredictKindGate | null {
  if (
    value === "pulse" ||
    value === "score" ||
    value === "addition" ||
    value === "horizon" ||
    value === "advanced"
  ) {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const wantAi = request.nextUrl.searchParams.get("ai") === "1";
  const kind = parsePredictKind(request.nextUrl.searchParams.get("kind"));

  const symbol = parseTicker(request.nextUrl.searchParams.get("symbol"));
  if (!symbol) {
    return NextResponse.json({ error: "Valid ticker required" }, { status: 400 });
  }
  const date = request.nextUrl.searchParams.get("date");
  const asOf = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  try {
    if (wantAi) {
      if (!kind) {
        return NextResponse.json(
          { error: "Predict kind required for AI forecasts." },
          { status: 400 },
        );
      }

      const signedIn = await requireSignedIn(request);
      if (!signedIn.ok) return signedIn.response;
      const desk = await requireDeskAccess(signedIn.uid, signedIn.email);
      if (!desk.ok) return desk.response;

      const plan = await getPlanForUser(signedIn.uid, signedIn.email);

      // Daily AI meter first (Gemini). Fail before burning weekly predict.
      if (plan === "ultra" && !asOf) {
        const aiQuota = await consumeApiQuota(signedIn.uid, signedIn.email, "ai");
        if (!aiQuota.ok) {
          return NextResponse.json(
            {
              error:
                "You've hit today's AI forecast limit. It resets at midnight Eastern.",
            },
            { status: 429 },
          );
        }
      }

      const predict = await consumeServerPredictUsage(signedIn.uid, plan, kind);
      if (!predict.ok) {
        return NextResponse.json(
          { error: "Weekly predict limit reached.", usage: predict.usage },
          { status: 429 },
        );
      }

      const forecast = await buildLiveForecast(symbol, asOf, plan, {
        useAi: true,
      });
      return NextResponse.json({ ...forecast, usage: predict.usage });
    }

    // Chart / tape path — no Gemini, no weekly predict burn.
    const gate = await requireApiUser(request, "market");
    if (!gate.ok) return gate.response;
    const plan = await getPlanForUser(gate.uid, gate.email);
    const forecast = await buildLiveForecast(symbol, asOf, plan, {
      useAi: false,
    });
    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Forecast error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build a live forecast for this name.",
      },
      { status: 502 },
    );
  }
}
