"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useUpgrade } from "@/components/UpgradeProvider";
import { HorizonForecastChart } from "@/components/HorizonForecastChart";
import { PredictButton, usePredictUsage } from "@/components/PredictButton";
import { YahooPriceChart } from "@/components/TimeSeriesChart";
import type { ChartPoint, ChartRange } from "@/lib/chart-series";
import {
  MAX_HORIZON_TRADING_DAYS,
  type HorizonStats,
} from "@/lib/horizon-forecast";
import { compactCompanyName } from "@/components/StockDetailModal";
import { BogenHeading } from "@/components/BogenProvider";
import { NewBadge } from "@/components/NewBadge";
import { useSiteEra } from "@/components/SiteEraProvider";
import { authedFetch } from "@/lib/authed-fetch";
import type { DailySnapshot, OHLCVBar, StockCandidate } from "@/types";

const rangeCopy: Record<ChartRange, string> = {
  day: "Hours in today's session",
  month: "Trading dates this month",
  year: "Month-end closes this year",
};

export const WATCHLIST_PULSE_TITLE = "Watchlist pulse";

type PulseStock = {
  symbol: string;
  name: string;
  ohlcv: OHLCVBar[];
  yearCloses?: OHLCVBar[];
};

function FlashcardArrows({
  index,
  total,
  onPrev,
  onNext,
}: {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const atStart = index <= 0;
  const atEnd = index >= total - 1;
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={atStart}
          onClick={onPrev}
          className={`grid h-9 w-9 place-items-center rounded-full ${
            atStart
              ? "cursor-default text-zinc-300"
              : "text-ink hover:bg-violet/10 hover:text-violet"
          }`}
          aria-label="Previous watchlist stock"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M15 6 9 12l6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          disabled={atEnd}
          onClick={onNext}
          className={`grid h-9 w-9 place-items-center rounded-full ${
            atEnd
              ? "cursor-default text-zinc-300"
              : "text-ink hover:bg-violet/10 hover:text-violet"
          }`}
          aria-label="Next watchlist stock"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p className="mt-0.5 text-[11px] font-medium tabular-nums text-ink-soft">
        {total === 0 ? "0 / 0" : `${index + 1} / ${total}`}
      </p>
    </div>
  );
}

type PulseForecast = {
  history: ChartPoint[];
  stats: HorizonStats;
  note: string | null;
};

export function MarketPulse({
  snapshot,
  stocks,
  onOpenStock,
}: {
  snapshot: DailySnapshot;
  stocks: StockCandidate[];
  onOpenStock?: (symbol: string) => void;
}) {
  const { entitlement, watchlist, portfolio } = useAuth();
  const { rewind } = useSiteEra();
  const { openUpgrade } = useUpgrade();
  const { usage, busy: predictBusy, consume, plan } = usePredictUsage("pulse");
  const [index, setIndex] = useState(0);
  const [range, setRange] = useState<ChartRange>("month");
  const [predicting, setPredicting] = useState(false);
  const [horizonDays, setHorizonDays] = useState(MAX_HORIZON_TRADING_DAYS);
  const [committedDays, setCommittedDays] = useState(0);
  const [forecastBySymbol, setForecastBySymbol] = useState<Record<string, PulseForecast>>(
    {},
  );
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");

  const deck = useMemo<PulseStock[]>(() => {
    const bySymbol = new Map<string, PulseStock>();
    snapshot.screenedStocks.forEach((stock) => {
      bySymbol.set(stock.symbol, { symbol: stock.symbol, name: stock.name, ohlcv: [] });
    });
    stocks.forEach((stock) => {
      bySymbol.set(stock.symbol, {
        symbol: stock.symbol,
        name: stock.name,
        ohlcv: stock.ohlcv,
        yearCloses: stock.yearCloses,
      });
    });
    return watchlist.symbols.map(
      (symbol) =>
        bySymbol.get(symbol) ?? { symbol, name: symbol, ohlcv: [] },
    );
  }, [snapshot.screenedStocks, stocks, watchlist.symbols]);

  useEffect(() => {
    setIndex(0);
    setPredicting(false);
    setCommittedDays(0);
  }, [watchlist.symbols.join("|")]);

  useEffect(() => {
    setPredicting(false);
    setCommittedDays(0);
  }, [index]);

  const current = deck[Math.min(index, Math.max(deck.length - 1, 0))];

  async function loadForecast(symbol: string) {
    const cached = forecastBySymbol[symbol];
    if (cached?.history.length >= 3) return cached;
    setForecastLoading(true);
    setForecastError("");
    try {
      const params = new URLSearchParams({ symbol });
      if (rewind && snapshot.date) params.set("date", snapshot.date);
      const response = await authedFetch(`/api/forecast?${params}`);
      const payload = (await response.json()) as {
        history?: ChartPoint[];
        last?: number;
        dailyDrift?: number;
        dailyVol?: number;
        kappa?: number;
        thetaLog?: number;
        lastDelta?: number;
        rho?: number;
        note?: string | null;
        error?: string;
      };
      if (!response.ok || !payload.history?.length || payload.last == null) {
        throw new Error(payload.error || "Live forecast did not return enough data.");
      }
      const next: PulseForecast = {
        history: payload.history,
        stats: {
          last: payload.last,
          dailyDrift: payload.dailyDrift ?? 0,
          dailyVol: payload.dailyVol ?? 0.02,
          kappa: payload.kappa ?? 0,
          thetaLog: payload.thetaLog ?? payload.dailyDrift ?? 0,
          lastDelta: payload.lastDelta ?? 0,
          rho: payload.rho ?? 0,
        },
        note: payload.note ?? null,
      };
      setForecastBySymbol((currentMap) => ({ ...currentMap, [symbol]: next }));
      return next;
    } catch (error) {
      setForecastError(
        error instanceof Error ? error.message : "Live forecast failed.",
      );
      return null;
    } finally {
      setForecastLoading(false);
    }
  }

  async function onPredict() {
    if (!current) return;
    if (committedDays > 0) {
      setPredicting(false);
      setCommittedDays(0);
      setHorizonDays(MAX_HORIZON_TRADING_DAYS);
      return;
    }
    if (predicting && horizonDays <= 0) {
      setPredicting(false);
      setHorizonDays(MAX_HORIZON_TRADING_DAYS);
      return;
    }
    if (horizonDays <= 0) return;
    const result = await consume();
    if (!result.ok) {
      openUpgrade(plan === "pro" ? "ultra" : "pro");
      return;
    }
    const forecast = await loadForecast(current.symbol);
    if (forecast) {
      setCommittedDays(horizonDays);
      setPredicting(true);
    }
  }

  function onHorizonChange(days: number) {
    if (days <= 0) {
      setCommittedDays(0);
      setHorizonDays(0);
      return;
    }
    if (committedDays > 0) {
      setHorizonDays(Math.min(days, committedDays));
      return;
    }
    setHorizonDays(days);
  }

  const activeForecast = current ? forecastBySymbol[current.symbol] : undefined;

  return (
    <article id="watchlist-pulse" className="glass-strong scroll-mt-8 rounded-[24px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-ink">
              <BogenHeading id="watchlist-pulse">{WATCHLIST_PULSE_TITLE}</BogenHeading>
              <NewBadge feature="pulse" />
            </h2>
            {current ? (
              <button
                type="button"
                onClick={() => onOpenStock?.(current.symbol)}
                className="glass rounded-2xl px-3 py-1.5 text-left transition-all hover:-translate-y-0.5"
              >
                <p className="font-display text-base font-bold text-violet">
                  {current.symbol}
                </p>
                <p className="max-w-[10rem] truncate text-[11px] text-ink-soft">
                  {compactCompanyName(current.name)}
                </p>
              </button>
            ) : (
              <span className="font-display text-base font-bold text-violet">
                Watchlist
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {predicting
              ? "Two-week path from live closes, analyst targets, and a short-term model"
              : rangeCopy[range]}
          </p>
        </div>
        <FlashcardArrows
          index={index}
          total={deck.length}
          onPrev={() => setIndex((value) => Math.max(0, value - 1))}
          onNext={() => setIndex((value) => Math.min(deck.length - 1, value + 1))}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-soft">Watched stocks</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-2xl font-bold text-ink">
              {watchlist.symbols.length}
            </span>
            <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
              / {entitlement.watchlistLimit}
            </span>
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-soft">Portfolio value</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-2xl font-bold text-ink">
              $
              {portfolio.totalValue.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-xs font-semibold text-violet">
              saved
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label>
          <span className="sr-only">Watchlist pulse range</span>
          <select
            value={range}
            onChange={(event) => {
              setRange(event.target.value as ChartRange);
              setPredicting(false);
              setCommittedDays(0);
            }}
            disabled={predicting && committedDays > 0}
            className="glass cursor-pointer rounded-full px-3 py-1.5 text-xs text-ink-soft outline-none disabled:opacity-50"
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </label>
        <PredictButton
          plan={plan}
          kind="pulse"
          used={usage.pulse}
          busy={predictBusy || forecastLoading}
          predicted={
            committedDays > 0 || (predicting && horizonDays <= 0)
          }
          predictLabel="Pulse Predict"
          hideLabel="Hide prediction"
          onPredict={() => void onPredict()}
          onUpgrade={openUpgrade}
        />
      </div>

      <div className="mt-3 overflow-hidden">
        {deck.length === 0 ? (
          <p className="flex h-[190px] items-center justify-center px-6 text-center text-sm text-ink-soft">
            Add names on{" "}
            <Link href="/dashboard/watchlist" className="mx-1 font-semibold text-violet">
              Watchlist
            </Link>{" "}
            to flip through them here.
          </p>
        ) : predicting && current ? (
          forecastLoading ? (
            <p className="grid h-[190px] place-items-center text-sm text-ink-soft">
              Building a live path for {current.symbol}…
            </p>
          ) : forecastError ? (
            <p className="grid h-[190px] place-items-center px-6 text-center text-sm text-coral">
              {forecastError}
            </p>
          ) : activeForecast ? (
            <HorizonForecastChart
              history={activeForecast.history}
              statsOverride={activeForecast.stats}
              note={activeForecast.note}
              horizonDays={horizonDays}
              committedDays={committedDays}
              onHorizonChange={onHorizonChange}
              forecastPlan={
                plan === "ultra" ? "ultra" : plan === "pro" ? "pro" : undefined
              }
              height={190}
              tone="light"
              compact
            />
          ) : (
            <p className="grid h-[190px] place-items-center text-sm text-ink-soft">
              No live path yet.
            </p>
          )
        ) : current ? (
          <YahooPriceChart
            symbol={current.symbol}
            ohlcv={current.ohlcv}
            yearCloses={current.yearCloses}
            range={range}
            sessionDate={rewind ? snapshot.date : undefined}
            height={190}
          />
        ) : (
          <p className="grid h-[190px] place-items-center text-sm text-ink-soft">
            No price series yet.
          </p>
        )}
      </div>
    </article>
  );
}
