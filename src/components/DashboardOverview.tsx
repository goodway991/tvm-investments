"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import type { DailySnapshot } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { MiniChart } from "@/components/MiniChart";
import { MarketPulse } from "@/components/MarketPulse";
import { MoveMark } from "@/components/MoversTable";
import { StockDetailModal, FlaggedPickButton, compactCompanyName, screenedToCandidate } from "@/components/StockDetailModal";
import { TVMIcon } from "@/components/TVMBrand";
import {
  sessionMove,
  sparklineValues,
  uniqueStocks,
} from "@/lib/chart-series";
import { computeAccountScore } from "@/lib/account-score";
import { resolveAccountName } from "@/lib/person-name";
import { BogenHeading, BogenTip } from "@/components/BogenProvider";

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function DashboardOverview({ snapshot }: { snapshot: DailySnapshot }) {
  const { profile, user, entitlement, watchlist, positions } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [investment, setInvestment] = useState(0);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const allStocks = useMemo(
    () => uniqueStocks([...snapshot.topMovers, ...snapshot.topPicks]),
    [snapshot.topMovers, snapshot.topPicks],
  );
  const topPick = snapshot.topPicks[0] ?? snapshot.topMovers[0];
  const accountScore = useMemo(
    () =>
      computeAccountScore({
        watchlist: watchlist.symbols,
        positions,
        snapshot,
      }),
    [positions, snapshot, watchlist.symbols],
  );
  const filteredMovers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const ranked = [...snapshot.topMovers].sort((left, right) => {
      const a = sessionMove(left);
      const b = sessionMove(right);
      const aPct = a.previous ? Math.abs(a.current - a.previous) / a.previous : 0;
      const bPct = b.previous ? Math.abs(b.current - b.previous) / b.previous : 0;
      return bPct - aPct;
    });
    if (!query) return ranked.slice(0, 5);
    return ranked
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
    (selectedSymbol
      ? snapshot.screenedStocks
          .filter((stock) => stock.symbol === selectedSymbol)
          .map(screenedToCandidate)[0]
      : undefined) ??
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
      bogen: "top-pick" as const,
      onOpen: topPick ? () => setSelectedSymbol(topPick.symbol) : undefined,
    },
    {
      label: "Names screened",
      value: snapshot.scanUniverse.combined.toLocaleString(),
      badge: "universe",
      bogen: "names-screened" as const,
      href: "/dashboard/screener",
    },
    {
      label: "Daily movers",
      value: snapshot.topMovers.length.toLocaleString(),
      badge: "ranked",
      bogen: "daily-movers-card" as const,
      href: "/dashboard/movers",
    },
    {
      label: "Account score",
      value: accountScore.score == null ? "—" : `${accountScore.score.toFixed(0)} / 100`,
      badge: accountScore.counted ? `${accountScore.counted} names` : "your book",
      gradient: true,
      bogen: "composite" as const,
      href: "/dashboard/watchlist",
    },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-center gap-4">
        <div className="mr-auto">
          <h1 className="font-display text-3xl font-bold text-ink">
            Welcome,{" "}
            {entitlement.plan === "pro" ? (
              <span className="pro-name-glow">
                {resolveAccountName({
                  profileName: profile?.displayName,
                  authName: user?.displayName,
                  email: user?.email,
                })}
              </span>
            ) : (
              resolveAccountName({
                profileName: profile?.displayName,
                authName: user?.displayName,
                email: user?.email,
              })
            )}
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
          <BogenTip id="ticker-search" />
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
                    color={card.gradient ? "#ffffff" : "#2f62ff"}
                    height={38}
                    area={!card.gradient}
                  />
                </div>
              )}
            </>
          );

          if (card.href) {
            return (
              <div key={card.label} className="relative">
                <Link href={card.href} className={`${className} block`}>
                  {body}
                </Link>
                <BogenTip
                  id={card.bogen}
                  tone={card.gradient ? "onDark" : "ink"}
                  className="absolute right-3 top-3"
                />
              </div>
            );
          }

          if (card.onOpen) {
            return (
              <div key={card.label} className="relative">
                <button type="button" onClick={card.onOpen} className={`${className} w-full`}>
                  {body}
                </button>
                <BogenTip
                  id={card.bogen}
                  tone={card.gradient ? "onDark" : "ink"}
                  className="absolute right-3 top-3"
                />
              </div>
            );
          }

          return (
            <article key={card.label} className={`relative ${className}`}>
              {body}
              <BogenTip
                id={card.bogen}
                tone={card.gradient ? "onDark" : "ink"}
                className="absolute right-3 top-3"
              />
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <MarketPulse
          snapshot={snapshot}
          stocks={allStocks}
          onOpenStock={(symbol) => setSelectedSymbol(symbol)}
        />

        <article className="glass-strong flex flex-col rounded-[24px] p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            <BogenHeading id="todays-movers">Today&apos;s movers</BogenHeading>
          </h2>
          <div className="mt-4 flex-1 space-y-3.5">
            {search.trim() && filteredMovers.length === 0 ? (
              <p className="glass rounded-2xl p-4 text-sm text-ink-soft">
                No tracked ticker matches “{search}”.
              </p>
            ) : (
              [0, 1, 2, 3, 4].map((index) => {
                const stock = filteredMovers[index];
                if (!stock) {
                  return (
                    <div
                      key={`empty-mover-${index}`}
                      className="glass flex w-full items-center gap-3 rounded-2xl p-2.5"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet/10 text-violet">
                        —
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">—</p>
                        <p className="truncate text-xs text-ink-soft">No mover this slot</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-ink-soft">Prev —</p>
                        <p className="font-display text-sm font-bold text-ink">—</p>
                      </div>
                    </div>
                  );
                }
                const move = sessionMove(stock);
                return (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className="glass flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-all hover:-translate-y-0.5 hover:bg-white/50"
                  >
                    <MoveMark up={move.up} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{stock.symbol}</p>
                      <p className="truncate text-xs text-ink-soft">{compactCompanyName(stock.name)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-ink-soft">
                        Prev ${move.previous.toFixed(2)}
                      </p>
                      <p
                        className={`font-display text-sm font-bold ${
                          move.up ? "text-emerald-600" : "text-coral"
                        }`}
                      >
                        ${move.current.toFixed(2)}
                      </p>
                    </div>
                  </button>
                );
              })
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
          <div className="glass-violet relative rounded-2xl p-5 text-white">
            <BogenTip
              id="overview-calculator"
              tone="onDark"
              className="absolute right-3 top-3"
            />
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
              <BogenHeading id="flagged-picks">Today&apos;s flagged picks</BogenHeading>
            </h2>
            <span className="text-right text-xs text-ink-soft">
              Ranked by composite score
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((index) => {
              const stock = snapshot.topPicks[index];
              if (!stock) {
                return (
                  <div key={`empty-pick-${index}`} className="glass w-full rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display font-bold text-ink">—</p>
                        <p className="text-[11px] text-ink-soft">No pick this session</p>
                      </div>
                      <span className="font-display text-sm font-bold text-violet">—</span>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-soft">ST — · LT —</p>
                    <div className="my-2 h-[54px] rounded-lg bg-white/50" />
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-ink">—</span>
                      <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-xs font-semibold text-violet">
                        Pick {index + 1}
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <FlaggedPickButton
                  key={stock.symbol}
                  stock={stock}
                  index={index}
                  onOpen={() => setSelectedSymbol(stock.symbol)}
                />
              );
            })}
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
