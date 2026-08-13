"use client";

import { useEffect, useMemo, useState } from "react";
import type { StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";

export function WatchlistPanel({
  stocks,
  externalQuery,
}: {
  stocks: StockCandidate[];
  externalQuery: string;
}) {
  const { entitlement, watchlist, updateWatchlist } = useAuth();
  const [draft, setDraft] = useState<string[]>(watchlist.symbols);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(watchlist.symbols);
  }, [watchlist.symbols]);

  const candidates = useMemo(() => {
    const unique = new Map(stocks.map((stock) => [stock.symbol, stock]));
    return Array.from(unique.values());
  }, [stocks]);

  const results = useMemo(() => {
    const query = externalQuery.trim().toLowerCase();
    return candidates
      .filter(
        (stock) =>
          !query ||
          stock.symbol.toLowerCase().includes(query) ||
          stock.name.toLowerCase().includes(query),
      )
      .slice(0, query ? 8 : 6);
  }, [candidates, externalQuery]);

  const cooldownActive =
    entitlement.plan === "free" &&
    watchlist.exists &&
    Boolean(
      watchlist.nextChangeAt &&
        watchlist.nextChangeAt.getTime() > Date.now(),
    );
  const changed =
    draft.length !== watchlist.symbols.length ||
    draft.some((symbol, index) => symbol !== watchlist.symbols[index]);

  function add(symbol: string) {
    setError("");
    setMessage("");
    if (draft.includes(symbol)) return;
    if (draft.length >= entitlement.watchlistLimit) {
      setError(
        `Your ${entitlement.plan} plan is limited to ${entitlement.watchlistLimit} watched stocks.`,
      );
      return;
    }
    setDraft((current) => [...current, symbol]);
  }

  function remove(symbol: string) {
    setError("");
    setMessage("");
    setDraft((current) => current.filter((item) => item !== symbol));
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateWatchlist(draft);
      setMessage(
        entitlement.plan === "free"
          ? "Watchlist saved. Free accounts can revise it again in seven days."
          : "Watchlist saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the watchlist.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-strong rounded-[24px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            {entitlement.plan} plan
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink">
            Watchlist
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Choose up to {entitlement.watchlistLimit} stocks.
            {entitlement.plan === "free" &&
              " After saving, the list is locked for seven days."}
          </p>
        </div>
        <span className="glass rounded-full px-3 py-1.5 text-sm font-semibold text-violet">
          {draft.length}/{entitlement.watchlistLimit}
        </span>
      </div>

      {watchlist.nextChangeAt && cooldownActive && (
        <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral">
          Changes unlock on {watchlist.nextChangeAt.toLocaleString()}.
        </p>
      )}

      <div className="mt-5 flex min-h-14 flex-wrap gap-2 rounded-2xl bg-[#f7f8fc] p-3">
        {draft.length ? (
          draft.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => remove(symbol)}
              disabled={cooldownActive}
              className="rounded-full bg-violet/10 px-3 py-1.5 text-sm font-semibold text-violet transition-colors hover:bg-coral/10 hover:text-coral disabled:cursor-not-allowed disabled:opacity-60"
              title={cooldownActive ? "Watchlist is in its seven-day lock period" : "Remove"}
            >
              {symbol} ×
            </button>
          ))
        ) : (
          <p className="px-1 py-2 text-sm text-ink-soft">
            No watched stocks yet. Add several below, then save once.
          </p>
        )}
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-ink">
          {externalQuery
            ? `Results for “${externalQuery}”`
            : "Available tracked stocks"}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((stock) => {
            const selected = draft.includes(stock.symbol);
            return (
              <button
                key={stock.symbol}
                type="button"
                onClick={() =>
                  selected ? remove(stock.symbol) : add(stock.symbol)
                }
                disabled={cooldownActive}
                className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "border-violet/30 bg-violet/10"
                    : "border-ink/[0.06] bg-white hover:-translate-y-0.5 hover:border-violet/20"
                }`}
              >
                <span>
                  <span className="block font-display font-bold text-ink">
                    {stock.symbol}
                  </span>
                  <span className="block max-w-36 truncate text-xs text-ink-soft">
                    {stock.name}
                  </span>
                </span>
                <span className="text-sm font-semibold text-violet">
                  {selected ? "Added" : "Add"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!changed || cooldownActive || saving}
          className="glass-violet rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save watchlist"}
        </button>
        {changed && !cooldownActive && (
          <button
            type="button"
            onClick={() => setDraft(watchlist.symbols)}
            className="glass rounded-full px-5 py-3 text-sm font-medium text-ink-soft hover:text-violet"
          >
            Reset draft
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm text-emerald-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
