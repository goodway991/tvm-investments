import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import { fetchYahooCloseOnDate } from "@/lib/providers/yahoo";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "market");
  if (!gate.ok) return gate.response;

  const symbol = parseTicker(request.nextUrl.searchParams.get("symbol"));
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!symbol) {
    return NextResponse.json({ error: "Valid ticker required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date required" }, { status: 400 });
  }

  try {
    const bar = await fetchYahooCloseOnDate(symbol, date);
    if (!bar) {
      return NextResponse.json({ symbol, date, close: null });
    }
    return NextResponse.json({
      symbol,
      date: bar.date,
      close: bar.close,
    });
  } catch (error) {
    console.error("Yahoo close error:", error);
    return NextResponse.json({ symbol, date, close: null }, { status: 200 });
  }
}
