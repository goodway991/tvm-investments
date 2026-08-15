"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { HorizonForecastChart } from "@/components/HorizonForecastChart";
import type { ChartPoint } from "@/lib/chart-series";
import { formatPrice } from "@/lib/chart-series";
import { getClientFirestore } from "@/lib/firebase/client";
import { BogenHeading } from "@/components/BogenProvider";
import {
  HORIZON_STARTING_CASH,
  buildPortfolioSeries,
  horizonStats,
  projectPrice,
  type HorizonStats,
} from "@/lib/horizon-forecast";

const MAX_POSITIONS = 40;

export type HorizonQuote = {
  symbol: string;
  name: string;
  price: number;
};

type HorizonPosition = {
  symbol: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
};

type LoadedForecast = {
  history: ChartPoint[];
  stats: HorizonStats;
  note: string | null;
};

export function HorizonSuiteClient({ quotes }: { quotes: HorizonQuote[] }) {
  const { user, watchlist } = useAuth();
  const quoteMap = useMemo(
    () => new Map(quotes.map((quote) => [quote.symbol, quote])),
    [quotes],
  );
  const watchSymbols = watchlist.symbols;
  const [cash, setCash] = useState(HORIZON_STARTING_CASH);
  const [positions, setPositions] = useState<HorizonPosition[]>([]);
  const [selected, setSelected] = useState(watchSymbols[0] ?? quotes[0]?.symbol ?? "AAPL");
  const [shares, setShares] = useState("1");
  const [horizonDays, setHorizonDays] = useState(5);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [forecasts, setForecasts] = useState<Record<string, LoadedForecast>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [simExists, setSimExists] = useState(false);
  const [simReady, setSimReady] = useState(false);

  useEffect(() => {
    if (!watchSymbols.includes(selected) && watchSymbols[0]) {
      setSelected(watchSymbols[0]);
    }
  }, [selected, watchSymbols]);

  useEffect(() => {
    const db = getClientFirestore();
    if (!db || !user) return;
    let cancelled = false;
    void Promise.all([
      getDoc(doc(db, "horizon_sims", user.uid)),
      getDocs(collection(db, "horizon_sims", user.uid, "positions")),
    ]).then(([simSnap, posSnap]) => {
      if (cancelled) return;
      setSimExists(simSnap.exists());
      setSimReady(true);
      if (simSnap.exists()) {
        setCash(Number(simSnap.data().cash) || 0);
      }
      setPositions(
        posSnap.docs.map((position) => {
          const data = position.data();
          return {
            symbol: String(data.symbol),
            shares: Number(data.shares) || 0,
            averageCost: Number(data.averageCost) || 0,
            currentPrice: Number(data.currentPrice) || 0,
          };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const db = getClientFirestore();
    if (!db || !user || !simReady || simExists) return;
    void setDoc(doc(db, "horizon_sims", user.uid), {
      uid: user.uid,
      cash: HORIZON_STARTING_CASH,
      totalValue: HORIZON_STARTING_CASH,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).then(() => {
      setSimExists(true);
      setCash(HORIZON_STARTING_CASH);
    });
  }, [simExists, simReady, user]);

  useEffect(() => {
    const symbols = Array.from(
      new Set([selected, ...positions.map((position) => position.symbol)].filter(Boolean)),
    );
    let cancelled = false;
    async function load() {
      const next: Record<string, LoadedForecast> = {};
      await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const response = await fetch(
              `/api/forecast?symbol=${encodeURIComponent(symbol)}`,
            );
            const payload = (await response.json()) as {
              history?: ChartPoint[];
              last?: number;
              dailyDrift?: number;
              dailyVol?: number;
              note?: string | null;
            };
            if (!response.ok || !payload.history?.length || payload.last == null) return;
            next[symbol] = {
              history: payload.history,
              stats: {
                last: payload.last,
                dailyDrift: payload.dailyDrift ?? 0,
                dailyVol: payload.dailyVol ?? 0.02,
              },
              note: payload.note ?? null,
            };
          } catch {
            /* keep missing */
          }
        }),
      );
      if (cancelled) return;
      setForecasts(next);
      setHistory(next[selected]?.history ?? []);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [positions, selected]);

  const lastPrice =
    history[history.length - 1]?.value ?? quoteMap.get(selected)?.price ?? 0;
  const selectedPosition = positions.find((position) => position.symbol === selected);
  const liveValue = positions.reduce((total, position) => {
    const price =
      forecasts[position.symbol]?.history.at(-1)?.value ??
      quoteMap.get(position.symbol)?.price ??
      position.currentPrice ??
      position.averageCost;
    return total + position.shares * price;
  }, 0);
  const projectedHoldings = positions.reduce(
    (range, position) => {
      const forecast = forecasts[position.symbol];
      const series = forecast?.history ?? [];
      const stats = forecast?.stats ?? horizonStats(series.map((point) => point.value));
      const price =
        series.at(-1)?.value ??
        quoteMap.get(position.symbol)?.price ??
        position.currentPrice;
      if (!stats) {
        const marked = position.shares * price;
        return {
          predicted: range.predicted + marked,
          low: range.low + marked,
          high: range.high + marked,
        };
      }
      const projection = projectPrice(stats, horizonDays);
      return {
        predicted: range.predicted + position.shares * projection.predicted,
        low: range.low + position.shares * projection.low,
        high: range.high + position.shares * projection.high,
      };
    },
    { predicted: 0, low: 0, high: 0 },
  );
  const bookValue = cash + liveValue;
  const projectedValue = cash + projectedHoldings.predicted;
  const portfolioHistory = useMemo(
    () =>
      buildPortfolioSeries(
        positions.map((position) => ({
          shares: position.shares,
          history: forecasts[position.symbol]?.history ?? [],
        })),
        cash,
      ),
    [positions, forecasts, cash],
  );
  const selectedForecast = forecasts[selected];
  const chartHistory =
    positions.length > 0 ? portfolioHistory : selectedForecast?.history ?? history;
  const chartStats = (() => {
    if (positions.length === 0) return selectedForecast?.stats;
    if (!(bookValue > 0) || !(liveValue > 0)) return undefined;
    let drift = 0;
    let vol = 0;
    positions.forEach((position) => {
      const forecast = forecasts[position.symbol];
      if (!forecast) return;
      const price = forecast.history.at(-1)?.value ?? forecast.stats.last;
      const weight = (position.shares * price) / liveValue;
      drift += weight * forecast.stats.dailyDrift;
      vol += weight * forecast.stats.dailyVol;
    });
    const equityShare = liveValue / bookValue;
    return {
      last: bookValue,
      dailyDrift: drift * equityShare,
      dailyVol: vol * equityShare,
    };
  })();
  const chartNote =
    positions.length > 0
      ? "Book path uses live closes and analyst targets on each lot."
      : selectedForecast?.note;

  async function writeSim(nextCash: number, nextPositions: HorizonPosition[]) {
    const db = getClientFirestore();
    if (!db || !user) {
      setCash(nextCash);
      setPositions(nextPositions);
      return;
    }
    const holdings = nextPositions.reduce(
      (total, position) => total + position.shares * position.currentPrice,
      0,
    );
    const payload = {
      uid: user.uid,
      cash: nextCash,
      totalValue: nextCash + holdings,
      updatedAt: serverTimestamp(),
      ...(simExists ? {} : { createdAt: serverTimestamp() }),
    };
    await setDoc(doc(db, "horizon_sims", user.uid), payload, { merge: true });
  }

  async function buy() {
    const count = Number(shares);
    if (!selected || !(count > 0) || !(lastPrice > 0)) {
      setError("Pick a watchlist name and a share count.");
      return;
    }
    const cost = count * lastPrice;
    if (cost > cash) {
      setError("Not enough paper cash for that buy.");
      return;
    }
    if (
      !positions.some((position) => position.symbol === selected) &&
      positions.length >= MAX_POSITIONS
    ) {
      setError("Horizon Suite can hold 40 paper names at a time.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const existing = positions.find((position) => position.symbol === selected);
      const nextShares = (existing?.shares ?? 0) + count;
      const nextCost =
        ((existing?.shares ?? 0) * (existing?.averageCost ?? 0) + cost) / nextShares;
      const nextPosition: HorizonPosition = {
        symbol: selected,
        shares: nextShares,
        averageCost: nextCost,
        currentPrice: lastPrice,
      };
      const nextPositions = [
        ...positions.filter((position) => position.symbol !== selected),
        nextPosition,
      ];
      const nextCash = cash - cost;
      setCash(nextCash);
      setPositions(nextPositions);
      const db = getClientFirestore();
      if (db && user) {
        if (!simExists) {
          try {
            await setDoc(doc(db, "horizon_sims", user.uid), {
              uid: user.uid,
              cash: HORIZON_STARTING_CASH,
              totalValue: HORIZON_STARTING_CASH,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch {
            /* already created */
          }
          setSimExists(true);
        }
        await writeSim(nextCash, nextPositions);
        await setDoc(doc(db, "horizon_sims", user.uid, "positions", selected), {
          uid: user.uid,
          symbol: selected,
          shares: nextShares,
          averageCost: nextCost,
          currentPrice: lastPrice,
          updatedAt: serverTimestamp(),
        });
      }
      setMessage(`Bought ${count} ${selected} at ${formatPrice(lastPrice)}.`);
    } catch (buyError) {
      setError(buyError instanceof Error ? buyError.message : "Buy did not save.");
    } finally {
      setSaving(false);
    }
  }

  async function sell(symbol: string) {
    const position = positions.find((item) => item.symbol === symbol);
    if (!position) return;
    const series = forecasts[symbol]?.history ?? [];
    const price =
      series.at(-1)?.value ?? quoteMap.get(symbol)?.price ?? position.currentPrice;
    const proceeds = position.shares * price;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const nextPositions = positions.filter((item) => item.symbol !== symbol);
      const nextCash = cash + proceeds;
      setCash(nextCash);
      setPositions(nextPositions);
      const db = getClientFirestore();
      if (db && user) {
        await deleteDoc(doc(db, "horizon_sims", user.uid, "positions", symbol));
        await writeSim(nextCash, nextPositions);
      }
      setMessage(`Sold ${position.shares} ${symbol} at ${formatPrice(price)}.`);
    } catch (sellError) {
      setError(sellError instanceof Error ? sellError.message : "Sell did not save.");
    } finally {
      setSaving(false);
    }
  }

  async function resetBook() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setCash(HORIZON_STARTING_CASH);
      setPositions([]);
      const db = getClientFirestore();
      if (db && user) {
        const batch = writeBatch(db);
        positions.forEach((position) => {
          batch.delete(doc(db, "horizon_sims", user.uid, "positions", position.symbol));
        });
        const simRef = doc(db, "horizon_sims", user.uid);
        if (simExists) {
          batch.update(simRef, {
            cash: HORIZON_STARTING_CASH,
            totalValue: HORIZON_STARTING_CASH,
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(simRef, {
            uid: user.uid,
            cash: HORIZON_STARTING_CASH,
            totalValue: HORIZON_STARTING_CASH,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
      setMessage("Paper book reset to $10,000.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Reset did not save.");
    } finally {
      setSaving(false);
    }
  }

  const quoteName = quoteMap.get(selected)?.name ?? selected;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            Paper desk
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">
            <BogenHeading id="horizon">Horizon Suite</BogenHeading>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void resetBook()}
          disabled={saving}
          className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink disabled:opacity-50"
        >
          Reset book
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Cash" value={formatPrice(cash)} />
        <Metric label="Portfolio now" value={formatPrice(bookValue)} />
        <Metric
          label={horizonDays === 0 ? "Now" : `Could grow to in ${horizonDays.toFixed(1)} days`}
          value={formatPrice(projectedValue)}
          hint={
            horizonDays === 0
              ? undefined
              : `${formatPrice(cash + projectedHoldings.low)} – ${formatPrice(cash + projectedHoldings.high)}`
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <div className="glass-strong space-y-5 rounded-[24px] p-5">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Watchlist ticket</h2>
            <p className="mt-1 text-sm text-ink-soft">
              These are paper fills at the last close. They do not touch your
              real portfolio.
            </p>
          </div>

          {watchSymbols.length === 0 ? (
            <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-ink-soft">
              Add names on{" "}
              <Link href="/dashboard/watchlist" className="font-semibold text-violet">
                Watchlist
              </Link>{" "}
              first, then come back to buy them here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {watchSymbols.map((symbol) => {
                const active = symbol === selected;
                return (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => setSelected(symbol)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                      active
                        ? "bg-violet text-white"
                        : "bg-surface text-ink hover:bg-violet/10"
                    }`}
                  >
                    {symbol}
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl bg-surface p-4">
            <p className="text-sm font-semibold text-ink">
              {selected} · {quoteName}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Last close {lastPrice ? formatPrice(lastPrice) : "loading…"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                step="any"
                value={shares}
                onChange={(event) => setShares(event.target.value)}
                aria-label="Share count"
                className="field w-28 rounded-xl px-3 py-2 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => void buy()}
                disabled={
                  saving ||
                  !watchSymbols.includes(selected) ||
                  !lastPrice
                }
                className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Buy
              </button>
              {selectedPosition && (
                <button
                  type="button"
                  onClick={() => void sell(selected)}
                  disabled={saving}
                  className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink-soft disabled:opacity-50"
                >
                  Sell
                </button>
              )}
            </div>
            {lastPrice > 0 && Number(shares) > 0 && (
              <p className="mt-2 text-xs text-ink-soft">
                Ticket {formatPrice(Number(shares) * lastPrice)}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Open paper lots</h3>
            {positions.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No lots yet. Buy a watchlist name to start.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {positions.map((position) => {
                  const mark =
                    forecasts[position.symbol]?.history.at(-1)?.value ??
                    quoteMap.get(position.symbol)?.price ??
                    position.currentPrice;
                  const pnl = (mark - position.averageCost) * position.shares;
                  const signed =
                    pnl >= 0
                      ? `+${formatPrice(pnl)}`
                      : `-${formatPrice(Math.abs(pnl))}`;
                  return (
                    <li
                      key={position.symbol}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-3 py-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(position.symbol)}
                        className="text-left"
                      >
                        <p className="text-sm font-semibold text-ink">{position.symbol}</p>
                        <p className="text-xs text-ink-soft">
                          {position.shares} sh · avg {formatPrice(position.averageCost)}
                        </p>
                      </button>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">{formatPrice(mark)}</p>
                        <p className={`text-xs ${pnl >= 0 ? "text-gain" : "text-loss"}`}>
                          {signed}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {(message || error) && (
            <p className={`text-sm ${error ? "text-coral" : "text-violet"}`}>
              {error || message}
            </p>
          )}
        </div>

        <div className="glass-strong rounded-[24px] p-5">
          <p className="text-sm font-semibold text-ink">
            {positions.length > 0 ? "Portfolio projection" : `${selected} projected close`}
          </p>
          <div className="mt-3">
            <HorizonForecastChart
              history={chartHistory}
              statsOverride={chartStats}
              note={chartNote}
              horizonDays={horizonDays}
              onHorizonChange={setHorizonDays}
              tone="light"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="glass-strong rounded-[22px] p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
