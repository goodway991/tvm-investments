import { NextRequest, NextResponse } from "next/server";
import { getStockQuote } from "@/lib/analysis-pipeline";
import { saveUserInvestment } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const amount = request.nextUrl.searchParams.get("amount");

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const quote = await getStockQuote(symbol);
    const amountUsd = amount ? parseFloat(amount) : 0;
    const shares = amountUsd > 0 && quote.price > 0 ? amountUsd / quote.price : 0;

    const scenarios = [-10, -5, 5, 10].reduce(
      (acc, pct) => {
        const newPrice = quote.price * (1 + pct / 100);
        const newValue = shares * newPrice;
        acc[`${pct}`] = {
          percent: pct,
          price: +newPrice.toFixed(2),
          value: +newValue.toFixed(2),
          profitLoss: +(newValue - amountUsd).toFixed(2),
        };
        return acc;
      },
      {} as Record<string, { percent: number; price: number; value: number; profitLoss: number }>
    );

    return NextResponse.json({
      symbol: quote.symbol,
      currentPrice: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      currency: quote.currency,
      amountUsd,
      shares: +shares.toFixed(4),
      scenarios,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quote failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, amountUsd, entryPrice, scenarios, userId } = body;

    const saved = await saveUserInvestment({
      userId,
      symbol,
      amountUsd,
      entryPrice,
      scenarios,
    });

    return NextResponse.json({ saved });
  } catch {
    return NextResponse.json({ saved: false });
  }
}
