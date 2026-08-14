import { NextRequest, NextResponse } from "next/server";
import { searchListedUsStocks } from "@/lib/providers/nasdaq";
import { searchYahooSymbols } from "@/lib/providers/yahoo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [listed, yahoo] = await Promise.all([
      searchListedUsStocks(query, 24),
      searchYahooSymbols(query, 12),
    ]);
    const seen = new Set<string>();
    const results: Array<{ symbol: string; name: string }> = [];
    for (const row of [...listed, ...yahoo]) {
      const symbol = row.symbol.trim().toUpperCase();
      if (!symbol || seen.has(symbol)) continue;
      seen.add(symbol);
      results.push({ symbol, name: row.name || symbol });
    }
    return NextResponse.json({ results: results.slice(0, 24) });
  } catch (error) {
    console.error("Symbol search error:", error);
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
