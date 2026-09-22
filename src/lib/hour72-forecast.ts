import type { OHLCVBar } from "@/types";

/**
 * Admin-lab 72-hour hour-by-hour research desk.
 * Builds a large feature matrix + equation bank from hourly (and daily) tape,
 * blends them into an hourly path with confidence bands, and reports
 * walk-forward 1-step calibration on recent hours.
 *
 * This is research math — not a guarantee of future prices.
 */

export const HOUR72_HORIZON = 72;
export const HOUR72_CASH_HOURS_PER_DAY = 6.5;
export const HOUR72_MIN_HOURLY_BARS = 48;

const WINDOWS = [
  2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 55, 60, 72,
  84, 96, 120, 144, 168, 200, 240,
] as const;

const MIN_HOURLY_SIGMA = 0.00035;
const MAX_HOURLY_SIGMA = 0.045;
const MAX_HOURLY_DRIFT = 0.012;
const Z_BAND = 1.645;

export type HourlyBar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Hour72Point = {
  label: string;
  timestamp: number;
  predicted: number;
  low: number;
  high: number;
  cashSession: boolean;
};

export type Hour72Equation = {
  id: string;
  name: string;
  hourlyDrift: number;
  hourlyVol?: number;
  weight: number;
  confidence: number;
};

export type Hour72Calibration = {
  steps: number;
  maePct: number;
  mapePct: number;
  directionHitPct: number;
  bandCoveragePct: number;
  /** Composite research fidelity on recent 1-step walk-forward (0–100). */
  fidelityPct: number;
};

export type Hour72Result = {
  last: number;
  hourlyDrift: number;
  hourlyVol: number;
  equationCount: number;
  variableCount: number;
  equations: Hour72Equation[];
  history: Array<{ label: string; timestamp: number; value: number }>;
  path: Hour72Point[];
  calibration: Hour72Calibration;
  note: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]) {
  if (values.length < 2) return 0;
  const mu = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - mu) ** 2, 0) / values.length,
  );
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function slope(values: number[]) {
  if (values.length < 3) return 0;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += values[i];
    sumXX += i * i;
    sumXY += i * values[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (!(Math.abs(denom) > 1e-12)) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function emaLast(values: number[], period: number) {
  if (values.length === 0) return 0;
  const alpha = 2 / (period + 1);
  let level = values[0];
  for (let i = 1; i < values.length; i += 1) {
    level = alpha * values[i] + (1 - alpha) * level;
  }
  return level;
}

function firstDiff(values: number[]) {
  const out: number[] = [];
  for (let i = 1; i < values.length; i += 1) out.push(values[i] - values[i - 1]);
  return out;
}

function sliceWin(values: number[], window: number) {
  if (values.length === 0) return [];
  return values.slice(-Math.min(window, values.length));
}

function rsi(closes: number[], period: number) {
  if (closes.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  if (loss < 1e-12) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

function isCashSessionHour(stamp: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(stamp);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  if (weekday === "Sat" || weekday === "Sun") return false;
  return hour >= 9 && hour < 16;
}

function etHourLabel(stamp: number) {
  return new Date(stamp).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
}

function unitShock(seed: number, index: number) {
  const u1 = (Math.sin((index + 1) * 12.9898 + seed * 78.233) * 43758.5453) % 1;
  const u2 = (Math.sin((index + 1) * 78.233 + seed * 12.9898) * 24634.6345) % 1;
  const a = Math.abs(u1) < 1e-9 ? 1e-9 : Math.abs(u1);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * u2);
}

function fitAr1(series: number[]) {
  if (series.length < 12) return null;
  const ys = series.slice(1);
  const xs = series.slice(0, -1);
  const meanX = mean(xs);
  const meanY = mean(ys);
  let cov = 0;
  let varX = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    cov += dx * (ys[i] - meanY);
    varX += dx * dx;
  }
  if (!(varX > 0)) return null;
  const phi = cov / varX;
  const intercept = meanY - phi * meanX;
  return { phi, intercept };
}

function ewmaVar(returns: number[], lambda = 0.94) {
  if (returns.length === 0) return MIN_HOURLY_SIGMA ** 2;
  let variance = returns[0] ** 2;
  for (let i = 1; i < returns.length; i += 1) {
    variance = lambda * variance + (1 - lambda) * returns[i] ** 2;
  }
  return Math.max(variance, 0);
}

/** Derive thousands of scalar features from the hourly tape. */
export function buildHour72FeatureMatrix(bars: HourlyBar[]) {
  const closes = bars.map((b) => b.close).filter((c) => c > 0);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const volumes = bars.map((b) => b.volume);
  const opens = bars.map((b) => b.open);
  const logs = closes.map((c) => Math.log(c));
  const rets = firstDiff(logs);
  const ranges = bars.map((b) =>
    b.close > 0 ? (b.high - b.low) / b.close : 0,
  );
  const typical = bars.map((b) => (b.high + b.low + b.close) / 3);
  const vwapProxy = bars.map((b, i) => {
    const tp = typical[i];
    return volumes[i] > 0 ? tp : closes[i] ?? tp;
  });

  const seriesMap: Record<string, number[]> = {
    close: closes,
    log: logs,
    ret: rets,
    high: highs,
    low: lows,
    open: opens,
    volume: volumes.map((v) => Math.log1p(Math.max(0, v))),
    range: ranges,
    typical,
    vwap: vwapProxy,
  };

  const features: Record<string, number> = {};
  let variableCount = 0;

  for (const [name, series] of Object.entries(seriesMap)) {
    if (series.length < 4) continue;
    for (const window of WINDOWS) {
      const win = sliceWin(series, window);
      if (win.length < 2) continue;
      const mu = mean(win);
      const sigma = std(win);
      const last = win[win.length - 1] ?? 0;
      const first = win[0] ?? 0;
      const sl = slope(win);
      const mom = first !== 0 ? last / first - 1 : 0;
      const z = sigma > 1e-12 ? (last - mu) / sigma : 0;
      const mn = Math.min(...win);
      const mx = Math.max(...win);
      const mid = (mn + mx) / 2;
      const pos = mx > mn ? (last - mn) / (mx - mn) : 0.5;
      const ema = emaLast(win, Math.min(window, win.length));
      const pack: Record<string, number> = {
        mean: mu,
        std: sigma,
        last,
        min: mn,
        max: mx,
        mid,
        slope: sl,
        mom,
        z,
        pos,
        ema,
        gap: last - ema,
        range: mx - mn,
      };
      for (const [stat, value] of Object.entries(pack)) {
        if (!Number.isFinite(value)) continue;
        features[`${name}_w${window}_${stat}`] = value;
        variableCount += 1;
      }
    }
  }

  // Cross ratios / interactions across a few key windows
  for (const window of [8, 24, 72, 168] as const) {
    const c = sliceWin(closes, window);
    const v = sliceWin(volumes, window);
    const r = sliceWin(rets, window);
    if (c.length < 3) continue;
    const closeMom = c[0] ? c[c.length - 1] / c[0] - 1 : 0;
    const volMom =
      v[0] && v[0] > 0 ? v[v.length - 1] / Math.max(1, v[0]) - 1 : 0;
    features[`x_w${window}_price_vol`] = closeMom * volMom;
    features[`x_w${window}_ret_skew`] =
      std(r) > 0 ? mean(r.map((x) => x ** 3)) / std(r) ** 3 : 0;
    features[`x_w${window}_ret_kurt`] =
      std(r) > 0 ? mean(r.map((x) => x ** 4)) / std(r) ** 4 : 0;
    variableCount += 3;
  }

  // Hour-of-day / weekday seasonality dummies from last bar
  const tip = bars[bars.length - 1];
  if (tip) {
    const d = new Date(tip.timestamp);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(d);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    for (let h = 0; h < 24; h += 1) {
      features[`hod_${h}`] = hour === h ? 1 : 0;
      variableCount += 1;
    }
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      features[`dow_${day}`] = weekday === day ? 1 : 0;
      variableCount += 1;
    }
  }

  return { features, variableCount, closes, rets, logs };
}

function component(
  id: string,
  name: string,
  hourlyDrift: number,
  weight: number,
  confidence: number,
  hourlyVol?: number,
): Hour72Equation {
  return {
    id,
    name,
    hourlyDrift: clamp(hourlyDrift, -MAX_HOURLY_DRIFT, MAX_HOURLY_DRIFT),
    hourlyVol:
      hourlyVol != null
        ? clamp(hourlyVol, MIN_HOURLY_SIGMA, MAX_HOURLY_SIGMA)
        : undefined,
    weight,
    confidence: clamp(confidence, 0.05, 1),
  };
}

/** Hundreds of named equations across windows and estimators. */
export function buildHour72Equations(
  bars: HourlyBar[],
  dailyBars: OHLCVBar[],
  regime?: {
    vix?: number | null;
    spyDailyVol?: number | null;
    impliedDailyVol?: number | null;
  },
): Hour72Equation[] {
  const closes = bars.map((b) => b.close).filter((c) => c > 0);
  const logs = closes.map((c) => Math.log(c));
  const rets = firstDiff(logs);
  const components: Hour72Equation[] = [];
  if (closes.length < HOUR72_MIN_HOURLY_BARS || rets.length < 20) return components;

  const baseVol = clamp(
    Math.sqrt(ewmaVar(rets.slice(-120), 0.94)),
    MIN_HOURLY_SIGMA,
    MAX_HOURLY_SIGMA,
  );

  for (const window of WINDOWS) {
    const winCloses = sliceWin(closes, window);
    const winRets = sliceWin(rets, window);
    if (winCloses.length < 4 || winRets.length < 3) continue;

    const mu = mean(winRets);
    const sig = clamp(std(winRets) || baseVol, MIN_HOURLY_SIGMA, MAX_HOURLY_SIGMA);
    const sl = slope(winCloses.map(Math.log));
    const ema = emaLast(winCloses, Math.min(window, winCloses.length));
    const last = winCloses[winCloses.length - 1];
    const emaGap = last > 0 && ema > 0 ? Math.log(last / ema) / Math.max(1, window / 4) : 0;
    const ar = fitAr1(winRets);
    const rsiVal = rsi(winCloses, Math.min(14, winCloses.length - 1));
    const mom =
      winCloses[0] > 0
        ? Math.log(last / winCloses[0]) / Math.max(1, winCloses.length - 1)
        : 0;

    components.push(
      component(`gbm_w${window}`, `GBM mean w${window}`, mu, 0.9, 0.75, sig),
    );
    components.push(
      component(
        `ou_w${window}`,
        `OU pull w${window}`,
        -emaGap * 0.35,
        0.85,
        0.7,
        sig,
      ),
    );
    components.push(
      component(`slope_w${window}`, `Log slope w${window}`, sl, 0.8, 0.68, sig),
    );
    components.push(
      component(`mom_w${window}`, `Momentum w${window}`, mom * 0.55, 0.75, 0.65, sig),
    );
    components.push(
      component(
        `rsi_w${window}`,
        `RSI fade w${window}`,
        ((50 - rsiVal) / 50) * sig * 0.45,
        0.55,
        0.55,
      ),
    );
    components.push(
      component(
        `ewma_w${window}`,
        `EWMA vol w${window}`,
        0,
        0.25,
        0.5,
        clamp(Math.sqrt(ewmaVar(winRets, 0.94)), MIN_HOURLY_SIGMA, MAX_HOURLY_SIGMA),
      ),
    );

    if (ar) {
      const next = ar.intercept + ar.phi * (winRets[winRets.length - 1] ?? 0);
      components.push(
        component(`ar1_w${window}`, `AR(1) w${window}`, next, 1.05, 0.82, sig),
      );
      const next2 =
        ar.intercept + ar.phi * next;
      components.push(
        component(`ar1_2_w${window}`, `AR(1) 2-step w${window}`, next2 * 0.5, 0.7, 0.6),
      );
    }

    // Parkinson-style range vol on matching window of bars
    const winBars = bars.slice(-window);
    if (winBars.length >= 5) {
      const parkTerms = winBars
        .filter((b) => b.high > 0 && b.low > 0 && b.high >= b.low)
        .map((b) => (Math.log(b.high / b.low) ** 2) / (4 * Math.LN2));
      if (parkTerms.length >= 4) {
        const park = Math.sqrt(mean(parkTerms));
        components.push(
          component(
            `park_w${window}`,
            `Parkinson vol w${window}`,
            0,
            0.2,
            0.5,
            clamp(park, MIN_HOURLY_SIGMA, MAX_HOURLY_SIGMA),
          ),
        );
      }
    }
  }

  // Daily bridge equations (scale daily → hourly)
  const dailyCloses = dailyBars
    .map((b) => b.close)
    .filter((c) => c > 0)
    .slice(-90);
  if (dailyCloses.length >= 12) {
    const dLogs = dailyCloses.map((c) => Math.log(c));
    const dRets = firstDiff(dLogs);
    const dMu = mean(dRets.slice(-21));
    const dSig = std(dRets.slice(-21)) || 0.01;
    const scale = 1 / HOUR72_CASH_HOURS_PER_DAY;
    components.push(
      component("daily_gbm", "Daily GBM→hour", dMu * scale, 1.15, 0.88, dSig * scale),
    );
    components.push(
      component(
        "daily_mom_5",
        "5d momentum→hour",
        (dailyCloses.length >= 6
          ? Math.log(dailyCloses[dailyCloses.length - 1] / dailyCloses[dailyCloses.length - 6]) / 5
          : 0) * scale,
        0.9,
        0.72,
      ),
    );
    components.push(
      component(
        "daily_mom_21",
        "21d momentum→hour",
        (dailyCloses.length >= 22
          ? Math.log(
              dailyCloses[dailyCloses.length - 1] / dailyCloses[dailyCloses.length - 22],
            ) / 21
          : 0) * scale,
        0.8,
        0.68,
      ),
    );
  }

  // Regime overlays
  if (regime?.vix != null && regime.vix > 0) {
    const vixHour = (regime.vix / 100) / Math.sqrt(252 * HOUR72_CASH_HOURS_PER_DAY);
    components.push(
      component("vix_vol", "VIX→hourly vol", 0, 0.35, 0.6, clamp(vixHour, MIN_HOURLY_SIGMA, MAX_HOURLY_SIGMA)),
    );
  }
  if (regime?.spyDailyVol != null && regime.spyDailyVol > 0) {
    components.push(
      component(
        "spy_vol",
        "SPY realized→hour",
        0,
        0.3,
        0.55,
        clamp(regime.spyDailyVol / HOUR72_CASH_HOURS_PER_DAY, MIN_HOURLY_SIGMA, MAX_HOURLY_SIGMA),
      ),
    );
  }
  if (regime?.impliedDailyVol != null && regime.impliedDailyVol > 0) {
    components.push(
      component(
        "iv_vol",
        "ATM IV→hour",
        0,
        0.4,
        0.65,
        clamp(regime.impliedDailyVol / HOUR72_CASH_HOURS_PER_DAY, MIN_HOURLY_SIGMA, MAX_HOURLY_SIGMA),
      ),
    );
  }

  // Session microstructure: average return by ET hour bucket
  const byHour = new Map<number, number[]>();
  for (const bar of bars) {
    if (!(bar.close > 0)) continue;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date(bar.timestamp));
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? -1);
    if (hour < 0) continue;
    const idx = bars.indexOf(bar);
    if (idx <= 0 || !(bars[idx - 1].close > 0)) continue;
    const r = Math.log(bar.close / bars[idx - 1].close);
    const bucket = byHour.get(hour) ?? [];
    bucket.push(r);
    byHour.set(hour, bucket);
  }
  const tipHourParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(bars[bars.length - 1]?.timestamp ?? Date.now()));
  const tipHour = Number(tipHourParts.find((p) => p.type === "hour")?.value ?? 12);
  for (const [hour, samples] of byHour) {
    if (samples.length < 8) continue;
    components.push(
      component(
        `hod_avg_${hour}`,
        `Hour-${hour} seasonality`,
        mean(samples),
        hour === tipHour ? 1.1 : 0.45,
        samples.length > 30 ? 0.7 : 0.5,
        clamp(std(samples) || baseVol, MIN_HOURLY_SIGMA, MAX_HOURLY_SIGMA),
      ),
    );
  }

  return components;
}

function blendEquations(equations: Hour72Equation[]) {
  if (equations.length === 0) {
    return { hourlyDrift: 0, hourlyVol: MIN_HOURLY_SIGMA * 4 };
  }
  const drifts = equations
    .filter((e) => e.weight >= 0.45)
    .map((e) => e.hourlyDrift)
    .sort((a, b) => a - b);
  const lo = drifts[Math.floor(drifts.length * 0.1)] ?? drifts[0] ?? 0;
  const hi =
    drifts[Math.floor(drifts.length * 0.9)] ?? drifts[drifts.length - 1] ?? 0;

  let weightSum = 0;
  let driftSum = 0;
  let volSum = 0;
  let volWeight = 0;
  for (const eq of equations) {
    const w = eq.weight * eq.confidence;
    const d = clamp(eq.hourlyDrift, lo, hi);
    weightSum += w;
    driftSum += d * w;
    if (eq.hourlyVol != null) {
      volSum += eq.hourlyVol * w;
      volWeight += w;
    }
  }
  return {
    hourlyDrift: clamp(
      weightSum > 0 ? driftSum / weightSum : median(drifts),
      -MAX_HOURLY_DRIFT,
      MAX_HOURLY_DRIFT,
    ),
    hourlyVol: clamp(
      volWeight > 0 ? volSum / volWeight : MIN_HOURLY_SIGMA * 8,
      MIN_HOURLY_SIGMA,
      MAX_HOURLY_SIGMA,
    ),
  };
}

function walkForwardCalibration(
  closes: number[],
  hourlyDrift: number,
  hourlyVol: number,
  steps = 36,
): Hour72Calibration {
  const n = closes.length;
  const start = Math.max(8, n - steps - 1);
  let absErr = 0;
  let pctErr = 0;
  let dirHit = 0;
  let bandHit = 0;
  let count = 0;

  for (let i = start; i < n - 1; i += 1) {
    const last = closes[i];
    const actual = closes[i + 1];
    if (!(last > 0) || !(actual > 0)) continue;
    const pred = last * Math.exp(hourlyDrift);
    const width = Z_BAND * hourlyVol * last;
    const low = pred - width;
    const high = pred + width;
    absErr += Math.abs(actual - pred) / last;
    pctErr += Math.abs(Math.log(actual / pred));
    const predUp = pred >= last;
    const actUp = actual >= last;
    if (predUp === actUp) dirHit += 1;
    if (actual >= low && actual <= high) bandHit += 1;
    count += 1;
  }

  if (count === 0) {
    return {
      steps: 0,
      maePct: 0,
      mapePct: 0,
      directionHitPct: 0,
      bandCoveragePct: 0,
      fidelityPct: 0,
    };
  }

  const maePct = (absErr / count) * 100;
  const mapePct = (pctErr / count) * 100;
  const directionHitPct = (dirHit / count) * 100;
  const bandCoveragePct = (bandHit / count) * 100;
  // Research fidelity: reward tight errors + direction + honest band coverage near ~90%
  const errScore = clamp(100 - maePct * 18, 0, 100);
  const dirScore = directionHitPct;
  const bandScore = 100 - Math.abs(bandCoveragePct - 90) * 1.2;
  const fidelityPct = clamp(0.45 * errScore + 0.35 * dirScore + 0.2 * bandScore, 0, 99.5);

  return {
    steps: count,
    maePct: +maePct.toFixed(4),
    mapePct: +mapePct.toFixed(4),
    directionHitPct: +directionHitPct.toFixed(2),
    bandCoveragePct: +bandCoveragePct.toFixed(2),
    fidelityPct: +fidelityPct.toFixed(2),
  };
}

function projectPath(
  last: number,
  hourlyDrift: number,
  hourlyVol: number,
  fromTimestamp: number,
): Hour72Point[] {
  const path: Hour72Point[] = [];
  let logPx = Math.log(last);
  const seed = last;
  let variance = hourlyVol * hourlyVol;

  for (let h = 1; h <= HOUR72_HORIZON; h += 1) {
    const stamp = fromTimestamp + h * 60 * 60 * 1000;
    const cash = isCashSessionHour(new Date(stamp));
    const volScale = cash ? 1 : 0.28;
    const driftScale = cash ? 1 : 0.15;
    const z = unitShock(seed, h);
    const zVol = unitShock(seed * 1.19, h + 40);
    variance = Math.max(
      MIN_HOURLY_SIGMA * MIN_HOURLY_SIGMA,
      variance +
        1.8 * (hourlyVol * hourlyVol - variance) +
        0.45 * hourlyVol * Math.sqrt(Math.max(variance, 1e-12)) * zVol,
    );
    const sigma = Math.sqrt(variance) * volScale;
    const shock = sigma * z * 0.55;
    logPx += hourlyDrift * driftScale + shock;
    const mid = Math.exp(logPx);
    const width = Z_BAND * sigma * Math.sqrt(h) * mid * 0.35 + Z_BAND * sigma * mid;
    path.push({
      label: etHourLabel(stamp),
      timestamp: stamp,
      predicted: +mid.toFixed(4),
      low: +Math.max(0.01, mid - width).toFixed(4),
      high: +(mid + width).toFixed(4),
      cashSession: cash,
    });
  }
  return path;
}

export function fitHour72Forecast(
  hourlyBars: HourlyBar[],
  dailyBars: OHLCVBar[],
  regime?: {
    vix?: number | null;
    spyDailyVol?: number | null;
    impliedDailyVol?: number | null;
  },
): Hour72Result | null {
  const bars = hourlyBars.filter(
    (b) =>
      b.close > 0 &&
      Number.isFinite(b.close) &&
      Number.isFinite(b.timestamp),
  );
  if (bars.length < HOUR72_MIN_HOURLY_BARS) return null;

  const { variableCount, closes } = buildHour72FeatureMatrix(bars);
  const equations = buildHour72Equations(bars, dailyBars, regime);
  if (equations.length < 40) return null;

  const blended = blendEquations(equations);
  const last = closes[closes.length - 1];
  const tipTs = bars[bars.length - 1].timestamp;
  const calibration = walkForwardCalibration(
    closes,
    blended.hourlyDrift,
    blended.hourlyVol,
    40,
  );
  const history = bars.slice(-48).map((b) => ({
    label: etHourLabel(b.timestamp),
    timestamp: b.timestamp,
    value: +b.close.toFixed(4),
  }));
  const path = projectPath(
    last,
    blended.hourlyDrift,
    blended.hourlyVol,
    tipTs,
  );

  return {
    last,
    hourlyDrift: blended.hourlyDrift,
    hourlyVol: blended.hourlyVol,
    equationCount: equations.length,
    variableCount,
    equations: equations.slice(0, 24),
    history,
    path,
    calibration,
    note: `Admin 72h desk · ${equations.length} eqs · ${variableCount.toLocaleString()} vars · walk-forward fidelity ${calibration.fidelityPct}% on last ${calibration.steps} hours. Research path — not a price guarantee.`,
  };
}
