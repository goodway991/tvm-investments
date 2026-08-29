import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import { showTvm10Labs } from "@/lib/beta-labs";
import { getPlanForUser } from "@/lib/firebase/admin";
import { fetchYahooCompareCards, fetchYahooQuoteCards } from "@/lib/providers/yahoo";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_SYMBOLS = 4;

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "market");
  if (!gate.ok) return gate.response;
  if (!showTvm10Labs()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const plan = await getPlanForUser(gate.uid, gate.email);
  if (plan !== "ultra") {
    return NextResponse.json({ error: "Ultra only." }, { status: 403 });
  }

  const symbols = (request.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => parseTicker(symbol))
    .filter((symbol): symbol is string => Boolean(symbol))
    .slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    const quotes = await fetchYahooCompareCards(symbols);
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("Yahoo compare error:", error);
    try {
      const quotes = await fetchYahooQuoteCards(symbols);
      return NextResponse.json({ quotes });
    } catch {
      return NextResponse.json({ quotes: [] }, { status: 200 });
    }
  }
}
