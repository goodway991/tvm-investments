"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import type { DailySnapshot, StockCandidate } from "@/types";
import { PortfolioPanel, SettingsPanel } from "@/components/AccountPanels";
import { useAuth } from "@/components/AuthProvider";
import { BacktestTrackRecord } from "@/components/BacktestTrackRecord";
import { FilterPanel } from "@/components/FilterPanel";
import { InvestmentCalculator } from "@/components/InvestmentCalculator";
import { MarketEvents } from "@/components/MarketEvents";
import { Methodology } from "@/components/Methodology";
import { MiniChart } from "@/components/MiniChart";
import { MoversTable } from "@/components/MoversTable";
import { TechSector } from "@/components/TechSector";
import { TopPicks } from "@/components/TopPicks";
import { TVMBrand, TVMIcon } from "@/components/TVMBrand";
import { WatchlistPanel } from "@/components/WatchlistPanel";

const navItems = [
  { label: "Dashboard", href: "#overview", icon: "dashboard" as const },
  { label: "Movers", href: "#movers", icon: "movers" as const },
  { label: "Screener", href: "#screener", icon: "screener" as const },
  { label: "Reports", href: "#reports", icon: "reports" as const },
  { label: "Watchlist", href: "#watchlist", icon: "watchlist" as const },
  { label: "Portfolio", href: "#portfolio", icon: "dashboard" as const },
  { label: "Settings", href: "#settings", icon: "settings" as const },
];

const fallbackChart = [12, 18, 14, 22, 17, 28, 21, 32, 26, 38];

function stockChart(stock?: StockCandidate, points = 12) {
  const values = stock?.ohlcv.slice(-points).map((bar) => bar.close) ?? [];
  return values.length > 1 ? values : fallbackChart;
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function compactName(name: string) {
  return name
    .replace("Corporation", "Corp.")
    .replace("Incorporated", "Inc.")
    .replace("Advanced Micro Devices", "Adv. Micro Devices");
}

export function DashboardClient({ snapshot }: { snapshot: DailySnapshot }) {
  const {
    user,
    profile,
    entitlement,
    watchlist,
    portfolio,
    loading: authLoading,
    error: authError,
  } = useAuth();
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [investment, setInvestment] = useState(0);
  const [period, setPeriod] = useState<"Daily" | "Weekly" | "Monthly">("Monthly");
  const [sidebarMode, setSidebarMode] = useState<
    "expanded" | "collapsed" | "hidden"
  >("expanded");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const topPick = snapshot.topPicks[0] ?? snapshot.topMovers[0];
  const allStocks = useMemo(() => {
    const unique = new Map<string, StockCandidate>();
    [...snapshot.topMovers, ...snapshot.topPicks].forEach((stock) =>
      unique.set(stock.symbol, stock),
    );
    return Array.from(unique.values());
  }, [snapshot.topMovers, snapshot.topPicks]);
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
          stock.symbol.toLowerCase().includes(query) || stock.name.toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [search, snapshot.topMovers]);

  const periodPoints = period === "Daily" ? 5 : period === "Weekly" ? 20 : 60;

  function submitTickerSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveSection("Watchlist");
    document.getElementById("watchlist")?.scrollIntoView({ behavior: "smooth" });
  }

  function cycleSidebar() {
    setSidebarMode((current) =>
      current === "expanded"
        ? "collapsed"
        : current === "collapsed"
          ? "hidden"
          : "expanded",
    );
  }

  const overviewCards = [
    {
      label: `Top pick · ${topPick?.symbol ?? "—"}`,
      value: topPick ? signedPercent(topPick.changePercent) : "—",
      chart: stockChart(topPick, 8),
      gradient: true,
    },
    {
      label: "Names screened",
      value: snapshot.scanUniverse.combined.toLocaleString(),
      chart: [16, 18, 15, 20, 19, 23, 24],
      badge: "universe",
    },
    {
      label: "Daily movers",
      value: snapshot.topMovers.length.toLocaleString(),
      chart: [14, 18, 15, 22, 19, 24, 24],
      badge: "ranked",
    },
    {
      label: "Composite avg",
      value: `${averageScore.toFixed(0)} / 100`,
      chart: [62, 68, 65, 76, 73, 82, averageScore || 85],
      gradient: true,
    },
  ];

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8fc]">
        <div className="glass-strong rounded-[24px] px-8 py-6 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet/20 border-t-violet" />
          <p className="mt-3 text-sm text-ink-soft">Loading your TVM account…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8fc] px-5">
        <div className="glass-strong max-w-md rounded-[28px] p-8 text-center">
          <TVMBrand />
          <h1 className="mt-6 font-display text-3xl font-bold text-ink">
            Sign in to open the dashboard
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Watchlists, portfolio positions, plan limits, and settings are saved
            to your Firebase account.
          </p>
          <Link
            href="/login"
            className="glass-violet mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white"
          >
            Log in
          </Link>
          {authError && (
            <p className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">
              {authError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f8fc]">
      {sidebarMode === "hidden" && (
        <button
          type="button"
          onClick={cycleSidebar}
          className="glass fixed left-4 top-4 z-30 hidden h-11 w-11 place-items-center rounded-full text-violet lg:grid"
          aria-label="Open dashboard menu"
        >
          <TVMIcon name="menu" />
        </button>
      )}

      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-white transition-all duration-500 lg:flex ${
          sidebarMode === "expanded"
            ? "w-[260px] border-r border-ink/[0.06] px-6 py-7"
            : sidebarMode === "collapsed"
              ? "w-[84px] border-r border-ink/[0.06] px-3 py-7"
              : "w-0 border-0 px-0 py-7 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <TVMBrand showWordmark={sidebarMode === "expanded"} />
          <button
            type="button"
            onClick={cycleSidebar}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-violet/10 hover:text-violet"
            aria-label={
              sidebarMode === "expanded"
                ? "Collapse dashboard menu"
                : "Hide dashboard menu"
            }
          >
            <TVMIcon name="menu" size={18} />
          </button>
        </div>

        <nav className="mt-10 flex flex-col gap-1.5" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setActiveSection(item.label)}
              title={sidebarMode === "collapsed" ? item.label : undefined}
              className={`flex items-center rounded-2xl py-3 text-left text-[15px] font-medium transition-all ${
                sidebarMode === "expanded"
                  ? "gap-3.5 px-4"
                  : "justify-center px-2"
              } ${
                activeSection === item.label
                  ? "glass-violet text-white"
                  : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
              }`}
            >
              <TVMIcon name={item.icon} />
              {sidebarMode === "expanded" && item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          disabled
          className={`testing-suite-lock relative mt-4 overflow-hidden rounded-2xl border border-violet/15 bg-violet/[0.04] text-ink-soft ${
            sidebarMode === "expanded"
              ? "px-4 py-3 text-left"
              : "grid h-12 place-items-center px-2"
          }`}
          title="Testing Suite is still being built"
        >
          <span className="chain chain-left" aria-hidden />
          <span className="chain chain-right" aria-hidden />
          <span className="lock-body" aria-hidden>🔒</span>
          {sidebarMode === "expanded" && (
            <>
              <span className="block text-sm font-semibold text-ink">
                Testing Suite
              </span>
              <span className="mt-0.5 block text-[11px]">Coming soon</span>
            </>
          )}
        </button>

        <div
          className={`glass-violet mt-auto text-center text-white ${
            sidebarMode === "expanded"
              ? "rounded-3xl p-5"
              : "rounded-2xl px-2 py-3"
          }`}
        >
          {sidebarMode === "expanded" ? (
            <>
              <p className="font-display text-sm font-semibold">
                {entitlement.plan === "pro" ? "Pro account" : "Upgrade to Pro"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/80">
                {entitlement.plan === "pro"
                  ? "All plan limits are unlocked."
                  : "Unlock unlimited changes and expanded watchlists."}
              </p>
              {entitlement.plan !== "pro" && (
                <Link
                  href="/signup"
                  className="mt-3 block w-full rounded-full bg-white py-2 text-sm font-semibold text-violet transition-transform hover:-translate-y-0.5"
                >
                  Upgrade
                </Link>
              )}
            </>
          ) : (
            <span className="font-display text-xs font-bold uppercase">
              {entitlement.plan}
            </span>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-ink/[0.06] bg-white/90 px-5 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full text-violet hover:bg-violet/10"
            aria-label="Open dashboard menu"
          >
            <TVMIcon name="menu" />
          </button>
          <TVMBrand />
          <span className="glass-violet rounded-full px-4 py-2 text-sm font-semibold uppercase text-white">
            {entitlement.plan}
          </span>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
              aria-label="Close dashboard menu"
            />
            <aside className="glass-strong absolute bottom-3 left-3 top-3 z-10 flex w-[min(310px,calc(100%-1.5rem))] flex-col rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <TVMBrand />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-violet/10 hover:text-violet"
                  aria-label="Close dashboard menu"
                >
                  <TVMIcon name="close" size={18} />
                </button>
              </div>
              <nav className="mt-8 flex flex-col gap-1.5">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setActiveSection(item.label);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-medium ${
                      activeSection === item.label
                        ? "glass-violet text-white"
                        : "text-ink-soft hover:bg-violet/[0.05] hover:text-ink"
                    }`}
                  >
                    <TVMIcon name={item.icon} />
                    {item.label}
                  </a>
                ))}
              </nav>
              <button
                type="button"
                disabled
                className="testing-suite-lock relative mt-4 overflow-hidden rounded-2xl border border-violet/15 bg-violet/[0.04] px-4 py-3 text-left text-ink-soft"
              >
                <span className="chain chain-left" aria-hidden />
                <span className="chain chain-right" aria-hidden />
                <span className="lock-body" aria-hidden>🔒</span>
                <span className="block text-sm font-semibold text-ink">
                  Testing Suite
                </span>
                <span className="mt-0.5 block text-[11px]">Coming soon</span>
              </button>
            </aside>
          </div>
        )}

        <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-9">
          <section id="overview" className="scroll-mt-8 animate-rise">
            <div className="flex flex-wrap items-center gap-4">
              <div className="mr-auto">
                <p className="text-sm text-ink-soft">
                  {snapshot.dataMode === "live" ? "Live market snapshot" : "Demo market snapshot"} ·{" "}
                  {snapshot.date}
                </p>
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
              {overviewCards.map((card, index) => (
                <article
                  key={card.label}
                  className={`rounded-[22px] p-5 ${
                    card.gradient ? "glass-violet text-white" : "glass-strong"
                  }`}
                >
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
                  <div className="-mb-1 mt-1">
                    <MiniChart
                      values={card.chart}
                      id={`overview-${index}`}
                      color={card.gradient ? "#ffffff" : "#5b3df5"}
                      height={38}
                      area={!card.gradient}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <article className="glass-strong rounded-[24px] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-display text-lg font-semibold text-ink">Market pulse</h2>
                    <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                      {watchlist.symbols.length ? "Tracking" : "Ready"}
                    </span>
                  </div>
                  <label>
                    <span className="sr-only">Market pulse period</span>
                    <select
                      value={period}
                      onChange={(event) =>
                        setPeriod(
                          event.target.value as "Daily" | "Weekly" | "Monthly",
                        )
                      }
                      className="glass cursor-pointer rounded-full px-3 py-1.5 text-xs text-ink-soft outline-none"
                    >
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#f7f8fc] p-4">
                    <p className="text-xs text-ink-soft">Watched stocks</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-display text-2xl font-bold text-ink">
                        {watchlist.symbols.length}
                      </span>
                      <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                        / {entitlement.watchlistLimit}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#f7f8fc] p-4">
                    <p className="text-xs text-ink-soft">Portfolio value</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-display text-2xl font-bold text-ink">
                        ${portfolio.totalValue.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-xs font-semibold text-violet">
                        saved
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <MiniChart
                    values={stockChart(topPick, periodPoints)}
                    id="market-pulse"
                    height={150}
                  />
                </div>
              </article>

              <article className="glass-strong flex flex-col rounded-[24px] p-6">
                <h2 className="font-display text-lg font-semibold text-ink">Today&apos;s movers</h2>
                <div className="mt-4 flex-1 space-y-3.5">
                  {filteredMovers.length > 0 ? (
                    filteredMovers.map((stock) => (
                      <div key={stock.symbol} className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f2f0ff] font-display text-xs font-bold text-violet">
                          {stock.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">{stock.symbol}</p>
                          <p className="truncate text-xs text-ink-soft">{compactName(stock.name)}</p>
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
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-[#f7f8fc] p-4 text-sm text-ink-soft">
                      No tracked ticker matches “{search}”.
                    </p>
                  )}
                </div>
                <a
                  href="#movers"
                  onClick={() => setActiveSection("Movers")}
                  className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-violet"
                >
                  View all
                  <TVMIcon name="arrow" size={16} />
                </a>
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
                        ${(investment * (1 + percent / 100)).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-strong rounded-[24px] p-6">
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
                    <div key={stock.symbol} className="rounded-2xl bg-[#f7f8fc] p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-display font-bold text-ink">{stock.symbol}</p>
                          <p className="text-[11px] text-ink-soft">{compactName(stock.name)}</p>
                        </div>
                        <span className="font-display text-sm font-bold text-violet">
                          {stock.compositeScore.toFixed(0)}
                        </span>
                      </div>
                      <MiniChart
                        values={stockChart(stock, 8)}
                        id={`flagged-${stock.symbol}-${index}`}
                        height={54}
                      />
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-ink">
                          ${stock.price.toFixed(2)}
                        </span>
                        <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                          flagged
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <p className="mt-5 max-w-3xl text-[11px] leading-relaxed text-ink-soft/70">
              Educational and research use only. Names shown are flagged by
              historically-motivated heuristics, not recommendations, and this is not investment
              advice.
            </p>
          </section>

          <div className="dashboard-research mt-14 space-y-8">
            <section id="watchlist" className="scroll-mt-8">
              <WatchlistPanel stocks={allStocks} externalQuery={search} />
            </section>

            <section id="portfolio" className="scroll-mt-8">
              <PortfolioPanel stocks={allStocks} />
            </section>

            <section id="movers" className="scroll-mt-8">
              <MoversTable movers={snapshot.topMovers} />
            </section>

            <section id="reports" className="grid scroll-mt-8 gap-8 lg:grid-cols-2">
              <MarketEvents events={snapshot.marketEvents} />
              <TechSector analysis={snapshot.techSectorAnalysis} />
            </section>

            <section id="methodology" className="scroll-mt-8">
              <Methodology />
            </section>

            <section id="picks" className="scroll-mt-8">
              <TopPicks picks={snapshot.topPicks} reports={snapshot.reports} />
            </section>

            <section id="screener" className="scroll-mt-8">
              <FilterPanel initialStocks={snapshot.topMovers} />
            </section>

            <section id="backtest" className="scroll-mt-8">
              <BacktestTrackRecord />
            </section>

            <section id="calculator" className="scroll-mt-8">
              <InvestmentCalculator defaultSymbol={topPick?.symbol ?? "AAPL"} />
            </section>

            <section id="settings" className="scroll-mt-8">
              <SettingsPanel />
            </section>

            <p className="pb-6 text-xs leading-relaxed text-ink-soft/70">
              {snapshot.disclaimer} © {new Date().getFullYear()} TVM Investments · Research and
              education only.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
