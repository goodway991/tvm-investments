"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useUpgrade } from "@/components/UpgradeProvider";
import { HorizonForecastChart } from "@/components/HorizonForecastChart";
import { YahooPriceChart } from "@/components/TimeSeriesChart";
import type { ChartPoint, ChartRange } from "@/lib/chart-series";
import type { HorizonStats } from "@/lib/horizon-forecast";
import { compactCompanyName } from "@/components/StockDetailModal";
import { BogenHeading } from "@/components/BogenProvider";
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
  const { openUpgrade } = useUpgrade();
  const isPro = entitlement.plan === "pro";
  const [index, setIndex] = useState(0);
  const [range, setRange] = useState<ChartRange>("month");
  const [predicting, setPredicting] = useState(false);
  const [horizonDays, setHorizonDays] = useState(5);
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
  }, [watchlist.symbols.join("|")]);

  useEffect(() => {
    setPredicting(false);
  }, [index]);

  useEffect(() => {
    if (!isPro) setPredicting(false);
  }, [isPro]);

  const current = deck[Math.min(index, Math.max(deck.length - 1, 0))];

  async function loadForecast(symbol: string) {
    const cached = forecastBySymbol[symbol];
    if (cached?.history.length >= 3) return cached;
    setForecastLoading(true);
    setForecastError("");
    try {
      const params = new URLSearchParams({ symbol });
      if (snapshot.date) params.set("date", snapshot.date);
      const response = await fetch(`/api/forecast?${params}`);
      const payload = (await response.json()) as {
        history?: ChartPoint[];
        last?: number;
        dailyDrift?: number;
        dailyVol?: number;
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
    if (!isPro) {
      openUpgrade();
      return;
    }
    if (predicting) {
      setPredicting(false);
      return;
    }
    const forecast = await loadForecast(current.symbol);
    if (forecast) setPredicting(true);
  }

  const activeForecast = current ? forecastBySymbol[current.symbol] : undefined;

  return (
    <article id="watchlist-pulse" className="glass-strong scroll-mt-8 rounded-[24px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-lg font-semibold text-ink">
              <BogenHeading id="watchlist-pulse">{WATCHLIST_PULSE_TITLE}</BogenHeading>
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
            }}
            disabled={predicting}
            className="glass cursor-pointer rounded-full px-3 py-1.5 text-xs text-ink-soft outline-none disabled:opacity-50"
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void onPredict()}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            predicting
              ? "bg-ink text-white"
              : "bg-violet text-white hover:bg-violet/90"
          }`}
        >
          {predicting ? "Hide prediction" : isPro ? "Short term predict" : "Short term predict · Pro"}
        </button>
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
              onHorizonChange={setHorizonDays}
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
            sessionDate={snapshot.date}
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
