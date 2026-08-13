import type { OHLCVBar } from "@/types";

export function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function computeBollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2
): { upper: number; middle: number; lower: number } | null {
  if (closes.length < period) return null;

  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance =
    slice.reduce((sum, c) => sum + (c - middle) ** 2, 0) / period;
  const sd = Math.sqrt(variance);

  return {
    upper: middle + stdDev * sd,
    middle,
    lower: middle - stdDev * sd,
  };
}

export function findSupportLevel(bars: OHLCVBar[], lookback = 60): number | null {
  if (bars.length < lookback) return null;

  const recent = bars.slice(-lookback);
  const lows = recent.map((b) => b.low).sort((a, b) => a - b);
  const candidate = lows[Math.floor(lows.length * 0.1)];

  const touches = recent.filter(
    (b) => Math.abs(b.low - candidate) / candidate < 0.015
  ).length;

  return touches >= 2 ? candidate : null;
}

export function detectGapDown(bars: OHLCVBar[]): {
  hasGap: boolean;
  gapPercent: number;
  prevClose: number;
} | null {
  if (bars.length < 2) return null;

  const today = bars[bars.length - 1];
  const yesterday = bars[bars.length - 2];
  const gapPercent = ((today.open - yesterday.close) / yesterday.close) * 100;

  return {
    hasGap: gapPercent < -1.5,
    gapPercent,
    prevClose: yesterday.close,
  };
}

export function averageVolume(bars: OHLCVBar[], period = 20): number {
  const slice = bars.slice(-period);
  if (slice.length === 0) return 0;
  return slice.reduce((s, b) => s + b.volume, 0) / slice.length;
}

export function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}
