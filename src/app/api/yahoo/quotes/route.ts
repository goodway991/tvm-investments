import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import { fetchYahooQuoteCards } from "@/lib/providers/yahoo";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";

const MAX_SYMBOLS = 40;

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "market");
  if (!gate.ok) return gate.response;

  const symbols = (request.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => parseTicker(symbol))
    .filter((symbol): symbol is string => Boolean(symbol))
    .slice(0, MAX_SYMBOLS);

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
