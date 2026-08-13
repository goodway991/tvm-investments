import type { ChartPoint } from "@/lib/chart-series";

export const HORIZON_STARTING_CASH = 10_000;
export const MAX_HORIZON_TRADING_DAYS = 10;
export const HORIZON_HISTORY_BARS = 32;

export const Z_BAND = 1.28;
export const MIN_SIGMA = 0.008;
export const MAX_SIGMA = 0.06;
export const MAX_DAILY_DRIFT = 0.03;

export type HorizonChartPoint = {
  label: string;
  timestamp: number;
  actual: number | null;
  predicted: number | null;
  low: number | null;
  high: number | null;
  bandBase: number | null;
  bandSize: number | null;
};

export type HorizonStats = {
  last: number;
  dailyDrift: number;
  dailyVol: number;
};

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdev(values: number[]) {
  if (values.length < 2) return MIN_SIGMA;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(Math.max(variance, 0));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function logReturns(closes: number[]) {
  const returns: number[] = [];
  for (let index = 1; index < closes.length; index += 1) {
    const previous = closes[index - 1];
    const next = closes[index];
    if (previous > 0 && next > 0) {
      returns.push(Math.log(next / previous));
    }
  }
  return returns;
}

export function nextTradingDays(fromTimestamp: number, count: number) {
  const days: Date[] = [];
  const cursor = new Date(fromTimestamp);
  while (days.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(new Date(cursor));
    }
  }
  return days;
}

export function horizonStats(closes: number[]): HorizonStats | null {
  if (closes.length < 3) return null;
  const last = closes[closes.length - 1];
  if (!(last > 0)) return null;
  const returns = logReturns(closes.slice(-HORIZON_HISTORY_BARS));
  return {
    last,
    dailyDrift: clamp(mean(returns), -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT),
    dailyVol: clamp(stdev(returns), MIN_SIGMA, MAX_SIGMA),
  };
}

export function projectPrice(stats: HorizonStats, tradingDaysAhead: number) {
  const days = Math.max(0, tradingDaysAhead);
  const predicted = stats.last * Math.exp(stats.dailyDrift * days);
  const width = Z_BAND * stats.dailyVol * Math.sqrt(days);
  return {
    predicted,
    low: stats.last * Math.exp(stats.dailyDrift * days - width),
    high: stats.last * Math.exp(stats.dailyDrift * days + width),
  };
}

function formatDay(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function lastPriceAtOrBefore(history: ChartPoint[], timestamp: number) {
  let price = 0;
  for (const point of history) {
    if (point.timestamp <= timestamp) price = point.value;
    else break;
  }
  return price;
}

export function buildPortfolioSeries(
  holdings: Array<{ shares: number; history: ChartPoint[] }>,
  cash: number,
): ChartPoint[] {
  const stamps = [
    ...new Set(holdings.flatMap((holding) => holding.history.map((point) => point.timestamp))),
  ].sort((left, right) => left - right);
  if (stamps.length === 0) {
    const now = Date.now();
    return [{ label: formatDay(now), value: cash, timestamp: now }];
  }
  return stamps.map((timestamp) => {
    const marked = holdings.reduce((total, holding) => {
      const price = lastPriceAtOrBefore(holding.history, timestamp);
      return total + holding.shares * price;
    }, 0);
    return {
      timestamp,
      label: formatDay(timestamp),
      value: cash + marked,
    };
  });
}

export function buildHorizonChart(
  history: ChartPoint[],
  tradingDaysAhead: number,
  override?: Partial<HorizonStats> | null,
): { points: HorizonChartPoint[]; stats: HorizonStats | null } {
  const recent = history.slice(-HORIZON_HISTORY_BARS);
  const computed = horizonStats(recent.map((point) => point.value));
  const stats = computed
    ? {
        last: override?.last ?? computed.last,
        dailyDrift: override?.dailyDrift ?? computed.dailyDrift,
        dailyVol: override?.dailyVol ?? computed.dailyVol,
      }
    : null;
  const points: HorizonChartPoint[] = recent.map((point, index) => {
    const isLast = index === recent.length - 1;
    return {
      label: point.label,
      timestamp: point.timestamp,
      actual: point.value,
      predicted: isLast ? point.value : null,
      low: isLast ? point.value : null,
      high: isLast ? point.value : null,
      bandBase: isLast ? point.value : null,
      bandSize: isLast ? 0 : null,
    };
  });

  if (!stats || tradingDaysAhead <= 0 || recent.length === 0) {
    return { points, stats };
  }

  const last = recent[recent.length - 1];
  const horizon = Math.min(MAX_HORIZON_TRADING_DAYS, Math.max(0, tradingDaysAhead));
  const futureDays = nextTradingDays(last.timestamp, MAX_HORIZON_TRADING_DAYS);
  const samples = Math.max(1, Math.round(horizon * 10));

  for (let sample = 1; sample <= samples; sample += 1) {
    const step = (sample / samples) * horizon;
    const projection = projectPrice(stats, step);
    const timestamp = timestampAtTradingDay(last.timestamp, futureDays, step);
    points.push({
      label: formatDay(timestamp),
      timestamp,
      actual: null,
      predicted: projection.predicted,
      low: projection.low,
      high: projection.high,
      bandBase: projection.low,
      bandSize: Math.max(0, projection.high - projection.low),
    });
  }

  return { points, stats };
}

function timestampAtTradingDay(
  start: number,
  tradingDays: Date[],
  tradingDay: number,
) {
  if (tradingDay <= 0 || tradingDays.length === 0) return start;
  const capped = Math.min(tradingDay, tradingDays.length);
  const endIndex = Math.min(tradingDays.length - 1, Math.max(0, Math.ceil(capped) - 1));
  const startIndex = Math.max(-1, Math.floor(capped) - 1);
  const from = startIndex < 0 ? start : tradingDays[startIndex].getTime();
  const to = tradingDays[endIndex].getTime();
  const fraction = capped - Math.floor(capped);
  if (fraction <= 0) return to;
  return from + (to - from) * fraction;
}
