import type { OHLCVBar } from "@/types";
import {
  MAX_DAILY_DRIFT,
  MAX_SIGMA,
  MIN_SIGMA,
  horizonStats,
  type HorizonStats,
} from "@/lib/horizon-forecast";
import {
  DEFAULT_ADVANCED_SETTINGS,
  fitAdvancedForecast,
  type AdvancedSettings,
} from "@/lib/advanced-forecast";

/**
 * Ultra-only short-horizon ensemble.
 * Classical equity math blended for a 5–10 trading-day path.
 * Pro/Free never call this module.
 */

export type UltraEnsembleContext = {
  researchDrift?: number;
  analystDailyDrift?: number;
  sectorChangePct?: number;
  marketChangePct?: number;
  /** Daily σ from VIX/√252 or SPY realized. */
  regimeDailyVol?: number | null;
  /** Near ATM implied daily σ. */
  impliedDailyVol?: number | null;
  /** Extra database tag for notes (yahoo / finnhub / vix / iv). */
  sources?: string[];
};

export type UltraEnsembleComponent = {
  id: string;
  name: string;
  drift: number;
  vol?: number;
  weight: number;
  confidence: number;
};

export type UltraEnsembleResult = {
  stats: HorizonStats;
  components: UltraEnsembleComponent[];
  equationCount: number;
  note: string;
};

const LN2 = Math.LN2;
const TRADING_YEAR = 252;

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

function firstDiff(values: number[]) {
  const out: number[] = [];
  for (let i = 1; i < values.length; i += 1) out.push(values[i] - values[i - 1]);
  return out;
}

function sma(values: number[], period: number) {
  if (values.length < period) return mean(values);
  return mean(values.slice(-period));
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

function ewmaVar(returns: number[], lambda = 0.94) {
  if (returns.length === 0) return MIN_SIGMA ** 2;
  let variance = returns[0] ** 2;
  for (let i = 1; i < returns.length; i += 1) {
    variance = lambda * variance + (1 - lambda) * returns[i] ** 2;
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
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    cov += dx * (ys[i] - meanY);
    varX += dx * dx;
  }
  if (!(varX > 0)) return null;
  const rho = cov / varX;
  const intercept = meanY - rho * meanX;
  return { rho, intercept };
}

function logReturns(closes: number[]) {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    if (closes[i] > 0 && closes[i - 1] > 0) {
      out.push(Math.log(closes[i] / closes[i - 1]));
    }
  }
  return out;
}

function periodLogReturn(closes: number[], days: number) {
  if (closes.length < days + 1) return 0;
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 1 - days];
  if (!(last > 0 && prev > 0)) return 0;
  return Math.log(last / prev) / days;
}

/** Parkinson (1980) high-low range volatility. */
function parkinsonVol(bars: OHLCVBar[]) {
  const terms: number[] = [];
  for (const bar of bars) {
    if (bar.high > 0 && bar.low > 0 && bar.high >= bar.low) {
      const hl = Math.log(bar.high / bar.low);
      terms.push((hl * hl) / (4 * LN2));
    }
  }
  if (terms.length < 5) return null;
  return Math.sqrt(mean(terms));
}

/** Garman–Klass (1980) OHLC estimator. */
function garmanKlassVol(bars: OHLCVBar[]) {
  const terms: number[] = [];
  for (const bar of bars) {
    if (!(bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0)) continue;
    const hl = Math.log(bar.high / bar.low);
    const co = Math.log(bar.close / bar.open);
    terms.push(0.5 * hl * hl - (2 * LN2 - 1) * co * co);
  }
  if (terms.length < 5) return null;
  return Math.sqrt(Math.max(0, mean(terms)));
}

/** Rogers–Satchell (1991) drift-independent OHLC vol. */
function rogersSatchellVol(bars: OHLCVBar[]) {
  const terms: number[] = [];
  for (const bar of bars) {
    if (!(bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0)) continue;
    const ho = Math.log(bar.high / bar.open);
    const hc = Math.log(bar.high / bar.close);
    const lo = Math.log(bar.low / bar.open);
    const lc = Math.log(bar.low / bar.close);
    terms.push(ho * hc + lo * lc);
  }
  if (terms.length < 5) return null;
  return Math.sqrt(Math.max(0, mean(terms)));
}

/** Yang–Zhang (2000) overnight + open-to-close + RS blend. */
function yangZhangVol(bars: OHLCVBar[]) {
  if (bars.length < 8) return null;
  const overnight: number[] = [];
  const openClose: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const prev = bars[i - 1];
    const bar = bars[i];
    if (!(prev.close > 0 && bar.open > 0 && bar.close > 0)) continue;
    overnight.push(Math.log(bar.open / prev.close));
    openClose.push(Math.log(bar.close / bar.open));
  }
  const rs = rogersSatchellVol(bars);
  if (!rs || overnight.length < 5) return null;
  const k = 0.34 / (1.34 + (overnight.length + 1) / (overnight.length - 1));
  const sigma2 =
    std(overnight) ** 2 + k * std(openClose) ** 2 + (1 - k) * rs * rs;
  return Math.sqrt(Math.max(0, sigma2));
}

/** RiskMetrics EWMA σ. */
function ewmaVol(returns: number[]) {
  return Math.sqrt(ewmaVar(returns, 0.94));
}

/** Simple GARCH(1,1)-style recursive variance (ω, α, β fixed). */
function garchVol(returns: number[]) {
  if (returns.length < 20) return null;
  const omega = 1e-6;
  const alpha = 0.08;
  const beta = 0.9;
  let variance = mean(returns.map((r) => r * r)) || MIN_SIGMA ** 2;
  for (const ret of returns) {
    variance = omega + alpha * ret * ret + beta * variance;
  }
  return Math.sqrt(Math.max(variance, 0));
}

/** Bipower variation (Barndorff-Nielsen & Shephard) jump-robust vol proxy. */
function bipowerVol(returns: number[]) {
  if (returns.length < 8) return null;
  let sum = 0;
  for (let i = 1; i < returns.length; i += 1) {
    sum += Math.abs(returns[i]) * Math.abs(returns[i - 1]);
  }
  const mu1 = Math.sqrt(2 / Math.PI);
  const bv = ((Math.PI / 2) * (sum / (returns.length - 1))) / (mu1 * mu1);
  return Math.sqrt(Math.max(0, bv));
}

function rsi14(closes: number[]) {
  if (closes.length < 16) return 50;
  const diffs = firstDiff(closes);
  const window = diffs.slice(-14);
  let gains = 0;
  let losses = 0;
  for (const d of window) {
    if (d >= 0) gains += d;
    else losses -= d;
  }
  if (losses < 1e-12) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function macdHist(closes: number[]) {
  if (closes.length < 35) return 0;
  const ema12 = emaLast(closes, 12);
  const ema26 = emaLast(closes, 26);
  const macd = ema12 - ema26;
  const signal = emaLast(
    closes.map((_, i) => {
      if (i < 26) return 0;
      return emaLast(closes.slice(0, i + 1), 12) - emaLast(closes.slice(0, i + 1), 26);
    }),
    9,
  );
  return (macd - signal) / Math.max(closes[closes.length - 1], 1e-6);
}

function stochasticK(bars: OHLCVBar[], period = 14) {
  if (bars.length < period) return 50;
  const window = bars.slice(-period);
  const last = window[window.length - 1].close;
  const hi = Math.max(...window.map((b) => b.high));
  const lo = Math.min(...window.map((b) => b.low));
  if (!(hi > lo)) return 50;
  return ((last - lo) / (hi - lo)) * 100;
}

function cci(bars: OHLCVBar[], period = 20) {
  if (bars.length < period) return 0;
  const window = bars.slice(-period);
  const tps = window.map((b) => (b.high + b.low + b.close) / 3);
  const tp = tps[tps.length - 1];
  const smaTp = mean(tps);
  const mad = mean(tps.map((v) => Math.abs(v - smaTp))) || 1e-6;
  return (tp - smaTp) / (0.015 * mad);
}

function chaikinMoneyFlow(bars: OHLCVBar[], period = 20) {
  if (bars.length < period) return 0;
  const window = bars.slice(-period);
  let mfv = 0;
  let volSum = 0;
  for (const bar of window) {
    const range = Math.max(1e-6, bar.high - bar.low);
    const clv = ((bar.close - bar.low) - (bar.high - bar.close)) / range;
    mfv += clv * Math.max(0, bar.volume);
    volSum += Math.max(0, bar.volume);
  }
  if (!(volSum > 0)) return 0;
  return mfv / volSum;
}

function obvSlope(bars: OHLCVBar[]) {
  if (bars.length < 8) return 0;
  let obv = 0;
  const series: number[] = [0];
  for (let i = 1; i < bars.length; i += 1) {
    const dir =
      bars[i].close > bars[i - 1].close
        ? 1
        : bars[i].close < bars[i - 1].close
          ? -1
          : 0;
    obv += dir * Math.max(0, bars[i].volume);
    series.push(obv);
  }
  const recent = series.slice(-21);
  const scale = Math.max(1, Math.abs(recent[recent.length - 1]) || 1);
  return slope(recent.map((v) => v / scale));
}

/** Hull Moving Average slope on log closes (Hull 2005). */
function hullMaSlope(closes: number[]) {
  if (closes.length < 20) return 0;
  const period = 16;
  const half = Math.max(2, Math.floor(period / 2));
  const sqrtN = Math.max(2, Math.round(Math.sqrt(period)));
  const wma = (arr: number[], p: number) => {
    const w = arr.slice(-p);
    let num = 0;
    let den = 0;
    for (let i = 0; i < w.length; i += 1) {
      const weight = i + 1;
      num += w[i] * weight;
      den += weight;
    }
    return den > 0 ? num / den : mean(w);
  };
  const logs = closes.map(Math.log);
  const series: number[] = [];
  for (let i = period; i < logs.length; i += 1) {
    const slice = logs.slice(0, i + 1);
    const raw = 2 * wma(slice, half) - wma(slice, period);
    const hullWindow = [...slice.slice(0, -1), raw].slice(-sqrtN);
    series.push(wma(hullWindow, Math.min(sqrtN, hullWindow.length)));
  }
  return slope(series.slice(-12));
}

/** Simple 1D Kalman level filter → innovation / trend. */
function kalmanTrend(closes: number[]) {
  if (closes.length < 10) return { drift: 0, level: closes.at(-1) ?? 0 };
  const logs = closes.map(Math.log);
  let x = logs[0];
  let p = 1;
  const q = 1e-4;
  const r = 2e-3;
  const levels: number[] = [];
  for (const z of logs) {
    p += q;
    const k = p / (p + r);
    x += k * (z - x);
    p *= 1 - k;
    levels.push(x);
  }
  const drift = slope(levels.slice(-16));
  return { drift, level: Math.exp(x) };
}

/** Variance-ratio / Hurst-ish persistence (Lo–MacKinlay style VR(q)). */
function varianceRatio(returns: number[], q = 5) {
  if (returns.length < q * 8) return 1;
  const var1 = std(returns) ** 2;
  if (!(var1 > 0)) return 1;
  const aggregated: number[] = [];
  for (let i = 0; i + q <= returns.length; i += q) {
    let sum = 0;
    for (let j = 0; j < q; j += 1) sum += returns[i + j];
    aggregated.push(sum);
  }
  const varQ = std(aggregated) ** 2;
  return varQ / (q * var1);
}

function atr(bars: OHLCVBar[], period = 14) {
  if (bars.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const bar = bars[i];
    const prev = bars[i - 1];
    const tr = Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - prev.close),
      Math.abs(bar.low - prev.close),
    );
    trs.push(tr);
  }
  return sma(trs, Math.min(period, trs.length));
}

function donchianPosition(bars: OHLCVBar[], period = 20) {
  if (bars.length < period) return 0;
  const window = bars.slice(-period);
  const hi = Math.max(...window.map((b) => b.high));
  const lo = Math.min(...window.map((b) => b.low));
  const last = window[window.length - 1].close;
  if (!(hi > lo)) return 0;
  return (last - lo) / (hi - lo) - 0.5;
}

function component(
  id: string,
  name: string,
  drift: number,
  weight: number,
  confidence: number,
  vol?: number,
): UltraEnsembleComponent {
  return {
    id,
    name,
    drift: clamp(drift, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT),
    vol: vol != null ? clamp(vol, MIN_SIGMA, MAX_SIGMA) : undefined,
    weight,
    confidence: clamp(confidence, 0.05, 1),
  };
}

export function fitUltraEnsemble(
  bars: OHLCVBar[],
  context: UltraEnsembleContext = {},
): UltraEnsembleResult | null {
  const window = bars.filter((bar) => bar.close > 0).slice(-90);
  if (window.length < 20) return null;
  const closes = window.map((b) => b.close);
  const last = closes[closes.length - 1];
  if (!(last > 0)) return null;
  const returns = logReturns(closes);
  if (returns.length < 12) return null;

  const components: UltraEnsembleComponent[] = [];

  const volPark = parkinsonVol(window.slice(-42));
  const volGk = garmanKlassVol(window.slice(-42));
  const volRs = rogersSatchellVol(window.slice(-42));
  const volYz = yangZhangVol(window.slice(-42));
  const volEwma = ewmaVol(returns);
  const volGarch = garchVol(returns);
  const volBp = bipowerVol(returns);
  const volSample = std(returns.slice(-21));
  const volParts = [volPark, volGk, volRs, volYz, volEwma, volGarch, volBp, volSample].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0,
  );
  const dailyVol = clamp(
    volParts.length ? median(volParts) : volEwma,
    MIN_SIGMA,
    MAX_SIGMA,
  );

  if (context.regimeDailyVol != null && Number.isFinite(context.regimeDailyVol)) {
    components.push(
      component(
        "regime_vix_spy",
        "VIX/SPY regime vol",
        0,
        0.55,
        0.8,
        clamp(context.regimeDailyVol, MIN_SIGMA, MAX_SIGMA),
      ),
    );
  }
  if (context.impliedDailyVol != null && Number.isFinite(context.impliedDailyVol)) {
    components.push(
      component(
        "atm_iv",
        "Yahoo ATM implied vol",
        0,
        0.7,
        0.85,
        clamp(context.impliedDailyVol, MIN_SIGMA, MAX_SIGMA),
      ),
    );
  }

  components.push(
    component("gbm_mle", "GBM MLE drift", mean(returns.slice(-21)), 1.1, 0.85, volSample),
  );

  {
    let level = returns[0];
    for (let i = 1; i < returns.length; i += 1) {
      level = 0.94 * level + 0.06 * returns[i];
    }
    components.push(component("ewma_mu", "EWMA mean return", level, 1.15, 0.9, volEwma));
  }

  components.push(
    component("mom_5", "5-day momentum", periodLogReturn(closes, 5), 0.95, 0.7),
  );
  components.push(
    component("mom_10", "10-day momentum", periodLogReturn(closes, 10), 1.0, 0.75),
  );
  components.push(
    component("mom_21", "21-day momentum", periodLogReturn(closes, 21), 1.05, 0.8),
  );
  components.push(
    component(
      "mom_63",
      "63-day momentum",
      periodLogReturn(closes, Math.min(63, closes.length - 1)),
      0.7,
      0.65,
    ),
  );

  {
    const logs = closes.map(Math.log);
    const theta = mean(logs.slice(-42));
    const x = logs[logs.length - 1];
    const halfLife = 12;
    const kappa = LN2 / halfLife;
    components.push(
      component("ou_mr", "OU mean reversion", kappa * (theta - x), 0.9, 0.72),
    );
  }

  {
    const mu = sma(closes, 20);
    const sigma = std(closes.slice(-20)) || 1e-6;
    const z = (last - mu) / sigma;
    components.push(
      component("bollinger", "Bollinger z reversion", -z * dailyVol * 0.35, 0.85, 0.7),
    );
  }

  {
    const rsi = rsi14(closes);
    components.push(
      component(
        "rsi14",
        "RSI(14) mean reversion",
        ((50 - rsi) / 50) * dailyVol * 0.55,
        0.8,
        0.68,
      ),
    );
  }

  components.push(
    component("macd", "MACD histogram trend", macdHist(closes) * 0.45, 0.85, 0.7),
  );

  {
    const logs = closes.map(Math.log);
    components.push(
      component("log_lin", "Log-linear regression", slope(logs.slice(-32)), 1.0, 0.82),
    );
  }

  {
    const logs = closes.map(Math.log);
    const d1 = firstDiff(logs);
    const d2 = firstDiff(d1);
    components.push(
      component(
        "quad_accel",
        "Quadratic acceleration",
        mean(d2.slice(-8)) * 0.55,
        0.75,
        0.6,
      ),
    );
  }

  {
    const atr14 = atr(window, 14);
    const dayMove =
      closes.length > 1 ? closes[closes.length - 1] - closes[closes.length - 2] : 0;
    const strength = atr14 > 0 ? dayMove / atr14 : 0;
    components.push(
      component("atr_trend", "ATR trend strength", strength * dailyVol * 0.4, 0.7, 0.62),
    );
  }

  {
    const recent = window.slice(-10);
    const pressures = recent.map((bar) => {
      const range = Math.max(1e-6, bar.high - bar.low);
      return ((bar.close - bar.low) / range - 0.5) * 2;
    });
    components.push(
      component(
        "clv_pressure",
        "CLV volume pressure",
        mean(pressures) * dailyVol * 0.5,
        0.8,
        0.7,
      ),
    );
  }

  components.push(
    component("obv", "OBV slope", obvSlope(window) * dailyVol * 0.8, 0.65, 0.55),
  );

  if (window.length >= 2) {
    const prev = window[window.length - 2];
    const bar = window[window.length - 1];
    const gap =
      prev.close > 0 && bar.open > 0 ? Math.log(bar.open / prev.close) : 0;
    const follow = Math.log(bar.close / Math.max(bar.open, 1e-6));
    components.push(
      component("gap_blend", "Gap follow/fade", gap * 0.35 + follow * 0.25, 0.7, 0.6),
    );
  }

  {
    const overnight: number[] = [];
    const intradaily: number[] = [];
    for (let i = 1; i < window.length; i += 1) {
      const prev = window[i - 1];
      const bar = window[i];
      if (!(prev.close > 0 && bar.open > 0 && bar.close > 0)) continue;
      overnight.push(Math.log(bar.open / prev.close));
      intradaily.push(Math.log(bar.close / bar.open));
    }
    components.push(
      component(
        "overnight",
        "Overnight drift",
        mean(overnight.slice(-15)),
        0.55,
        0.55,
        std(overnight.slice(-15)),
      ),
    );
    components.push(
      component(
        "intraday",
        "Intraday drift",
        mean(intradaily.slice(-15)),
        0.7,
        0.65,
        std(intradaily.slice(-15)),
      ),
    );
  }

  {
    const ar1 = fitAr1(returns.slice(-40));
    if (ar1) {
      const lastR = returns[returns.length - 1];
      const mu = mean(returns.slice(-40));
      const next = ar1.intercept + ar1.rho * lastR;
      components.push(
        component("ar1", "AR(1) returns", 0.55 * next + 0.45 * mu, 1.15, 0.88),
      );
    }
    if (returns.length >= 24) {
      const y = returns.slice(2);
      const x1 = returns.slice(1, -1);
      const a1 = fitAr1(returns.slice(-40));
      if (a1) {
        const resid = y.map((yi, i) => yi - (a1.intercept + a1.rho * x1[i]));
        const a2 = fitAr1(resid);
        const last1 = returns[returns.length - 1];
        const last2 = returns[returns.length - 2];
        const next =
          a1.intercept +
          a1.rho * last1 +
          (a2 ? a2.rho * (last1 - (a1.intercept + a1.rho * last2)) : 0);
        components.push(component("ar2", "AR(2) returns", next, 1.0, 0.8));
      }
    }
  }

  {
    const vr = varianceRatio(returns, 5);
    const mom = periodLogReturn(closes, 10);
    const mr = -periodLogReturn(closes, 5) * 0.5;
    const persist = clamp((vr - 1) * 2, -1, 1);
    const mixed =
      persist >= 0 ? mom * (0.5 + 0.5 * persist) : mr * (0.5 - 0.5 * persist);
    components.push(
      component("var_ratio", "Variance-ratio Hurst switch", mixed, 0.95, 0.75),
    );
  }

  {
    const kalman = kalmanTrend(closes);
    components.push(component("kalman", "Kalman trend filter", kalman.drift, 1.05, 0.84));
  }

  components.push(
    component("hull", "Hull MA slope", hullMaSlope(closes), 0.9, 0.72),
  );

  components.push(
    component(
      "donchian",
      "Donchian channel",
      donchianPosition(window) * dailyVol * 0.9,
      0.7,
      0.6,
    ),
  );

  {
    const k = stochasticK(window);
    components.push(
      component(
        "stoch",
        "Stochastic oscillator",
        ((50 - k) / 50) * dailyVol * 0.5,
        0.65,
        0.58,
      ),
    );
  }

  {
    const value = cci(window);
    components.push(
      component("cci", "Commodity channel index", (-value / 200) * dailyVol, 0.6, 0.55),
    );
  }

  components.push(
    component(
      "cmf",
      "Chaikin money flow",
      chaikinMoneyFlow(window) * dailyVol * 0.7,
      0.75,
      0.65,
    ),
  );

  {
    const pro = horizonStats(closes);
    if (pro) {
      components.push(
        component(
          "pro_diff",
          "Log-differential AR path",
          pro.dailyDrift,
          1.2,
          0.92,
          pro.dailyVol,
        ),
      );
    }
  }

  {
    const advanced = fitAdvancedForecast(window, DEFAULT_ADVANCED_SETTINGS);
    if (advanced) {
      components.push(
        component(
          "adv_tape",
          "Advanced dual-AR tape",
          advanced.dailyDrift,
          1.25,
          0.94,
          advanced.dailyVol,
        ),
      );
    }
  }

  if (typeof context.researchDrift === "number" && Number.isFinite(context.researchDrift)) {
    components.push(
      component("research8", "8-signal research tilt", context.researchDrift, 1.1, 0.86),
    );
  }

  if (
    typeof context.analystDailyDrift === "number" &&
    Number.isFinite(context.analystDailyDrift)
  ) {
    components.push(
      component(
        "analyst",
        "Analyst target pull",
        context.analystDailyDrift * 0.35,
        0.55,
        0.5,
      ),
    );
  }

  {
    const sector = (context.sectorChangePct ?? 0) / 100;
    const market = (context.marketChangePct ?? 0) / 100;
    const stock1 = periodLogReturn(closes, 1);
    components.push(
      component(
        "rs_sector",
        "Sector relative strength",
        (stock1 - sector) * 0.55,
        0.8,
        0.7,
      ),
    );
    components.push(
      component(
        "beta_mkt",
        "Market beta residual",
        (stock1 - market) * 0.4,
        0.65,
        0.6,
      ),
    );
  }

  {
    const mu = mean(returns.slice(-42));
    const sig = std(returns.slice(-42)) || dailyVol;
    const sharpe = sig > 0 ? (mu / sig) * Math.sqrt(TRADING_YEAR) : 0;
    components.push(
      component(
        "sharpe_prior",
        "Sharpe-scaled prior",
        clamp(sharpe, -2, 2) * dailyVol * 0.15,
        0.7,
        0.6,
      ),
    );
  }

  // Named vol estimators as zero-drift components so equationCount reflects the stack
  if (volPark != null) {
    components.push(component("vol_parkinson", "Parkinson vol", 0, 0.15, 0.5, volPark));
  }
  if (volGk != null) {
    components.push(component("vol_gk", "Garman-Klass vol", 0, 0.15, 0.5, volGk));
  }
  if (volRs != null) {
    components.push(component("vol_rs", "Rogers-Satchell vol", 0, 0.15, 0.5, volRs));
  }
  if (volYz != null) {
    components.push(component("vol_yz", "Yang-Zhang vol", 0, 0.2, 0.55, volYz));
  }
  if (volGarch != null) {
    components.push(component("vol_garch", "GARCH(1,1) vol", 0, 0.2, 0.55, volGarch));
  }
  if (volBp != null) {
    components.push(component("vol_bipower", "Bipower variation vol", 0, 0.15, 0.5, volBp));
  }

  if (components.length < 8) return null;

  const drifts = components
    .filter((c) => c.weight >= 0.5)
    .map((c) => c.drift)
    .sort((a, b) => a - b);
  const lo = drifts[Math.floor(drifts.length * 0.12)] ?? drifts[0] ?? 0;
  const hi =
    drifts[Math.floor(drifts.length * 0.88)] ?? drifts[drifts.length - 1] ?? 0;
  let weightSum = 0;
  let driftSum = 0;
  let volSum = 0;
  let volWeight = 0;
  for (const c of components) {
    const w = c.weight * c.confidence;
    const d = clamp(c.drift, lo, hi);
    weightSum += w;
    driftSum += d * w;
    if (c.vol != null) {
      volSum += c.vol * w;
      volWeight += w;
    }
  }
  const blendedDrift = clamp(
    weightSum > 0 ? driftSum / weightSum : median(drifts),
    -MAX_DAILY_DRIFT,
    MAX_DAILY_DRIFT,
  );
  const blendedVol = clamp(
    volWeight > 0 ? volSum / volWeight : dailyVol,
    MIN_SIGMA,
    MAX_SIGMA,
  );

  // Fat-tail uplift when IV or VIX regime is hotter than realized tape.
  const hotVol = Math.max(
    context.impliedDailyVol ?? 0,
    context.regimeDailyVol ?? 0,
    blendedVol,
  );
  const regimeVol = clamp(
    0.72 * blendedVol + 0.28 * hotVol,
    MIN_SIGMA,
    MAX_SIGMA,
  );

  const advanced = fitAdvancedForecast(window, DEFAULT_ADVANCED_SETTINGS);
  const pro = horizonStats(closes);
  const arSource = advanced ?? pro;
  const lastDelta = returns[returns.length - 1] ?? blendedDrift;
  const rho = arSource?.rho ?? 0;
  const kappa = arSource?.kappa ?? 0;
  const nextDelta =
    Math.abs(rho) < 0.04
      ? blendedDrift
      : blendedDrift + rho * (lastDelta - blendedDrift);

  const stats: HorizonStats = {
    last,
    dailyDrift: clamp(nextDelta, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT),
    dailyVol: regimeVol,
    kappa,
    thetaLog: blendedDrift,
    lastDelta,
    rho,
    avgBlend: 0.12,
  };

  const sourceTag =
    context.sources && context.sources.length
      ? ` · feeds ${context.sources.join("+")}`
      : "";

  return {
    stats,
    components,
    equationCount: components.length,
    note: `Ultra SDE ensemble · ${components.length} eqs (GBM, OU, Merton jumps, Heston-lite vol, EWMA/GARCH, Parkinson/GK/YZ, AR, Kalman, RSI/MACD/CCI, research${sourceTag}).`,
  };
}

/** Soften workstation sliders on top of the Ultra ensemble without dropping equations. */
export function applyUltraAdvancedSettings(
  base: HorizonStats,
  settings: AdvancedSettings,
): HorizonStats {
  const follow = settings.followThrough / 100;
  const accel = (settings.acceleration - DEFAULT_ADVANCED_SETTINGS.acceleration) / 100;
  const pressure = (settings.tapePressure - DEFAULT_ADVANCED_SETTINGS.tapePressure) / 100;
  const still = settings.stillZone / 100;
  const noise = settings.noiseFlatten / 100;

  let dailyDrift = base.dailyDrift * (0.85 + 0.3 * follow);
  dailyDrift += accel * base.dailyVol * 0.45;
  dailyDrift += pressure * base.dailyVol * 0.35;
  if (Math.abs(dailyDrift) < (0.08 + still * 0.22) * base.dailyVol) {
    dailyDrift *= 0.22;
  }
  dailyDrift *= 1 - noise * 0.18;

  const rho = clamp(base.rho * follow, -0.45, 0.9);
  const kappa = rho > 0.04 ? clamp(-Math.log(rho), 0.02, 1.4) : 0;
  // Noise flatten softens drift only — keep measured ensemble σ intact.
  const dailyVol = clamp(base.dailyVol, MIN_SIGMA, MAX_SIGMA);

  return {
    ...base,
    dailyDrift: clamp(dailyDrift, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT),
    dailyVol,
    rho,
    kappa,
    thetaLog: clamp(dailyDrift, -MAX_DAILY_DRIFT, MAX_DAILY_DRIFT),
    avgBlend: settings.averagePath / 100,
  };
}
