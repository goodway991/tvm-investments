import type { OHLCVBar, StockCandidate } from "@/types";

export type ChartRange = "day" | "month" | "year";

export interface ChartPoint {
  label: string;
  value: number;
  timestamp: number;
}

function parseBarDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function lastBar(ohlcv: OHLCVBar[]) {
  return ohlcv[ohlcv.length - 1];
}

export function uniqueStocks(stocks: StockCandidate[]) {
  const unique = new Map<string, StockCandidate>();
  stocks.forEach((stock) => unique.set(stock.symbol, stock));
  return Array.from(unique.values());
}

export function sessionMove(stock: {
  price: number;
  change: number;
  ohlcv?: Array<{ close: number }>;
}) {
  const current = stock.price;
  const fromChange = current - stock.change;
  const fromBars =
    stock.ohlcv && stock.ohlcv.length >= 2
      ? stock.ohlcv[stock.ohlcv.length - 2].close
      : 0;
  const previous = fromChange > 0 ? fromChange : fromBars > 0 ? fromBars : current;
  return {
    current,
    previous,
    up: current >= previous,
  };
}

export function sparklineValues(ohlcv: OHLCVBar[], points = 8) {
  return ohlcv.slice(-points).map((bar) => bar.close);
}

function buildMonth(ohlcv: OHLCVBar[]): ChartPoint[] {
  const latest = lastBar(ohlcv);
  if (!latest) return [];
  const latestDate = parseBarDate(latest.date);
  const monthBars = ohlcv.filter((bar) => {
    const date = parseBarDate(bar.date);
    return date.getFullYear() === latestDate.getFullYear() && date.getMonth() === latestDate.getMonth();
  });
  const series = (monthBars.length >= 5 ? monthBars : ohlcv.slice(-22)).map((bar) => {
    const date = parseBarDate(bar.date);
    return {
      label: formatDay(date),
      value: bar.close,
      timestamp: date.getTime(),
    };
  });
  return series;
}

function buildYear(ohlcv: OHLCVBar[], yearCloses?: OHLCVBar[]): ChartPoint[] {
  const source =
    yearCloses && yearCloses.length >= 2
      ? yearCloses
      : (() => {
          const byMonth = new Map<string, OHLCVBar>();
          ohlcv.forEach((bar) => {
            byMonth.set(bar.date.slice(0, 7), bar);
          });
          return Array.from(byMonth.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .slice(-12)
            .map(([, bar]) => bar);
        })();

  return source.map((bar) => {
    const date = parseBarDate(bar.date);
    date.setDate(1);
    return {
      label: formatMonth(date),
      value: bar.close,
      timestamp: date.getTime(),
    };
  });
}

export function buildChartSeries(
  ohlcv: OHLCVBar[],
  range: ChartRange,
  _symbol = "TVM",
  yearCloses?: OHLCVBar[],
): ChartPoint[] {
  if (range === "day") return [];
  if (range === "month") return buildMonth(ohlcv);
  return buildYear(ohlcv, yearCloses);
}

export function formatPrice(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
