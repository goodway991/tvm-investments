"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScreenedStock, StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { StockSearchField, type SearchHit } from "@/components/StockSearchField";
import { BogenHeading } from "@/components/BogenProvider";
import { PortfolioAnalysis } from "@/components/PortfolioAnalysis";
import { POPULAR_WATCHLIST } from "@/lib/watchlist-symbols";

type DraftRow = {
  symbol: string;
  name: string;
  shares: string;
  averageCost: string;
  purchasedAt: string;
};

function money(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function signedMoney(value: number) {
  const formatted = money(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function PortfolioWorkbench({
  stocks,
  screened = [],
}: {
  stocks: StockCandidate[];
  screened?: ScreenedStock[];
}) {
  const {
    portfolio,
    positions,
    watchlist,
    updatePortfolio,
    savePosition,
    removePosition,
  } = useAuth();
  const [cash, setCash] = useState(String(portfolio.cash || 0));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<DraftRow | null>(null);
  const [hypothetical, setHypothetical] = useState<DraftRow[]>([]);

  useEffect(() => {
    setCash(String(portfolio.cash || 0));
  }, [portfolio.cash]);

  const quotes = useMemo(() => {
    const map = new Map<string, { name: string; price: number }>();
    for (const stock of POPULAR_WATCHLIST) {
      map.set(stock.symbol, { name: stock.name, price: 0 });
    }
    for (const stock of screened) {
      map.set(stock.symbol, { name: stock.name, price: stock.price });
    }
    for (const stock of stocks) {
      map.set(stock.symbol, { name: stock.name, price: stock.price });
    }
    return map;
  }, [screened, stocks]);

  const universe: SearchHit[] = useMemo(
    () =>
      Array.from(quotes.entries()).map(([symbol, row]) => ({
        symbol,
        name: row.name,
      })),
    [quotes],
  );

  const cashValue = Math.max(0, Number(cash) || 0);

  const liveRows = positions.map((position) => {
    const quote = quotes.get(position.symbol);
    const price = quote?.price || position.currentPrice || position.averageCost;
    const value = position.shares * price;
    const cost = position.shares * position.averageCost;
    return {
      ...position,
      name: quote?.name ?? position.symbol,
      price,
      value,
      pnl: value - cost,
    };
  });

  const holdingsValue = liveRows.reduce((sum, row) => sum + row.value, 0);
  const bookValue = cashValue + holdingsValue;

  const hypoRows = hypothetical.map((row) => {
    const shares = Math.max(0, Number(row.shares) || 0);
    const cost = Math.max(0, Number(row.averageCost) || 0);
    const price = quotes.get(row.symbol)?.price || cost;
    const value = shares * price;
    return {
      ...row,
      shares,
      cost,
      price,
      value,
      pnl: value - shares * cost,
    };
  });
  const hypoValue = hypoRows.reduce((sum, row) => sum + row.value, 0);
  const combined = bookValue + hypoValue;

  async function persistCash(nextCash = cashValue, extraValue = 0) {
    await updatePortfolio(nextCash, nextCash + holdingsValue + extraValue);
  }

  async function saveCurrent() {
    if (!currentDraft) return;
    const shares = Number(currentDraft.shares);
    const cost = Number(currentDraft.averageCost);
    if (!currentDraft.symbol || shares <= 0 || cost < 0) {
      setError("Enter a name, share count, and a buy price (or 0 if unknown).");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const currentPrice = quotes.get(currentDraft.symbol)?.price ?? cost;
      await savePosition({
        symbol: currentDraft.symbol,
        shares,
        averageCost: cost,
        currentPrice,
        purchasedAt: currentDraft.purchasedAt || null,
      });
      await persistCash(cashValue);
      setCurrentDraft(null);
      setMessage(`${currentDraft.symbol} saved to your book.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save that position.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveCash() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await persistCash();
      setMessage("Cash balance saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save cash.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(symbol: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await removePosition(symbol);
      await persistCash();
      setMessage(`${symbol} removed.`);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove that position.",
      );
    } finally {
      setSaving(false);
    }
  }

  function pickCurrent(hit: SearchHit) {
    const price = quotes.get(hit.symbol)?.price ?? 0;
    setCurrentDraft({
      symbol: hit.symbol,
      name: hit.name,
      shares: "1",
      averageCost: price ? String(price) : "",
      purchasedAt: "",
    });
  }

  function pickHypothetical(hit: SearchHit) {
    const price = quotes.get(hit.symbol)?.price ?? 0;
    setHypothetical((current) => {
      if (current.some((row) => row.symbol === hit.symbol)) return current;
      return [
        ...current,
        {
          symbol: hit.symbol,
          name: hit.name,
          shares: "1",
          averageCost: price ? String(price) : "",
          purchasedAt: "",
        },
      ];
    });
  }

  return (
    <div className="space-y-8">
      <section className="glass-strong rounded-[24px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">
              Current book
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">
              <BogenHeading id="portfolio">Portfolio</BogenHeading>
            </h2>
            <p className="mt-1 max-w-xl text-sm text-ink-soft">
              Log what you already hold — shares, the date you bought, or the
              price you paid. Values use today’s research tape when we have it.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-soft">Book value</p>
            <p className="font-display text-2xl font-bold text-ink">{money(bookValue)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[.7fr_1.3fr]">
          <div className="rounded-2xl bg-surface p-4">
            <label className="text-sm font-semibold text-ink" htmlFor="portfolio-cash">
              Cash
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-display text-xl font-bold text-violet">$</span>
              <input
                id="portfolio-cash"
                type="number"
                min={0}
                value={cash}
                onChange={(event) => setCash(event.target.value)}
                className="field min-w-0 flex-1 rounded-xl px-3 py-2 text-ink"
              />
              <button
                type="button"
                onClick={saveCash}
                disabled={saving}
                className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-sm font-semibold text-ink">Add a holding</p>
            <div className="mt-2">
              <StockSearchField
                universe={universe}
                watchlist={watchlist.symbols}
                onPick={pickCurrent}
                placeholder="Search the tape or your watchlist…"
              />
            </div>
            {currentDraft ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <p className="sm:col-span-4 font-display text-sm font-bold text-ink">
                  {currentDraft.symbol}
                  <span className="ml-2 text-xs font-medium text-ink-soft">
                    {currentDraft.name}
                  </span>
                </p>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={currentDraft.shares}
                  onChange={(event) =>
                    setCurrentDraft({ ...currentDraft, shares: event.target.value })
                  }
                  placeholder="Shares"
                  aria-label="Shares"
                  className="field rounded-xl px-3 py-2 text-sm text-ink"
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={currentDraft.averageCost}
                  onChange={(event) =>
                    setCurrentDraft({
                      ...currentDraft,
                      averageCost: event.target.value,
                    })
                  }
                  placeholder="Buy price"
                  aria-label="Buy price"
                  className="field rounded-xl px-3 py-2 text-sm text-ink"
                />
                <input
                  type="date"
                  value={currentDraft.purchasedAt}
                  onChange={(event) =>
                    setCurrentDraft({
                      ...currentDraft,
                      purchasedAt: event.target.value,
                    })
                  }
                  aria-label="Buy date"
                  className="field rounded-xl px-3 py-2 text-sm text-ink"
                />
                <button
                  type="button"
                  onClick={saveCurrent}
                  disabled={saving}
                  className="glass-violet rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save holding
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {liveRows.length === 0 ? (
            <p className="rounded-2xl bg-surface px-4 py-6 text-sm text-ink-soft">
              No holdings yet. Search a name from your watchlist or the scan
              universe, then save shares and a buy price or date.
            </p>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs text-ink-soft">
                  <th className="pb-3">Holding</th>
                  <th className="pb-3 text-right">Shares</th>
                  <th className="pb-3 text-right">Cost</th>
                  <th className="pb-3 text-right">Now</th>
                  <th className="pb-3 text-right">Value</th>
                  <th className="pb-3 text-right">P/L</th>
                  <th className="pb-3 text-right">Bought</th>
                  <th className="pb-3 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {liveRows.map((row) => (
                  <tr key={row.symbol} className="border-b border-ink/[0.06]">
                    <td className="py-3">
                      <p className="font-display font-bold text-ink">{row.symbol}</p>
                      <p className="text-[11px] text-ink-soft">{row.name}</p>
                    </td>
                    <td className="py-3 text-right text-ink-soft">{row.shares}</td>
                    <td className="py-3 text-right text-ink-soft">
                      {money(row.averageCost)}
                    </td>
                    <td className="py-3 text-right text-ink-soft">{money(row.price)}</td>
                    <td className="py-3 text-right font-semibold text-ink">
                      {money(row.value)}
                    </td>
                    <td
                      className={`py-3 text-right font-semibold ${
                        row.pnl >= 0 ? "text-emerald-600" : "text-coral"
                      }`}
                    >
                      {signedMoney(row.pnl)}
                    </td>
                    <td className="py-3 text-right text-ink-soft">
                      {row.purchasedAt || "—"}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => remove(row.symbol)}
                        disabled={saving}
                        className="text-sm font-semibold text-coral disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
      </section>

      <PortfolioAnalysis stocks={stocks} screened={screened} cash={cashValue} />

      <section className="glass-strong rounded-[24px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">
              Considering
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold text-ink">
              Names you’re considering
            </h3>
            <p className="mt-1 max-w-xl text-sm text-ink-soft">
              Try extra shares on top of the book above. This stays on this
              page until you refresh — it does not change your saved holdings.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-soft">If added</p>
            <p className="font-display text-2xl font-bold text-ink">{money(combined)}</p>
            <p
              className={`text-sm font-semibold ${
                hypoValue >= 0 ? "text-emerald-600" : "text-coral"
              }`}
            >
              {signedMoney(hypoValue)} vs current book
            </p>
          </div>
        </div>

        <div className="mt-5 max-w-xl">
          <StockSearchField
            universe={universe}
            watchlist={watchlist.symbols}
            onPick={pickHypothetical}
            placeholder="Add a name you’re considering…"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          {hypoRows.length === 0 ? (
            <p className="rounded-2xl bg-surface px-4 py-6 text-sm text-ink-soft">
              Click the search bar to see your watchlist, then pick a name to
              model extra shares.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs text-ink-soft">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Shares</th>
                  <th className="pb-3">Buy price</th>
                  <th className="pb-3">Buy date</th>
                  <th className="pb-3 text-right">Added value</th>
                  <th className="pb-3 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {hypothetical.map((row, index) => {
                  const live = hypoRows[index];
                  return (
                    <tr key={row.symbol} className="border-b border-ink/[0.06]">
                      <td className="py-3">
                        <p className="font-display font-bold text-ink">{row.symbol}</p>
                        <p className="text-[11px] text-ink-soft">{row.name}</p>
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.shares}
                          onChange={(event) =>
                            setHypothetical((current) =>
                              current.map((item) =>
                                item.symbol === row.symbol
                                  ? { ...item, shares: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          className="field w-24 rounded-xl px-3 py-2 text-sm text-ink"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.averageCost}
                          onChange={(event) =>
                            setHypothetical((current) =>
                              current.map((item) =>
                                item.symbol === row.symbol
                                  ? { ...item, averageCost: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          className="field w-28 rounded-xl px-3 py-2 text-sm text-ink"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="date"
                          value={row.purchasedAt}
                          onChange={(event) =>
                            setHypothetical((current) =>
                              current.map((item) =>
                                item.symbol === row.symbol
                                  ? { ...item, purchasedAt: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          className="field rounded-xl px-3 py-2 text-sm text-ink"
                        />
                      </td>
                      <td className="py-3 text-right font-semibold text-ink">
                        {money(live.value)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setHypothetical((current) =>
                              current.filter((item) => item.symbol !== row.symbol),
                            )
                          }
                          className="text-sm font-semibold text-coral"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
