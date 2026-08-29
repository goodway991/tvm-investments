import type { OHLCVBar, StockCandidate, StrategySignal } from "@/types";
import { STRATEGY_NAMES } from "@/types";

function rangeFromBars(ohlcv: OHLCVBar[] | undefined) {
  const closes = (ohlcv ?? [])
    .map((bar) => bar.close)
    .filter((close) => close > 0);
  if (closes.length < 20) return null;
  return { high: Math.max(...closes), low: Math.min(...closes) };
}

export function evaluateRange52Week(
  stock: Pick<
    StockCandidate,
    "price" | "fiftyTwoWeekHigh" | "fiftyTwoWeekLow" | "ohlcv"
  >,
): StrategySignal {
  let high = stock.fiftyTwoWeekHigh ?? null;
  let low = stock.fiftyTwoWeekLow ?? null;
  if (high == null || low == null || high <= low) {
    const fromBars = rangeFromBars(stock.ohlcv);
    high = fromBars?.high ?? null;
    low = fromBars?.low ?? null;
  }

  if (high == null || low == null || high <= low || !(stock.price > 0)) {
    return {
      strategyId: "short_squeeze",
      strategyName: STRATEGY_NAMES.short_squeeze,
      triggered: false,
      score: 20,
      maxScore: 100,
      detail: "Not enough price history for a 52-week range.",
    };
  }

  const span = high - low;
  const pctOfRange = ((stock.price - low) / span) * 100;
  const offHigh = ((high - stock.price) / high) * 100;
  const nearLows = pctOfRange <= 30;
  const deepDiscount = offHigh >= 18;
  const triggered = nearLows || deepDiscount;
  const score = triggered
    ? Math.min(
        94,
        Math.round(
          48 +
            (30 - Math.min(pctOfRange, 30)) * 1.2 +
            Math.min(offHigh, 35) * 0.6,
        ),
      )
    : Math.max(18, Math.round(58 - pctOfRange * 0.38));

  return {
    strategyId: "short_squeeze",
    strategyName: STRATEGY_NAMES.short_squeeze,
    triggered,
    score,
    maxScore: 100,
    detail: `${offHigh.toFixed(0)}% below the 52-week high ($${high.toFixed(2)}) · ${pctOfRange.toFixed(0)}th percentile of the 52-week range.`,
  };
}
