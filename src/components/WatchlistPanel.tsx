"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CompanyReport, ScreenedStock, StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  FlaggedPickButton,
  StockDetailModal,
  screenedToCandidate,
} from "@/components/StockDetailModal";
import { parseTicker } from "@/lib/ticker";

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
  const [compact, setCompact] = useState(true);
  const [query, setQuery] = useState(externalQuery);
  const [remote, setRemote] = useState<WatchlistStock[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [live, setLive] = useState<
    Record<string, { stock: StockCandidate; report: CompanyReport }>
  >({});
  const [liveStatus, setLiveStatus] = useState<Record<string, "loading" | "ready" | "error">>(
    {},
  );

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
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/yahoo/search?q=${encodeURIComponent(needle)}`,
        );
        const payload = (await response.json()) as {
          results?: WatchlistStock[];
        };
        setRemote(payload.results ?? []);
      } catch {
        setRemote([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query]);

  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    const missing = draft.filter((symbol) => !liveRef.current[symbol]);
    if (missing.length === 0) return;
    let cancelled = false;

    setLiveStatus((current) => {
      const next = { ...current };
      missing.forEach((symbol) => {
        if (!next[symbol]) next[symbol] = "loading";
      });
      return next;
    });

    async function load() {
      const queue = [...missing];
      async function worker() {
        while (queue.length) {
          const symbol = queue.shift();
          if (!symbol) return;
          try {
            const response = await fetch(
              `/api/yahoo/research?symbol=${encodeURIComponent(symbol)}`,
            );
            const payload = (await response.json()) as {
              stock?: StockCandidate;
              report?: CompanyReport;
            };
            if (cancelled) return;
            if (!response.ok || !payload.stock || !payload.report) {
              setLiveStatus((current) => ({ ...current, [symbol]: "error" }));
              continue;
            }
            setLive((current) => ({
              ...current,
              [symbol]: { stock: payload.stock!, report: payload.report! },
            }));
            setLiveStatus((current) => ({ ...current, [symbol]: "ready" }));
          } catch {
            if (!cancelled) {
              setLiveStatus((current) => ({ ...current, [symbol]: "error" }));
            }
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(4, missing.length) }, () => worker()),
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [draft]);

  useEffect(() => {
    if (!selectedSymbol || entitlement.plan !== "pro") return;
    if (liveRef.current[selectedSymbol]?.report.cultureAndLongTermPro) return;
    let cancelled = false;
    fetch(
      `/api/yahoo/research?symbol=${encodeURIComponent(selectedSymbol)}&pro=1`,
    )
      .then((response) => response.json())
      .then((payload: { stock?: StockCandidate; report?: CompanyReport }) => {
        if (cancelled || !payload.stock || !payload.report) return;
        setLive((current) => ({
          ...current,
          [selectedSymbol]: { stock: payload.stock!, report: payload.report! },
        }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [entitlement.plan, selectedSymbol]);

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
    const needle = query.trim().toLowerCase();
    const merged = new Map<string, WatchlistStock>();
    if (!needle) {
      candidates.slice(0, 12).forEach((stock) => merged.set(stock.symbol, stock));
      return Array.from(merged.values());
    }
    candidates
      .filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(needle) ||
          stock.name.toLowerCase().includes(needle),
      )
      .forEach((stock) => merged.set(stock.symbol, stock));
    remote.forEach((stock) => {
      if (!merged.has(stock.symbol)) merged.set(stock.symbol, stock);
    });
    const typed = parseTicker(query);
    if (typed && !merged.has(typed)) {
      merged.set(typed, { symbol: typed, name: typed });
    }
    return Array.from(merged.values()).slice(0, 24);
  }, [candidates, query, remote]);

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

  const selectedStock =
    (selectedSymbol ? live[selectedSymbol]?.stock : null) ??
    (selectedSymbol ? detailFor(selectedSymbol) : null);
  const selectedReport =
    (selectedSymbol ? live[selectedSymbol]?.report : undefined) ??
    reports.find((report) => report.symbol === selectedSymbol);

  function add(symbol: string) {
    setError("");
    setMessage("");
    const ticker = parseTicker(symbol);
    if (!ticker) {
      setError("Enter a listed ticker.");
      return;
    }
    if (draft.includes(ticker)) return;
    if (draft.length >= entitlement.watchlistLimit) {
      setError(
        `Your ${entitlement.plan} plan is limited to ${entitlement.watchlistLimit} watched stocks.`,
      );
      return;
    }
    setDraft((current) => [...current, ticker]);
  }

  function remove(symbol: string) {
    setError("");
    setMessage("");
    setDraft((current) => current.filter((item) => item !== symbol));
  }

  function addTyped(event: React.FormEvent) {
    event.preventDefault();
    const ticker = parseTicker(query);
    if (ticker) add(ticker);
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
            Search any listed US stock, then choose up to {entitlement.watchlistLimit}.
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

      <form className="mt-5" onSubmit={addTyped}>
        <label className="block">
          <span className="sr-only">Search listed stocks</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tickers or company names…"
            className="field w-full rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60"
          />
        </label>
      </form>

      {compact ? (
        <div className="mt-5">
          {draft.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {draft.map((symbol, index) => {
                const liveCard = live[symbol];
                const stock = liveCard?.stock ?? detailFor(symbol);
                if (stock) {
                  return (
                    <FlaggedPickButton
                      key={symbol}
                      stock={stock}
                      index={index}
                      summary={liveCard?.report.shortTermOutlook}
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
                      <p className="text-[11px] text-ink-soft">
                        {liveStatus[symbol] === "error"
                          ? "Summary unavailable"
                          : "Building summary…"}
                      </p>
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
            <p className="rounded-2xl bg-[#f7f8fc] px-4 py-6 text-sm text-ink-soft">
              No watched stocks yet. Search a ticker above, add it, then save.
            </p>
          )}
        </div>
      ) : (
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
      )}

      <div className="mt-5">
        <p className="text-sm font-semibold text-ink">
          {query.trim()
            ? searching
              ? `Searching “${query.trim()}”…`
              : `Results for “${query.trim()}”`
            : "Type to search thousands of listed names"}
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
        {!query.trim() && results.length === 0 && (
          <p className="mt-3 text-sm text-ink-soft">
            Start typing a ticker or company — the list is not limited to today’s scan.
          </p>
        )}
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
