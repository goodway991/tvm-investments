"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import type { DailySnapshot } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { MiniChart } from "@/components/MiniChart";
import { MarketPulse } from "@/components/MarketPulse";
import { StockDetailModal, FlaggedPickButton, compactCompanyName } from "@/components/StockDetailModal";
import { TVMIcon } from "@/components/TVMBrand";
import {
  sparklineValues,
  uniqueStocks,
} from "@/lib/chart-series";

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function DashboardOverview({ snapshot }: { snapshot: DailySnapshot }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [investment, setInvestment] = useState(0);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const allStocks = useMemo(
    () => uniqueStocks([...snapshot.topMovers, ...snapshot.topPicks]),
    [snapshot.topMovers, snapshot.topPicks],
  );
  const topPick = snapshot.topPicks[0] ?? snapshot.topMovers[0];
  const averageScore =
    snapshot.topPicks.length > 0
      ? snapshot.topPicks.reduce((total, stock) => total + stock.compositeScore, 0) /
        snapshot.topPicks.length
      : 0;
  const filteredMovers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return snapshot.topMovers.slice(0, 5);
    return snapshot.topMovers
      .filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query) ||
          stock.name.toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [search, snapshot.topMovers]);
  const selectedStock =
    allStocks.find((stock) => stock.symbol === selectedSymbol) ??
    snapshot.topPicks.find((stock) => stock.symbol === selectedSymbol) ??
    null;
  const selectedReport = snapshot.reports.find(
    (report) => report.symbol === selectedSymbol,
  );

  function submitTickerSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(
      query
        ? `/dashboard/watchlist?q=${encodeURIComponent(query)}`
        : "/dashboard/watchlist",
    );
  }

  const overviewCards = [
    {
      label: `Top pick · ${topPick?.symbol ?? "—"}`,
      value: topPick ? signedPercent(topPick.changePercent) : "—",
      chart: topPick ? sparklineValues(topPick.ohlcv, 8) : [],
      gradient: true,
      onOpen: topPick ? () => setSelectedSymbol(topPick.symbol) : undefined,
    },
    {
      label: "Names screened",
      value: snapshot.scanUniverse.combined.toLocaleString(),
      badge: "universe",
      href: "/dashboard/screener",
    },
    {
      label: "Daily movers",
      value: snapshot.topMovers.length.toLocaleString(),
      badge: "ranked",
      href: "/dashboard/movers",
    },
    {
      label: "Composite avg",
      value: `${averageScore.toFixed(0)} / 100`,
      gradient: true,
      href: "#flagged-picks",
    },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-center gap-4">
        <div className="mr-auto">
          <h1 className="font-display text-3xl font-bold text-ink">
            Welcome, {profile?.displayName || "TVM investor"}
          </h1>
        </div>
        <form className="flex items-center gap-2" onSubmit={submitTickerSearch}>
          <label className="relative">
            <span className="sr-only">Search tickers</span>
            <TVMIcon
              name="search"
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tickers…"
              className="field w-52 rounded-2xl bg-white py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ink-soft/60"
            />
          </label>
          <button
            type="submit"
            className="glass-violet rounded-full px-4 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Search
          </button>
        </form>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overviewCards.map((card, index) => {
          const className = `rounded-[22px] p-5 text-left transition-transform ${
            card.gradient ? "glass-violet text-white" : "glass-strong"
          } ${
            card.href || card.onOpen
              ? "cursor-pointer hover:-translate-y-0.5"
              : ""
          }`;
          const body = (
            <>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${card.gradient ? "text-white/80" : "text-ink-soft"}`}>
                  {card.label}
                </span>
                {card.badge && (
                  <span className="text-[11px] font-semibold text-emerald-600">{card.badge}</span>
                )}
              </div>
              <div
                className={`mt-1 font-display text-2xl font-bold ${
                  card.gradient ? "text-white" : "text-ink"
                }`}
              >
                {card.value}
              </div>
              {card.chart && card.chart.length > 1 && (
                <div className="-mb-1 mt-1">
                  <MiniChart
                    values={card.chart}
                    id={`overview-${index}`}
                    color={card.gradient ? "#ffffff" : "#5b3df5"}
                    height={38}
                    area={!card.gradient}
                  />
                </div>
              )}
            </>
          );

          if (card.href) {
            return (
              <Link key={card.label} href={card.href} className={className}>
                {body}
              </Link>
            );
          }

          if (card.onOpen) {
            return (
              <button
                key={card.label}
                type="button"
                onClick={card.onOpen}
                className={className}
              >
                {body}
              </button>
            );
          }

          return (
            <article key={card.label} className={className}>
              {body}
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <MarketPulse snapshot={snapshot} stocks={allStocks} />

        <article className="glass-strong flex flex-col rounded-[24px] p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Today&apos;s movers</h2>
          <div className="mt-4 flex-1 space-y-3.5">
            {filteredMovers.length > 0 ? (
              filteredMovers.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  className="glass flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-all hover:-translate-y-0.5 hover:bg-white/50"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f2f0ff]/80 font-display text-xs font-bold text-violet">
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{stock.symbol}</p>
                    <p className="truncate text-xs text-ink-soft">{compactCompanyName(stock.name)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      stock.changePercent >= 0
                        ? "bg-emerald-400/20 text-emerald-600"
                        : "bg-coral/20 text-coral"
                    }`}
                  >
                    {signedPercent(stock.changePercent)}
                  </span>
                </button>
              ))
            ) : (
              <p className="glass rounded-2xl p-4 text-sm text-ink-soft">
                No tracked ticker matches “{search}”.
              </p>
            )}
          </div>
          <Link
            href="/dashboard/movers"
            className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-violet"
          >
            View all
            <TVMIcon name="arrow" size={16} />
          </Link>
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <article className="glass-strong rounded-[24px] p-6">
          <div className="glass-violet rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <label htmlFor="overview-investment" className="text-xs text-white/80">
                Your investment
              </label>
              <span className="text-xs text-white/80">USD</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="font-display text-2xl font-bold">$</span>
              <input
                id="overview-investment"
                value={investment}
                min={0}
                onChange={(event) =>
                  setInvestment(Math.max(0, Number(event.target.value) || 0))
                }
                className="w-full bg-transparent font-display text-2xl font-bold outline-none placeholder:text-white/50"
                type="number"
              />
            </div>
          </div>
          <p className="mt-4 text-xs font-medium text-ink-soft">Projected outcomes</p>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            {[-10, -5, 5, 10].map((percent) => (
              <div
                key={percent}
                className={`rounded-xl p-3 ${
                  percent < 0 ? "bg-coral/10" : "bg-emerald-400/10"
                }`}
              >
                <p
                  className={`text-xs font-semibold ${
                    percent < 0 ? "text-coral" : "text-emerald-600"
                  }`}
                >
                  {percent > 0 ? "+" : ""}
                  {percent}%
                </p>
                <p className="font-display text-base font-bold text-ink">
                  $
                  {(investment * (1 + percent / 100)).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article id="flagged-picks" className="glass-strong scroll-mt-8 rounded-[24px] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-ink">
              Today&apos;s flagged picks
            </h2>
            <span className="text-right text-xs text-ink-soft">
              Ranked by composite score
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {snapshot.topPicks.slice(0, 3).map((stock, index) => (
              <FlaggedPickButton
                key={stock.symbol}
                stock={stock}
                index={index}
                onOpen={() => setSelectedSymbol(stock.symbol)}
              />
            ))}
          </div>
        </article>
      </div>

      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          report={selectedReport}
          sessionDate={snapshot.date}
          onClose={() => setSelectedSymbol(null)}
        />
      )}
    </section>
  );
}
