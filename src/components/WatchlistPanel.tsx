"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { CompanyReport, ScreenedStock, StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  FlaggedPickButton,
  StockDetailModal,
  screenedToCandidate,
} from "@/components/StockDetailModal";
import { TVMIcon } from "@/components/TVMBrand";
import { BogenHeading } from "@/components/BogenProvider";
import { pageSlice, StockPager } from "@/components/StockPager";
import { authedFetch } from "@/lib/authed-fetch";

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
  const [query, setQuery] = useState(externalQuery);
  const [remote, setRemote] = useState<WatchlistStock[]>([]);
  const [knownNames, setKnownNames] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setDraft(watchlist.symbols);
  }, [watchlist.symbols]);

  useEffect(() => {
    setQuery(externalQuery);
  }, [externalQuery]);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 1) {
      setRemote([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await authedFetch(
          `/api/yahoo/search?q=${encodeURIComponent(needle)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as {
          results?: WatchlistStock[];
        };
        setRemote(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (!controller.signal.aborted) setRemote([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const candidates = useMemo(() => {
    const unique = new Map(stocks.map((stock) => [stock.symbol, stock]));
    for (const [symbol, name] of Object.entries(knownNames)) {
      if (!unique.has(symbol)) unique.set(symbol, { symbol, name });
    }
    for (const stock of remote) {
      if (!unique.has(stock.symbol)) unique.set(stock.symbol, stock);
    }
    return Array.from(unique.values());
  }, [knownNames, remote, stocks]);

  const quotedBySymbol = useMemo(
    () => new Map(quoted.map((stock) => [stock.symbol, stock])),
    [quoted],
  );
  const screenedBySymbol = useMemo(
    () => new Map(screened.map((stock) => [stock.symbol, stock])),
    [screened],
  );

  function detailFor(symbol: string) {
    const quoted = quotedBySymbol.get(symbol);
    if (quoted) return quoted;
    if (screenedBySymbol.has(symbol)) {
      return screenedToCandidate(screenedBySymbol.get(symbol)!);
    }
    const named = stocks.find((stock) => stock.symbol === symbol);
    return screenedToCandidate({
      symbol,
      name: named?.name ?? symbol,
      sector: "",
      industry: "",
      price: 0,
      changePercent: 0,
      volume: 0,
      compositeScore: 0,
      shortTermScore: 0,
      longTermScore: 0,
      fundamentals: {
        peRatio: null,
        beta: null,
        eps: null,
        marketCap: null,
        avgVolume: null,
        shortInterestPct: null,
      },
    });
  }

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return candidates.filter(
      (stock) =>
        !needle ||
        stock.symbol.toLowerCase().includes(needle) ||
        stock.name.toLowerCase().includes(needle),
    );
  }, [candidates, query]);

  useEffect(() => {
    setPage(0);
  }, [query, compact]);

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
  const compactPaged = pageSlice(draft, page);
  const resultsPaged = pageSlice(results, page);

  function add(stock: WatchlistStock) {
    setError("");
    setMessage("");
    if (draft.includes(stock.symbol)) return;
    if (draft.length >= entitlement.watchlistLimit) {
      setError(
        `Your ${entitlement.plan} plan is limited to ${entitlement.watchlistLimit} watched stocks.`,
      );
      return;
    }
    setKnownNames((current) => ({
      ...current,
      [stock.symbol]: stock.name || stock.symbol,
    }));
    setDraft((current) => [...current, stock.symbol]);
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
            <BogenHeading id="watchlist">Watchlist</BogenHeading>
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Choose up to {entitlement.watchlistLimit} stocks.
            {entitlement.plan === "free" &&
              " After saving, the list is locked for seven days."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="flex items-center gap-2"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (query.trim()) setCompact(false);
            }}
          >
            <label className="relative">
              <span className="sr-only">Search stocks</span>
              <TVMIcon
                name="search"
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (event.target.value.trim()) setCompact(false);
                }}
                placeholder="Search stocks…"
                className="field w-44 rounded-2xl bg-white py-2.5 pl-11 pr-4 text-sm text-ink placeholder:text-ink-soft/60 sm:w-52"
              />
            </label>
            <button
              type="submit"
              className="glass-violet rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </form>
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
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {compactPaged.slice.map((symbol, index) => {
                const stock = detailFor(symbol);
                if (stock) {
                  return (
                    <div key={symbol} className="relative">
                      <FlaggedPickButton
                        stock={stock}
                        index={compactPaged.page * 10 + index}
                        onOpen={() => setSelectedSymbol(symbol)}
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          remove(symbol);
                        }}
                        disabled={cooldownActive}
                        title={
                          cooldownActive
                            ? "Watchlist is in its seven-day lock period"
                            : "Remove"
                        }
                        aria-label={`Remove ${symbol}`}
                        className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-chrome/80 text-lg leading-none text-ink-soft hover:bg-coral/15 hover:text-coral disabled:opacity-60"
                      >
                        ×
                      </button>
                    </div>
                  );
                }
                return (
                  <div
                    key={symbol}
                    className="glass flex items-center justify-between rounded-2xl p-4"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSymbol(symbol)}
                      className="text-left"
                    >
                      <p className="font-display font-bold text-violet hover:underline">
                        {symbol}
                      </p>
                      <p className="text-[11px] text-ink-soft">Watched</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(symbol)}
                      disabled={cooldownActive}
                      title={
                        cooldownActive
                          ? "Watchlist is in its seven-day lock period"
                          : "Remove"
                      }
                      aria-label={`Remove ${symbol}`}
                      className="grid h-7 w-7 place-items-center rounded-full text-lg leading-none text-coral disabled:opacity-60"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              </div>
              <StockPager
                page={compactPaged.page}
                pages={compactPaged.pages}
                onPage={setPage}
              />
            </>
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
                <span
                  key={symbol}
                  className="inline-flex items-center rounded-full bg-violet/10 text-sm font-semibold text-violet"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSymbol(symbol)}
                    className="rounded-l-full py-1.5 pl-3 pr-1.5 hover:underline"
                  >
                    {symbol}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(symbol)}
                    disabled={cooldownActive}
                    title={
                      cooldownActive
                        ? "Watchlist is in its seven-day lock period"
                        : "Remove"
                    }
                    aria-label={`Remove ${symbol}`}
                    className="rounded-r-full py-1.5 pl-1 pr-3 text-violet transition-colors hover:text-coral disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <p className="px-1 py-2 text-sm text-ink-soft">
                No watched stocks yet. Add several below, then save once.
              </p>
            )}
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-ink">
              {query.trim()
                ? searching
                  ? `Searching “${query.trim()}”`
                  : `Results for “${query.trim()}”`
                : "Available stocks"}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {query.trim()
                ? `${results.length} match${results.length === 1 ? "" : "es"} · 10 per page`
                : `${candidates.length.toLocaleString()} names in today’s scan · 10 per page`}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.length ? (
                resultsPaged.slice.map((stock) => {
                const selected = draft.includes(stock.symbol);
                return (
                  <div
                    key={stock.symbol}
                    className={`flex items-center justify-between rounded-2xl border p-3 ${
                      selected
                        ? "border-violet/30 bg-violet/10"
                        : "border-ink/[0.06] bg-chrome"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSymbol(stock.symbol)}
                      className="min-w-0 text-left"
                    >
                      <span className="block font-display font-bold text-violet hover:underline">
                        {stock.symbol}
                      </span>
                      <span className="block max-w-36 truncate text-xs text-ink-soft hover:underline">
                        {stock.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        selected ? remove(stock.symbol) : add(stock)
                      }
                      disabled={cooldownActive}
                      className="shrink-0 text-sm font-semibold text-violet disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {selected ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })
              ) : (
                <p className="col-span-full rounded-2xl bg-surface px-4 py-6 text-sm text-ink-soft">
                  {query.trim()
                    ? searching
                      ? "Looking up listed names…"
                      : `No names match “${query.trim()}”.`
                    : "No stocks to show."}
                </p>
              )}
            </div>
            <StockPager
              page={resultsPaged.page}
              pages={resultsPaged.pages}
              onPage={setPage}
            />
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
