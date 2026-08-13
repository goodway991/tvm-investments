export async function fetchYahooQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}> {
  try {
    const yahooFinance = await import("yahoo-finance2").then((m) => m.default);
    const quote = await yahooFinance.quote(symbol.toUpperCase());

    const price = quote.regularMarketPrice ?? quote.postMarketPrice ?? 0;
    const change = quote.regularMarketChange ?? 0;
    const changePercent = quote.regularMarketChangePercent ?? 0;

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      currency: quote.currency ?? "USD",
    };
  } catch (error) {
    console.error("Yahoo Finance quote error:", error);
    throw new Error(`Unable to fetch quote for ${symbol}`);
  }
}

export async function fetchYahooHistory(
  symbol: string,
  days = 90
): Promise<Array<{ date: string; close: number; volume: number }>> {
  const yahooFinance = await import("yahoo-finance2").then((m) => m.default);
  const start = new Date();
  start.setDate(start.getDate() - days);

  const result = await yahooFinance.historical(symbol.toUpperCase(), {
    period1: start,
    period2: new Date(),
    interval: "1d",
  });

  return result.map((bar) => ({
    date: bar.date.toISOString().slice(0, 10),
    close: bar.close,
    volume: bar.volume,
  }));
}
