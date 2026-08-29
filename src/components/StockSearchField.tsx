"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TVMIcon } from "@/components/TVMBrand";
import { authedFetch } from "@/lib/authed-fetch";
import { parseTicker } from "@/lib/ticker";

export type SearchHit = { symbol: string; name: string };

export function StockSearchField({
  universe,
  watchlist,
  onPick,
  placeholder = "Search stocks…",
  showSearchButton = false,
}: {
  universe: SearchHit[];
  watchlist: string[];
  onPick: (hit: SearchHit) => void;
  placeholder?: string;
  showSearchButton?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

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
        const data = (await response.json()) as { results?: SearchHit[] };
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

  const watchHits = useMemo(() => {
    const names = new Map(universe.map((row) => [row.symbol, row.name]));
    return watchlist.map((symbol) => ({
      symbol,
      name: names.get(symbol) ?? symbol,
    }));
  }, [universe, watchlist]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const unique = new Map<string, SearchHit>();
    const source = needle
      ? [...universe, ...remote]
      : watchHits.length
        ? watchHits
        : universe.slice(0, 12);
    for (const row of source) {
      if (
        needle &&
        !row.symbol.toLowerCase().includes(needle) &&
        !row.name.toLowerCase().includes(needle)
      ) {
        continue;
      }
      if (!unique.has(row.symbol)) unique.set(row.symbol, row);
    }
    if (!needle) {
      return Array.from(unique.values()).slice(0, 12);
    }
    const ranked = Array.from(unique.values());
    ranked.sort((a, b) => {
      const aWatch = watchlist.includes(a.symbol) ? 0 : 1;
      const bWatch = watchlist.includes(b.symbol) ? 0 : 1;
      return aWatch - bWatch;
    });
    return ranked.slice(0, 16);
  }, [query, remote, universe, watchHits, watchlist]);

  function commitFromQuery() {
    const ticker = parseTicker(query);
    const hit =
      (ticker && rows.find((row) => row.symbol === ticker)) ||
      (ticker ? { symbol: ticker, name: ticker } : rows[0]);
    if (!hit) {
      setOpen(true);
      return;
    }
    onPick(hit);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="flex min-w-0 w-full items-center gap-2">
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <label className="relative block">
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
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitFromQuery();
          }}
          placeholder={placeholder}
          className="field w-full rounded-2xl bg-white py-2.5 pl-11 pr-4 text-sm text-ink placeholder:text-ink-soft/60"
        />
      </label>
      {open ? (
        <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-ink/[0.12] p-2 shadow-[0_18px_40px_-24px_rgba(8,16,40,0.7)] stock-search-menu">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            {query.trim()
              ? searching
                ? "Searching…"
                : "Matches"
              : watchHits.length
                ? "Your watchlist"
                : "Popular names"}
          </p>
          {rows.length === 0 ? (
            <p className="px-2 py-3 text-sm text-ink-soft">No names yet.</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.symbol}
                type="button"
                onClick={() => {
                  onPick(row);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-violet/[0.06]"
              >
                <span>
                  <span className="block font-display text-sm font-bold text-ink">
                    {row.symbol}
                  </span>
                  <span className="block text-[11px] text-ink-soft">{row.name}</span>
                </span>
                {watchlist.includes(row.symbol) ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-violet">
                    Watched
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
    {showSearchButton ? (
      <button
        type="button"
        onClick={commitFromQuery}
        className="glass-violet shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
      >
        {searching ? "Searching…" : "Search"}
      </button>
    ) : null}
    </div>
  );
}
