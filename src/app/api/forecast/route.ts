import { NextRequest, NextResponse } from "next/server";
import { buildLiveForecast } from "@/lib/live-forecast";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const symbol = parseTicker(request.nextUrl.searchParams.get("symbol"));
  if (!symbol) {
    return NextResponse.json({ error: "Valid ticker required" }, { status: 400 });
  }
  const date = request.nextUrl.searchParams.get("date");
  const asOf = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  try {
    const forecast = await buildLiveForecast(symbol, asOf);
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
