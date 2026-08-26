import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import { fetchYahooNews } from "@/lib/providers/yahoo";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "market");
  if (!gate.ok) return gate.response;

  const symbol = parseTicker(request.nextUrl.searchParams.get("symbol"));
  if (!symbol) {
    return NextResponse.json({ error: "Valid ticker required" }, { status: 400 });
  }

  try {
    const headlines = await fetchYahooNews(symbol, 8);
    return NextResponse.json({ symbol, headlines });
  } catch (error) {
    console.error("Yahoo news error:", error);
    return NextResponse.json({ symbol, headlines: [] }, { status: 200 });
  }
}
