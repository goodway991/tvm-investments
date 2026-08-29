import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import { getPlanForUser } from "@/lib/firebase/admin";
import { buildLiveForecast } from "@/lib/live-forecast";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "research");
  if (!gate.ok) return gate.response;

  const symbol = parseTicker(request.nextUrl.searchParams.get("symbol"));
  if (!symbol) {
    return NextResponse.json({ error: "Valid ticker required" }, { status: 400 });
  }
  const date = request.nextUrl.searchParams.get("date");
  const asOf = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  try {
    const plan = await getPlanForUser(gate.uid, gate.email);
    const forecast = await buildLiveForecast(symbol, asOf, plan);
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
