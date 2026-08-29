import type { ChartPoint } from "@/lib/chart-series";

export const HORIZON_STARTING_CASH = 10_000;
export const MAX_HORIZON_TRADING_DAYS = 10;
export const HORIZON_HISTORY_BARS = 63;

export function formatHorizonLabel(days: number) {
  if (days <= 0.05) return "Now";
  const rounded = Math.round(days);
  if (rounded === 5) return "1 week";
  if (rounded >= MAX_HORIZON_TRADING_DAYS) return "2 weeks";
  return rounded === 1 ? "1 trading day" : `${rounded} trading days`;
}

export const Z_BAND = 1.05;
export const MIN_SIGMA = 0.006;
export const MAX_SIGMA = 0.055;
export const MAX_DAILY_DRIFT = 0.012;
const EWMA_LAMBDA = 0.94;
const MIN_KAPPA = 0.02;
const MAX_KAPPA = 1.4;
const DENOISE_CURRENT = 0.38;
const ACCEL_WEIGHT = 0.28;
const FLAT_ALPHA = 0.16;
const MIN_DIFF_AR = -0.45;
const MAX_DIFF_AR = 0.9;

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
  /** Positive when increment AR lag-1 is > 0; then ρ = e^{−κ}. */
  kappa: number;
  /** Mean denoised log-increment. */
  thetaLog: number;
  /** Latest denoised log-diff. */
  lastDelta: number;
  /** Increment AR(1) lag-1 on denoised log-diffs. 0 = constant drift. */
  rho: number;
  /** 0–1 blend toward the average of the path, not only the last tick. */
  avgBlend?: number;
};

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function firstDiff(values: number[]) {
  const out: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    out.push(values[index] - values[index - 1]);
  }
  return out;
}

function causalSmooth(values: number[], currentWeight: number) {
  if (values.length === 0) return [];
  const priorWeight = 1 - currentWeight;
  let level = values[0];
  return values.map((value) => {
    level = currentWeight * value + priorWeight * level;
    return level;
  });
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

function ewmaVariance(returns: number[], lambda = EWMA_LAMBDA) {
  if (returns.length === 0) return MIN_SIGMA ** 2;
  let variance = returns[0] ** 2;
  for (let index = 1; index < returns.length; index += 1) {
    variance = lambda * variance + (1 - lambda) * returns[index] ** 2;
  }
  return Math.max(variance, 0);
}

function fitAr1(series: number[]) {
  if (series.length < 12) return null;
  const ys = series.slice(1);
  const xs = series.slice(0, -1);
  const meanX = mean(xs);
  const meanY = mean(ys);
  let cov = 0;
  let varX = 0;
  for (let index = 0; index < xs.length; index += 1) {
    const dx = xs[index] - meanX;
    cov += dx * (ys[index] - meanY);
    varX += dx * dx;
  }
  if (!(varX > 0)) return null;
  const slope = cov / varX;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

function rhoPower(rho: number, steps: number) {
  if (rho >= 0 || Number.isInteger(steps)) return rho ** steps;
  return Math.pow(Math.abs(rho), steps) * Math.cos(Math.PI * steps);
}

function expectedDeltaSum(lastDelta: number, meanDelta: number, rho: number, steps: number) {
  if (steps <= 0) return 0;
  if (Math.abs(rho) < 1e-6) return meanDelta * steps;
  if (Math.abs(1 - rho) < 1e-6) return lastDelta * steps;
  const pull = lastDelta - meanDelta;
  return meanDelta * steps + (pull * rho * (1 - rhoPower(rho, steps))) / (1 - rho);
}

function deltaSumVariance(sigma: number, rho: number, steps: number) {
  if (steps <= 0) return 0;
  const variance = sigma * sigma;
  if (Math.abs(rho) < 1e-6) return variance * steps;
  let sum = steps;
  for (let lag = 1; lag < steps; lag += 1) {
    sum += 2 * (steps - lag) * rho ** lag;
  }
  return Math.max(0, variance * sum);
}

function incrementRho(stats: HorizonStats) {
  if (typeof stats.rho === "number" && Number.isFinite(stats.rho)) {
    return clamp(stats.rho, MIN_DIFF_AR, MAX_DIFF_AR);
  }
  return stats.kappa > MIN_KAPPA ? Math.exp(-stats.kappa) : 0;
}

/**
 * Smooth log closes, work in first diffs, AR(1) on those diffs, then integrate.
 * A dead zone vs vol flattens noise-sized drift.
 */
function fitLogDifferential(closes: number[]): HorizonStats {
  const series = closes.filter((price) => price > 0);
  const last = series[series.length - 1] ?? 0;
  const logs = series.map(Math.log);
  const smooth = causalSmooth(logs, DENOISE_CURRENT);
  const delta = firstDiff(smooth);
  const accel = firstDiff(delta);
  const dailyVol = clamp(Math.sqrt(ewmaVariance(delta)), MIN_SIGMA, MAX_SIGMA);
  const lastDelta = delta[delta.length - 1] ?? 0;
  const mu1 = mean(delta.length > 21 ? delta.slice(-21) : delta);
  const mu2 = accel.length ? mean(accel.length > 8 ? accel.slice(-8) : accel) : 0;
  let meanDelta = clamp(mu1 + ACCEL_WEIGHT * mu2, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT);
  if (Math.abs(meanDelta) < FLAT_ALPHA * dailyVol) {
    meanDelta *= 0.2;
  }

  const ar = fitAr1(delta);
  let rho = 0;
  if (ar && ar.slope > MIN_DIFF_AR && ar.slope < MAX_DIFF_AR && Math.abs(ar.slope) > 0.04) {
    rho = ar.slope;
    const arMean = Math.abs(1 - ar.slope) > 1e-6 ? ar.intercept / (1 - ar.slope) : meanDelta;
    meanDelta = clamp(
      0.65 * meanDelta + 0.35 * arMean,
      -MAX_DAILY_DRIFT,
      MAX_DAILY_DRIFT,
    );
  }

  const nextDelta = rho === 0 ? meanDelta : meanDelta + rho * (lastDelta - meanDelta);
  const dailyDrift = clamp(nextDelta, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT);
  const kappa = rho > 0.04 ? clamp(-Math.log(rho), MIN_KAPPA, MAX_KAPPA) : 0;

  return {
    last,
    dailyDrift,
    dailyVol,
    kappa,
    thetaLog: meanDelta,
    lastDelta,
    rho,
  };
}

export function simpleHorizonStats(closes: number[]): HorizonStats | null {
  const series = closes.filter((price) => price > 0);
  if (series.length < 8) return null;
  const last = series[series.length - 1];
  const logs: number[] = [];
  for (const price of series) logs.push(Math.log(price));
  const rets = firstDiff(logs).slice(-10);
  if (rets.length < 3) return null;
  const mu = mean(rets);
  const variance =
    rets.reduce((sum, value) => sum + (value - mu) ** 2, 0) / rets.length;
  return {
    last,
    dailyDrift: clamp(mu, -MAX_DAILY_DRIFT * 0.55, MAX_DAILY_DRIFT * 0.55),
    dailyVol: clamp(Math.sqrt(Math.max(variance, 0)), MIN_SIGMA, MAX_SIGMA),
    kappa: 0,
    thetaLog: clamp(mu, -MAX_DAILY_DRIFT * 0.55, MAX_DAILY_DRIFT * 0.55),
    lastDelta: rets[rets.length - 1] ?? 0,
    rho: 0,
    avgBlend: 0,
  };
}

export function horizonStats(closes: number[]): HorizonStats | null {
  if (closes.length < 3) return null;
  const last = closes[closes.length - 1];
  if (!(last > 0)) return null;
  const fitted = fitLogDifferential(closes.slice(-HORIZON_HISTORY_BARS));
  if (!(fitted.last > 0)) return null;
  return fitted;
}

function meanLogAt(stats: HorizonStats, days: number) {
  const x0 = Math.log(stats.last);
  const rho = incrementRho(stats);
  const meanDelta = clamp(
    Math.abs(stats.thetaLog) > MAX_DAILY_DRIFT * 2
      ? stats.dailyDrift
      : stats.thetaLog,
    -MAX_DAILY_DRIFT,
    MAX_DAILY_DRIFT,
  );
  const lastDelta = Number.isFinite(stats.lastDelta) ? stats.lastDelta : 0;
  const integrated = expectedDeltaSum(
    lastDelta,
    Math.abs(rho) < 1e-6 ? stats.dailyDrift : meanDelta,
    rho,
    days,
  );
  return x0 + integrated;
}

export function projectPrice(stats: HorizonStats, tradingDaysAhead: number) {
  const days = Math.max(0, tradingDaysAhead);
  const terminalLog = meanLogAt(stats, days);
  if (days <= 0) {
    return {
      predicted: Math.exp(terminalLog),
      low: Math.exp(terminalLog),
      high: Math.exp(terminalLog),
    };
  }
  const blend = clamp(stats.avgBlend ?? 0, 0, 1);
  let meanLog = terminalLog;
  if (blend > 0 && days > 1) {
    const steps = Math.max(1, Math.round(days));
    let logSum = 0;
    for (let step = 1; step <= steps; step += 1) {
      logSum += meanLogAt(stats, step);
    }
    meanLog = (1 - blend) * terminalLog + blend * (logSum / steps);
  }
  const rho = incrementRho(stats);
  const n = Math.max(1, Math.round(days));
  const variance = deltaSumVariance(stats.dailyVol, rho, n) * (days / n);
  const width = Z_BAND * Math.sqrt(Math.max(0, variance));
  return {
    predicted: Math.exp(meanLog),
    low: Math.exp(meanLog - width),
    high: Math.exp(meanLog + width),
  };
}

function formatDay(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Tape-shaped residuals so the forward path kinks like recent closes
 * instead of a ruler. Bridged to 0 at both ends so the tip still
 * lands on the model mean.
 */
function pathWiggleSeries(
  closes: number[],
  horizon: number,
  vol: number,
  samples: number,
): number[] {
  const out = Array.from({ length: samples + 1 }, () => 0);
  const series = closes.filter((price) => price > 0);
  if (series.length < 5 || horizon <= 0 || samples < 2) return out;
  const diffs = firstDiff(series.map(Math.log));
  if (diffs.length < 3) return out;
  let acc = 0;
  const walk = [0];
  const dt = horizon / samples;
  for (let index = 1; index <= samples; index += 1) {
    const src = ((index - 1) / samples) * diffs.length;
    const i0 = Math.floor(src) % diffs.length;
    const i1 = (i0 + 1) % diffs.length;
    const frac = src - Math.floor(src);
    acc += (diffs[i0] * (1 - frac) + diffs[i1] * frac) * dt;
    walk.push(acc);
  }
  const end = walk[samples];
  const phase = (series[series.length - 1] * 0.271) % 1;
  for (let index = 0; index <= samples; index += 1) {
    const u = index / samples;
    const tape = walk[index] - end * u;
    const envelope = Math.min(1, u * 18) * (1 - u);
    const grain =
      vol *
      envelope *
      (0.72 * Math.sin(2 * Math.PI * (2.15 * u + phase)) +
        0.42 * Math.sin(2 * Math.PI * (4.6 * u + phase * 1.7)) +
        0.22 * Math.sin(2 * Math.PI * (7.4 * u + phase * 0.4)));
    out[index] = tape * 1.2 + grain;
  }
  return out;
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
  windowDays = tradingDaysAhead,
): { points: HorizonChartPoint[]; stats: HorizonStats | null } {
  const computed = horizonStats(
    history.slice(-HORIZON_HISTORY_BARS).map((point) => point.value),
  );
  const stats = computed
    ? {
        last: override?.last ?? computed.last,
        dailyDrift: clamp(
          override?.dailyDrift ?? computed.dailyDrift,
          -MAX_DAILY_DRIFT,
          MAX_DAILY_DRIFT,
        ),
        dailyVol: clamp(
          override?.dailyVol ?? computed.dailyVol,
          MIN_SIGMA,
          MAX_SIGMA,
        ),
        kappa: override?.kappa ?? computed.kappa,
        thetaLog: clamp(
          override?.thetaLog ?? override?.dailyDrift ?? computed.thetaLog,
          -MAX_DAILY_DRIFT,
          MAX_DAILY_DRIFT,
        ),
        lastDelta: override?.lastDelta ?? computed.lastDelta,
        rho: override?.rho ?? computed.rho,
        avgBlend: override?.avgBlend ?? computed.avgBlend,
      }
    : null;
  const visible = Math.max(0, Math.round(windowDays));
  const keep =
    visible <= 0 ? Math.min(12, history.length) : Math.max(3, visible);
  const recent = history.slice(-keep);
  const points: HorizonChartPoint[] = recent.map((point, index) => {
    const isLast = index === recent.length - 1;
    const seedPath = isLast && Math.round(tradingDaysAhead) > 0;
    return {
      label: point.label,
      timestamp: point.timestamp,
      actual: point.value,
      predicted: seedPath ? point.value : null,
      low: seedPath ? point.value : null,
      high: seedPath ? point.value : null,
      bandBase: seedPath ? point.value : null,
      bandSize: seedPath ? 0 : null,
    };
  });

  const last = recent[recent.length - 1];
  const axisDays = Math.min(
    MAX_HORIZON_TRADING_DAYS,
    Math.max(0, Math.round(windowDays)),
  );
  if (!last || axisDays <= 0) {
    return { points, stats };
  }

  const pathHorizon = Math.min(axisDays, Math.max(0, tradingDaysAhead));
  const futureDays = nextTradingDays(last.timestamp, axisDays);
  const samples = Math.max(24, Math.round(axisDays * 14));
  const wiggles =
    stats && pathHorizon > 0
      ? pathWiggleSeries(
          history.slice(-HORIZON_HISTORY_BARS).map((point) => point.value),
          pathHorizon,
          stats.dailyVol,
          samples,
        )
      : [];

  for (let sample = 1; sample <= samples; sample += 1) {
    const step = (sample / samples) * axisDays;
    const timestamp = timestampAtTradingDay(last.timestamp, futureDays, step);
    const onPath = Boolean(stats) && pathHorizon > 0 && step <= pathHorizon + 1e-6;
    const projection = onPath && stats ? projectPrice(stats, step) : null;
    const u = pathHorizon > 0 ? clamp(step / pathHorizon, 0, 1) : 0;
    const wigIndex = Math.round(u * samples);
    const wiggle = onPath ? (wiggles[wigIndex] ?? 0) : 0;
    const meanPrice = projection?.predicted ?? null;
    const predicted =
      meanPrice != null && Number.isFinite(meanPrice)
        ? meanPrice * Math.exp(Number.isFinite(wiggle) ? wiggle : 0)
        : null;
    const half =
      projection != null
        ? Math.max(0, (projection.high - projection.low) / 2)
        : 0;
    const low = predicted != null ? Math.max(0.01, predicted - half) : null;
    const high = predicted != null ? predicted + half : null;
    points.push({
      label: formatDay(timestamp),
      timestamp,
      actual: null,
      predicted,
      low,
      high,
      bandBase: low,
      bandSize:
        predicted != null ? Math.max(0, (high ?? predicted) - (low ?? predicted)) : null,
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
