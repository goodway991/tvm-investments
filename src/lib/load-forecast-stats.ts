"use client";

import { authedFetch } from "@/lib/authed-fetch";
import type { HorizonStats } from "@/lib/horizon-forecast";

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; stats: HorizonStats | null }>();

type ForecastPayload = {
  last?: number;
  dailyDrift?: number;
  dailyVol?: number;
  kappa?: number;
  thetaLog?: number;
  lastDelta?: number;
  rho?: number;
  avgBlend?: number;
  error?: string;
};

function parseStats(payload: ForecastPayload): HorizonStats | null {
  if (!(typeof payload.last === "number" && payload.last > 0)) return null;
  return {
    last: payload.last,
    dailyDrift: payload.dailyDrift ?? 0,
    dailyVol: payload.dailyVol ?? 0.02,
    kappa: payload.kappa ?? 0,
    thetaLog: payload.thetaLog ?? payload.dailyDrift ?? 0,
    lastDelta: payload.lastDelta ?? 0,
    rho: payload.rho ?? 0,
    avgBlend: payload.avgBlend ?? 0,
  };
}

export async function loadForecastStats(
  symbols: string[],
): Promise<Map<string, HorizonStats>> {
  const unique = [
    ...new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => symbol.length > 0),
    ),
  ];
  const out = new Map<string, HorizonStats>();
  await Promise.all(
    unique.map(async (symbol) => {
      const hit = cache.get(symbol);
      if (hit && Date.now() - hit.at < CACHE_MS) {
        if (hit.stats) out.set(symbol, hit.stats);
        return;
      }
      try {
        const response = await authedFetch(
          `/api/forecast?symbol=${encodeURIComponent(symbol)}`,
        );
        const payload = (await response.json()) as ForecastPayload;
        const stats = response.ok ? parseStats(payload) : null;
        cache.set(symbol, { at: Date.now(), stats });
        if (stats) out.set(symbol, stats);
      } catch {
        cache.set(symbol, { at: Date.now(), stats: null });
      }
    }),
  );
  return out;
}
