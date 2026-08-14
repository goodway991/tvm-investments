"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CompanyReport, ScreenedStock, StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  FlaggedPickButton,
  StockDetailModal,
  screenedToCandidate,
} from "@/components/StockDetailModal";

type WatchlistStock = Pick<StockCandidate, "symbol" | "name">;

export function WatchlistPanel({
  stocks,
  quoted = [],
  screened = [],
  reports = [],
  sessionDate,
  externalQuery = "",
}: {
  stocks: WatchlistStock[];
  quoted?: StockCandidate[];
  screened?: ScreenedStock[];
  reports?: CompanyReport[];
  sessionDate?: string;
  externalQuery?: string;
}) {
  const { entitlement, watchlist, updateWatchlist } = useAuth();
  const [draft, setDraft] = useState<string[]>(watchlist.symbols);
  const [compact, setCompact] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
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

  const quotedBySymbol = useMemo(
    () => new Map(quoted.map((stock) => [stock.symbol, stock])),
    [quoted],
  );
  const screenedBySymbol = useMemo(
    () => new Map(screened.map((stock) => [stock.symbol, stock])),
    [screened],
  );

  function detailFor(symbol: string) {
    return (
      quotedBySymbol.get(symbol) ??
      (screenedBySymbol.has(symbol)
        ? screenedToCandidate(screenedBySymbol.get(symbol)!)
        : null)
    );
  }

  const results = useMemo(() => {
    const query = externalQuery.trim().toLowerCase();
    return candidates.filter(
      (stock) =>
        !query ||
        stock.symbol.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query),
    );
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

  const selectedStock = selectedSymbol ? detailFor(selectedSymbol) : null;
  const selectedReport = reports.find((report) => report.symbol === selectedSymbol);

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
        <div className="flex flex-wrap items-center gap-2">
          <span className="glass rounded-full px-3 py-1.5 text-sm font-semibold text-violet">
            {draft.length}/{entitlement.watchlistLimit}
          </span>
          <button
            type="button"
            onClick={() => setCompact((value) => !value)}
            className="glass rounded-full px-4 py-1.5 text-sm font-semibold text-ink hover:text-violet"
          >
            {compact ? "Expand" : "Compact"}
          </button>
          <Link
            href="/dashboard#watchlist-pulse"
            className="glass-violet rounded-full px-4 py-1.5 text-sm font-semibold text-white"
          >
            View in Watchlist pulse
          </Link>
        </div>
      </div>

      {watchlist.nextChangeAt && cooldownActive && (
        <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral">
          Changes unlock on {watchlist.nextChangeAt.toLocaleString()}.
        </p>
      )}

      {compact ? (
        <div className="mt-5">
          {draft.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {draft.map((symbol, index) => {
                const stock = detailFor(symbol);
                if (stock) {
                  return (
                    <FlaggedPickButton
                      key={symbol}
                      stock={stock}
                      index={index}
                      onOpen={() => setSelectedSymbol(symbol)}
                    />
                  );
                }
                return (
                  <div
                    key={symbol}
                    className="glass flex items-center justify-between rounded-2xl p-4"
                  >
                    <div>
                      <p className="font-display font-bold text-violet">{symbol}</p>
                      <p className="text-[11px] text-ink-soft">Watched</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(symbol)}
                      disabled={cooldownActive}
                      className="text-sm font-semibold text-coral disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl bg-surface px-4 py-6 text-sm text-ink-soft">
              No watched stocks yet. Expand to add names, then save.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mt-5 flex min-h-14 flex-wrap gap-2 rounded-2xl bg-surface p-3">
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
                : "Available stocks"}
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
                        : "border-ink/[0.06] bg-chrome hover:-translate-y-0.5 hover:border-violet/20"
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
        </>
      )}

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

      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          report={selectedReport}
          sessionDate={sessionDate}
          onClose={() => setSelectedSymbol(null)}
        />
      )}
    </div>
  );
}
