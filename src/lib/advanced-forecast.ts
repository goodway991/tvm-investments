import type { ChartPoint } from "@/lib/chart-series";
import type { OHLCVBar } from "@/types";
import {
  MAX_DAILY_DRIFT,
  MAX_SIGMA,
  MIN_SIGMA,
  type HorizonStats,
} from "@/lib/horizon-forecast";

export type AdvancedSettings = {
  noiseFlatten: number;
  followThrough: number;
  acceleration: number;
  tapePressure: number;
  stillZone: number;
  averagePath: number;
  lookback: number;
};

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  noiseFlatten: 55,
  followThrough: 70,
  acceleration: 45,
  tapePressure: 50,
  stillZone: 40,
  averagePath: 35,
  lookback: 63,
};

export const ADVANCED_PRESETS: Record<
  "quiet" | "balanced" | "push",
  AdvancedSettings
> = {
  quiet: {
    noiseFlatten: 78,
    followThrough: 40,
    acceleration: 18,
    tapePressure: 22,
    stillZone: 72,
    averagePath: 55,
    lookback: 80,
  },
  balanced: { ...DEFAULT_ADVANCED_SETTINGS },
  push: {
    noiseFlatten: 28,
    followThrough: 88,
    acceleration: 72,
    tapePressure: 78,
    stillZone: 18,
    averagePath: 15,
    lookback: 50,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function slider(value: unknown, fallback: number) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return clamp(Math.round(n), 0, 100);
}

export function clampAdvancedSettings(raw: unknown): AdvancedSettings {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    noiseFlatten: slider(data.noiseFlatten, DEFAULT_ADVANCED_SETTINGS.noiseFlatten),
    followThrough: slider(data.followThrough, DEFAULT_ADVANCED_SETTINGS.followThrough),
    acceleration: slider(data.acceleration, DEFAULT_ADVANCED_SETTINGS.acceleration),
    tapePressure: slider(data.tapePressure, DEFAULT_ADVANCED_SETTINGS.tapePressure),
    stillZone: slider(data.stillZone, DEFAULT_ADVANCED_SETTINGS.stillZone),
    averagePath: slider(data.averagePath, DEFAULT_ADVANCED_SETTINGS.averagePath),
    lookback: clamp(
      Math.round(
        typeof data.lookback === "number" && Number.isFinite(data.lookback)
          ? data.lookback
          : DEFAULT_ADVANCED_SETTINGS.lookback,
      ),
      40,
      90,
    ),
  };
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]) {
  if (values.length < 2) return 0;
  const mu = mean(values);
  const varSum = values.reduce((sum, value) => sum + (value - mu) ** 2, 0);
  return Math.sqrt(varSum / values.length);
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

function ewmaVariance(returns: number[], lambda = 0.94) {
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

function zscore(values: number[]) {
  const mu = mean(values);
  const sigma = std(values);
  if (!(sigma > 1e-8)) return values.map(() => 0);
  return values.map((value) => (value - mu) / sigma);
}

function tapeIncrements(bars: OHLCVBar[]) {
  const volumes = bars.map((bar) => Math.max(0, bar.volume));
  const avgVol = mean(volumes.filter((value) => value > 0)) || 1;
  const out: number[] = [];
  for (let index = 1; index < bars.length; index += 1) {
    const bar = bars[index];
    const prev = bars[index - 1];
    const range = Math.max(1e-6, bar.high - bar.low);
    const clv = (bar.close - bar.low) / range - 0.5;
    const volRatio = Math.log1p(Math.max(0, bar.volume) / avgVol);
    const spread = range / Math.max(bar.close, 1e-6);
    const gap = prev.close > 0 ? Math.log(Math.max(bar.open, 1e-6) / prev.close) : 0;
    out.push(clv * volRatio * 0.0018 - spread * 0.0006 + gap * 0.22);
  }
  return out;
}

export function fitAdvancedForecast(
  bars: OHLCVBar[],
  settings: AdvancedSettings,
): HorizonStats | null {
  const window = bars
    .filter((bar) => bar.close > 0)
    .slice(-settings.lookback);
  if (window.length < 8) return null;
  const last = window[window.length - 1]?.close ?? 0;
  if (!(last > 0)) return null;

  const currentWeight = clamp(0.72 - (settings.noiseFlatten / 100) * 0.5, 0.18, 0.7);
  const logs = window.map((bar) => Math.log(bar.close));
  const smooth = causalSmooth(logs, currentWeight);
  const delta = firstDiff(smooth);
  const accel = firstDiff(delta);
  const tape = tapeIncrements(window);
  const dailyVol = clamp(Math.sqrt(ewmaVariance(delta)), MIN_SIGMA, MAX_SIGMA);
  const lastDelta = delta[delta.length - 1] ?? 0;

  const recent = delta.length > 21 ? delta.slice(-21) : delta;
  const slow = delta.length > 32 ? delta.slice(-32) : delta;
  let meanDelta = 0.62 * mean(recent) + 0.38 * mean(slow);
  const accelMean = accel.length
    ? mean(accel.length > 8 ? accel.slice(-8) : accel)
    : 0;
  meanDelta += (settings.acceleration / 100) * 0.5 * accelMean;
  const tapeMean = tape.length ? mean(tape.length > 5 ? tape.slice(-5) : tape) : 0;
  meanDelta += (settings.tapePressure / 100) * 0.7 * tapeMean;
  meanDelta = clamp(meanDelta, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT);

  const flatAlpha = 0.08 + (settings.stillZone / 100) * 0.2;
  if (Math.abs(meanDelta) < flatAlpha * dailyVol) {
    meanDelta *= 0.18;
  }

  const scored = zscore(delta);
  const nearAr = fitAr1(scored.length > 16 ? scored.slice(-16) : scored);
  const farAr = fitAr1(scored);
  let rho = 0;
  const nearSlope = nearAr?.slope ?? 0;
  const farSlope = farAr?.slope ?? 0;
  const mixedSlope = 0.65 * nearSlope + 0.35 * farSlope;
  if (Math.abs(mixedSlope) > 0.04 && mixedSlope > -0.45 && mixedSlope < 0.9) {
    rho = mixedSlope * (settings.followThrough / 100);
    const intercept =
      0.65 * (nearAr?.intercept ?? 0) + 0.35 * (farAr?.intercept ?? 0);
    const sigma = std(delta) || 1;
    const mu = mean(delta);
    const arMeanZ = Math.abs(1 - mixedSlope) > 1e-6 ? intercept / (1 - mixedSlope) : 0;
    const arMean = arMeanZ * sigma + mu;
    meanDelta = clamp(
      0.58 * meanDelta + 0.42 * arMean,
      -MAX_DAILY_DRIFT,
      MAX_DAILY_DRIFT,
    );
  }

  const nextDelta = Math.abs(rho) < 0.04 ? meanDelta : meanDelta + rho * (lastDelta - meanDelta);
  const dailyDrift = clamp(nextDelta, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT);
  const kappa = rho > 0.04 ? clamp(-Math.log(rho), 0.02, 1.4) : 0;

  return {
    last,
    dailyDrift,
    dailyVol,
    kappa,
    thetaLog: meanDelta,
    lastDelta,
    rho,
    avgBlend: settings.averagePath / 100,
  };
}

export function ohlcvToHistory(bars: OHLCVBar[]): ChartPoint[] {
  return bars
    .filter((bar) => bar.close > 0)
    .map((bar) => {
      const stamp = Date.parse(`${bar.date}T16:00:00-04:00`);
      return {
        label: new Date(Number.isFinite(stamp) ? stamp : bar.date).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" },
        ),
        value: +bar.close.toFixed(2),
        timestamp: Number.isFinite(stamp) ? stamp : Date.parse(bar.date),
      };
    });
}
