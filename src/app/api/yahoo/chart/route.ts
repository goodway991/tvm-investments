import { NextRequest, NextResponse } from "next/server";
import type { ChartRange } from "@/lib/chart-series";
import { requireApiUser } from "@/lib/api-guard";
import { fetchYahooChartSeries } from "@/lib/providers/yahoo";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";

const RANGES = new Set<ChartRange>(["day", "month", "year"]);

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "market");
  if (!gate.ok) return gate.response;

  const symbol = parseTicker(request.nextUrl.searchParams.get("symbol"));
  if (!symbol) {
    return NextResponse.json({ error: "Valid ticker required" }, { status: 400 });
  }

  const rangeParam = request.nextUrl.searchParams.get("range") ?? "day";
  const range: ChartRange = RANGES.has(rangeParam as ChartRange)
    ? (rangeParam as ChartRange)
    : "day";
  const date = request.nextUrl.searchParams.get("date");
  const asOf = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  try {
    const points = await fetchYahooChartSeries(symbol, range, asOf);
    return NextResponse.json({ symbol, range, points });
  } catch (error) {
    console.error("Yahoo chart error:", error);
    return NextResponse.json({ symbol, range, points: [] }, { status: 200 });
  }
}
