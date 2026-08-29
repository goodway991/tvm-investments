"use client";

import { useEffect, useRef, useState } from "react";
import type { ScreenedStock } from "@/types";
import { BogenHeading } from "@/components/BogenProvider";
import { pageSlice, StockPager } from "@/components/StockPager";
import {
  StockDetailModal,
  screenedToCandidate,
} from "@/components/StockDetailModal";
import { authedFetch } from "@/lib/authed-fetch";

interface FilterPanelProps {
  initialStocks?: ScreenedStock[];
  archiveDate?: string;
}

interface FilterState {
  peMin: string;
  peMax: string;
  betaMin: string;
  betaMax: string;
  volumeMin: string;
  epsMin: string;
  marketCapMin: string;
  marketCapMax: string;
}

type ScreenRow = ReturnType<typeof toRow> & {
  sector?: string;
  industry?: string;
  indexMembership?: ScreenedStock["indexMembership"];
};

const emptyFilters: FilterState = {
  peMin: "",
  peMax: "",
  betaMin: "",
  betaMax: "",
  volumeMin: "",
  epsMin: "",
  marketCapMin: "",
  marketCapMax: "",
};

function toRow(stock: ScreenedStock) {
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    industry: stock.industry,
    price: stock.price,
    changePercent: stock.changePercent,
    compositeScore: stock.compositeScore,
    shortTermScore: stock.shortTermScore,
    longTermScore: stock.longTermScore,
    peRatio: stock.fundamentals.peRatio,
    beta: stock.fundamentals.beta,
    eps: stock.fundamentals.eps,
    marketCap: stock.fundamentals.marketCap,
    volume: stock.volume,
    indexMembership: stock.indexMembership,
  };
}

export function FilterPanel({ initialStocks = [], archiveDate }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [catalog, setCatalog] = useState(() => initialStocks.map(toRow));
  const [results, setResults] = useState(() => initialStocks.map(toRow));
  const [find, setFind] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(initialStocks.length === 0);
  const [selected, setSelected] = useState<ScreenRow | null>(null);
  const [quotes, setQuotes] = useState<
    Record<string, { price: number; changePercent: number; volume: number }>
  >({});
  const seenRef = useRef(new Set<string>());
  const queueRef = useRef(new Set<string>());
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const visible = results.filter((stock) => {
    const needle = find.trim().toLowerCase();
    if (!needle) return true;
    return (
      stock.symbol.toLowerCase().includes(needle) ||
      stock.name.toLowerCase().includes(needle)
    );
  });
  const paged = pageSlice(visible, page);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (archiveDate) params.set("date", archiveDate);
    const query = params.toString();
    setLoading(true);
    authedFetch(`/api/filter${query ? `?${query}` : ""}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { stocks?: ScreenRow[] }) => {
        const rows = Array.isArray(data.stocks) ? data.stocks : [];
        setCatalog(rows);
        setResults(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted) setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [archiveDate]);

  useEffect(() => {
    setPage(0);
  }, [find, results]);

  useEffect(() => {
    seenRef.current = new Set();
    queueRef.current = new Set();
  }, [paged.page, results]);

  useEffect(() => {
    const root = tableRef.current;
    if (!root) return;
    let timer: number | undefined;

    function flush() {
      const symbols = [...queueRef.current];
      queueRef.current = new Set();
      if (symbols.length === 0) return;
      authedFetch(`/api/yahoo/quotes?symbols=${encodeURIComponent(symbols.join(","))}`)
        .then((response) => response.json())
        .then(
          (payload: {
            quotes?: Array<{ symbol: string; price: number; changePercent: number; volume: number }>;
          }) => {
            const next = payload.quotes ?? [];
            if (next.length === 0) return;
            setQuotes((current) => {
              const merged = { ...current };
              for (const quote of next) {
                merged[quote.symbol] = {
                  price: quote.price,
                  changePercent: quote.changePercent,
                  volume: quote.volume,
                };
              }
              return merged;
            });
          },
        )
        .catch(() => {});
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const symbol = (entry.target as HTMLElement).dataset.symbol;
          if (!symbol || seenRef.current.has(symbol)) continue;
          seenRef.current.add(symbol);
          queueRef.current.add(symbol);
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(flush, 160);
      },
      { root: null, rootMargin: "80px 0px", threshold: 0.2 },
    );

    for (const row of root.querySelectorAll("[data-symbol]")) {
      observer.observe(row);
    }
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [paged.slice]);

  async function applyFilters() {
    setLoading(true);
    const params = new URLSearchParams();
    if (archiveDate) params.set("date", archiveDate);
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, v);
    }
    const res = await authedFetch(`/api/filter?${params}`);
    const data = await res.json();
    setResults(data.stocks ?? []);
    setLoading(false);
  }

  function reset() {
    setFilters(emptyFilters);
    setResults(catalog);
  }

  const fields: Array<{ key: keyof FilterState; label: string; placeholder: string }> = [
    { key: "peMin", label: "P/E Min", placeholder: "e.g. 5" },
    { key: "peMax", label: "P/E Max", placeholder: "e.g. 40" },
    { key: "betaMin", label: "Beta Min", placeholder: "e.g. 0.5" },
    { key: "betaMax", label: "Beta Max", placeholder: "e.g. 2" },
    { key: "volumeMin", label: "Volume Min", placeholder: "e.g. 1000000" },
    { key: "epsMin", label: "EPS Min", placeholder: "e.g. 1" },
    { key: "marketCapMin", label: "Market Cap Min ($)", placeholder: "e.g. 10000000000" },
    { key: "marketCapMax", label: "Market Cap Max ($)", placeholder: "e.g. 500000000000" },
  ];

  const selectedStock = selected
    ? screenedToCandidate({
        symbol: selected.symbol,
        name: selected.name,
        sector: selected.sector || "Unknown",
        industry: selected.industry || "Unknown",
        price: quotes[selected.symbol]?.price ?? selected.price,
        changePercent: quotes[selected.symbol]?.changePercent ?? selected.changePercent,
        volume: quotes[selected.symbol]?.volume ?? selected.volume,
        compositeScore: selected.compositeScore,
        shortTermScore: selected.shortTermScore,
        longTermScore: selected.longTermScore,
        fundamentals: {
          peRatio: selected.peRatio,
          beta: selected.beta,
          eps: selected.eps,
          marketCap: selected.marketCap,
          avgVolume: null,
          shortInterestPct: null,
        },
        indexMembership: selected.indexMembership,
      })
    : null;

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display text-2xl text-ink mb-1">
        <BogenHeading id="screener">Stock Filter</BogenHeading>
      </h2>
      <p className="text-ink-soft text-sm mb-6">
        Filter today&apos;s scored scan of about 2,800 US stocks and ETFs by
        P/E, Beta, Volume, EPS, and Market Cap. Quotes refresh when a name
        scrolls into view; tap a ticker for the full sheet.
      </p>

      <label className="mb-5 block">
        <span className="sr-only">Find a ticker in today&apos;s scan</span>
        <input
          value={find}
          onChange={(event) => setFind(event.target.value)}
          placeholder="Find a ticker in today’s scan…"
          className="field w-full rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50"
        />
      </label>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {fields.map(({ key, label, placeholder }) => (
          <label key={key} className="block">
            <span className="text-xs text-ink-soft">{label}</span>
            <input
              type="number"
              value={filters[key]}
              onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
              placeholder={placeholder}
              className="field mt-1 w-full rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none"
            />
          </label>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={applyFilters}
          disabled={loading}
          className="glass-violet rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
        >
          {loading ? "Filtering…" : "Apply Filters"}
        </button>
        <button
          onClick={reset}
          className="glass rounded-full px-5 py-2.5 text-sm text-ink-soft transition-colors hover:text-violet"
        >
          Reset
        </button>
      </div>

      <p className="text-sm text-ink-soft mb-4">
        {loading && results.length === 0
          ? "Loading today’s scan…"
          : `${visible.length} stocks match · 10 per page`}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-soft border-b border-ink/[0.08]">
              <th className="pb-2 pr-4">Symbol</th>
              <th className="pb-2 pr-4 text-right">P/E</th>
              <th className="pb-2 pr-4 text-right">Beta</th>
              <th className="pb-2 pr-4 text-right">EPS</th>
              <th className="pb-2 pr-4 text-right">Volume</th>
              <th className="pb-2 pr-4 text-right">Mkt Cap</th>
              <th className="pb-2 pr-4 text-right">ST</th>
              <th className="pb-2 pr-4 text-right">LT</th>
              <th className="pb-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody ref={tableRef}>
            {paged.slice.map((s) => {
              const live = quotes[s.symbol];
              const volume = live?.volume ?? s.volume;
              return (
                <tr
                  key={s.symbol}
                  data-symbol={s.symbol}
                  className="border-b border-ink/[0.05]"
                >
                  <td className="py-2 pr-4 font-medium text-ink">
                    <button
                      type="button"
                      onClick={() => setSelected(s)}
                      className="text-left font-semibold text-violet hover:underline"
                    >
                      {s.symbol}
                    </button>
                    <span className="mt-0.5 block max-w-[12rem] truncate text-[11px] font-normal text-ink-soft">
                      {s.name}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right">{s.peRatio?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 pr-4 text-right">{s.beta?.toFixed(2) ?? "—"}</td>
                  <td className="py-2 pr-4 text-right">{s.eps != null ? `$${s.eps.toFixed(2)}` : "—"}</td>
                  <td className="py-2 pr-4 text-right">{(volume / 1e6).toFixed(1)}M</td>
                  <td className="py-2 pr-4 text-right">
                    {s.marketCap ? `$${(s.marketCap / 1e9).toFixed(1)}B` : "—"}
                  </td>
                  <td className="py-2 pr-4 text-right text-ink-soft">
                    {s.shortTermScore?.toFixed(0) ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-right text-ink-soft">
                    {s.longTermScore?.toFixed(0) ?? "—"}
                  </td>
                  <td className="py-2 text-right text-violet">{s.compositeScore.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <StockPager page={paged.page} pages={paged.pages} onPage={setPage} />
      {selectedStock ? (
        <StockDetailModal
          stock={selectedStock}
          sessionDate={archiveDate}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
