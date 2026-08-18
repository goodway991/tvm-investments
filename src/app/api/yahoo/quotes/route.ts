import { NextRequest, NextResponse } from "next/server";
import { fetchYahooQuoteCards } from "@/lib/providers/yahoo";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbols = (request.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => parseTicker(symbol))
    .filter((symbol): symbol is string => Boolean(symbol));

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    const quotes = await fetchYahooQuoteCards(symbols);
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("Yahoo quotes error:", error);
    return NextResponse.json({ quotes: [] }, { status: 200 });
  }
}
