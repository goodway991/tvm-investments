"use client";

import { useEffect, useState } from "react";
import type { CompanyReport, NewsHeadline, StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { MiniChart } from "@/components/MiniChart";
import { OverlaySheet } from "@/components/OverlaySheet";
import { YahooPriceChart } from "@/components/TimeSeriesChart";
import { TVMIcon } from "@/components/TVMBrand";
import { BogenHeading } from "@/components/BogenProvider";
import { sparklineValues, type ChartRange } from "@/lib/chart-series";
import { planHasPro } from "@/lib/plans";

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatCap(value: number | null) {
  if (value == null) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export function StockDetailModal({
  stock,
  report,
  onClose,
  sessionDate,
}: {
  stock: StockCandidate;
  report?: CompanyReport;
  onClose: () => void;
  sessionDate?: string;
}) {
  const { entitlement } = useAuth();
  const isPro = planHasPro(entitlement.plan);
  const [news, setNews] = useState<NewsHeadline[]>(stock.headlines);
  const [newsStatus, setNewsStatus] = useState<"loading" | "live" | "cached">(
    "loading",
  );
  const [range, setRange] = useState<ChartRange>("month");

  useEffect(() => {
    let cancelled = false;
    setNewsStatus("loading");
    fetch(`/api/yahoo/news?symbol=${encodeURIComponent(stock.symbol)}`)
      .then((response) => response.json())
      .then((payload: { headlines?: NewsHeadline[] }) => {
        if (cancelled) return;
        if (payload.headlines?.length) {
          setNews(payload.headlines);
          setNewsStatus("live");
        } else {
          setNews(stock.headlines);
          setNewsStatus("cached");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setNews(stock.headlines);
        setNewsStatus("cached");
      });
    return () => {
      cancelled = true;
    };
  }, [stock.headlines, stock.symbol]);

  const activeSignals = stock.signals.filter(
    (signal) => signal.triggered || signal.score > 50,
  );

  return (
    <OverlaySheet
      labelledBy={`stock-dialog-${stock.symbol}`}
      onClose={onClose}
      variant="card"
      panelClassName="glass-strong relative z-10 mx-auto flex max-h-[calc(100svh-2rem)] w-full max-w-[920px] flex-col overflow-hidden rounded-[32px]"
      headerClassName="shrink-0 px-5 pt-6 sm:px-8 sm:pt-8"
      footerClassName="shrink-0 px-5 pb-5 sm:px-8 sm:pb-7"
      header={
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">
              {stock.sector} · {stock.industry}
            </p>
            <h2
              id={`stock-dialog-${stock.symbol}`}
              className="mt-1 font-display text-3xl font-bold text-ink"
            >
              <BogenHeading id="stock-sheet">{stock.symbol}</BogenHeading>
            </h2>
            <p className="truncate text-sm text-ink-soft">{stock.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-violet/10 hover:text-violet"
          >
            <TVMIcon name="close" size={16} />
            Close
          </button>
        </div>
      }
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="glass-violet rounded-full px-6 py-3 text-sm font-semibold text-white"
          >
            Close
          </button>
        </div>
      }
    >
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-ink-soft">Price</p>
            <p className="font-display text-xl font-bold text-ink">
              ${stock.price.toFixed(2)}
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-ink-soft">Today</p>
            <p
              className={`font-display text-xl font-bold ${
                stock.changePercent >= 0 ? "text-emerald-600" : "text-coral"
              }`}
            >
              {signedPercent(stock.changePercent)}
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-ink-soft">Composite</p>
            <p className="font-display text-xl font-bold text-violet">
              {stock.compositeScore.toFixed(0)} / 100
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-ink-soft">Short-term</p>
            <p className="font-display text-xl font-bold text-ink">
              {(stock.shortTermScore ?? stock.compositeScore).toFixed(0)}
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-ink-soft">Long-term</p>
            <p className="font-display text-xl font-bold text-ink">
              {(stock.longTermScore ?? stock.compositeScore).toFixed(0)}
            </p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-ink-soft">Market cap</p>
            <p className="font-display text-xl font-bold text-ink">
              {formatCap(stock.fundamentals.marketCap)}
            </p>
          </div>
        </div>

        <div className="sheet-well mt-5 rounded-[28px] p-4 sm:p-5">
          <div className="glass rounded-[22px] p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-ink-soft">
                {range} chart
              </p>
              <select
                value={range}
                onChange={(event) => setRange(event.target.value as ChartRange)}
                className="field rounded-full px-3 py-1 text-xs text-ink"
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
            <YahooPriceChart
              symbol={stock.symbol}
              ohlcv={stock.ohlcv}
              yearCloses={stock.yearCloses}
              range={range}
              sessionDate={sessionDate}
              height={180}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {[
              ["P/E", stock.fundamentals.peRatio?.toFixed(1) ?? "—"],
              ["Beta", stock.fundamentals.beta?.toFixed(2) ?? "—"],
              ["EPS", stock.fundamentals.eps != null ? `$${stock.fundamentals.eps.toFixed(2)}` : "—"],
              [
                "Volume",
                stock.volume
                  ? `${(stock.volume / 1_000_000).toFixed(1)}M`
                  : "—",
              ],
            ].map(([label, value]) => (
              <div key={label} className="glass rounded-2xl p-4">
                <p className="text-xs text-ink-soft">{label}</p>
                <p className="mt-1 font-display text-base font-semibold text-ink">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {activeSignals.length > 0 && (
          <div className="mt-5">
            <h3 className="font-display text-lg font-semibold text-ink">
              Active signals
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {activeSignals.slice(0, 6).map((signal) => (
                <div key={signal.strategyId} className="glass rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {signal.strategyName}
                    </p>
                    <span className="text-xs font-semibold text-violet">
                      {signal.score.toFixed(0)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                    {signal.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {report && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-violet">Short-term</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {report.shortTermOutlook}
              </p>
            </div>
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-violet">Long-term</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {report.longTermOutlook}
              </p>
            </div>
            <div className="glass rounded-2xl p-4 sm:col-span-2">
              <h3 className="text-sm font-semibold text-violet">
                Company culture & long-term fit
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {isPro && report.cultureAndLongTermPro
                  ? report.cultureAndLongTermPro
                  : report.cultureAndLongTerm}
              </p>
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">
              Headlines
            </h3>
            <span className="text-[11px] font-medium text-ink-soft">
              {newsStatus === "loading"
                ? "Fetching live headlines…"
                : newsStatus === "live"
                  ? "Live headlines"
                  : "Snapshot headlines"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {news.length > 0 ? (
              news.slice(0, 6).map((item) => (
                <a
                  key={`${item.headline}-${item.datetime}`}
                  href={item.url || "#"}
                  target={item.url ? "_blank" : undefined}
                  rel={item.url ? "noreferrer" : undefined}
                  className="glass block rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
                >
                  <p className="text-sm font-medium text-ink">{item.headline}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {item.source}
                    {item.datetime
                      ? ` · ${new Date(item.datetime).toLocaleString()}`
                      : ""}
                  </p>
                </a>
              ))
            ) : (
              <p className="glass rounded-2xl p-4 text-sm text-ink-soft">
                No headlines available for {stock.symbol} right now.
              </p>
            )}
          </div>
        </div>
    </OverlaySheet>
  );
}

export function compactCompanyName(name: string) {
  return name
    .replace("Corporation", "Corp.")
    .replace("Incorporated", "Inc.")
    .replace("Advanced Micro Devices", "Adv. Micro Devices");
}

export function screenedToCandidate(
  stock: Pick<
    StockCandidate,
    | "symbol"
    | "name"
    | "sector"
    | "industry"
    | "price"
    | "changePercent"
    | "volume"
    | "fundamentals"
    | "compositeScore"
    | "shortTermScore"
    | "longTermScore"
    | "indexMembership"
  > & { change?: number },
): StockCandidate {
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    industry: stock.industry,
    price: stock.price,
    change: stock.change ?? 0,
    changePercent: stock.changePercent,
    volume: stock.volume,
    fundamentals: stock.fundamentals,
    ohlcv: [],
    headlines: [],
    signals: [],
    compositeScore: stock.compositeScore,
    maxCompositeScore: 100,
    shortTermScore: stock.shortTermScore,
    longTermScore: stock.longTermScore,
    indexMembership: stock.indexMembership,
  };
}

export function FlaggedPickButton({
  stock,
  index,
  onOpen,
  summary,
}: {
  stock: StockCandidate;
  index: number;
  onOpen: () => void;
  summary?: string;
}) {
  const spark = sparklineValues(stock.ohlcv, 12);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="glass w-full rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgba(30,70,160,0.45)] active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display font-bold text-ink">{stock.symbol}</p>
          <p className="text-[11px] text-ink-soft">{compactCompanyName(stock.name)}</p>
        </div>
        <span className="font-display text-sm font-bold text-violet">
          {stock.compositeScore.toFixed(0)}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-ink-soft">
        ST {(stock.shortTermScore ?? stock.compositeScore).toFixed(0)}
        {" · "}
        LT {(stock.longTermScore ?? stock.compositeScore).toFixed(0)}
      </p>
      <MiniChart
        values={spark}
        id={`flagged-${stock.symbol}-${index}`}
        height={54}
      />
      {summary ? (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-soft">
          {summary}
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold text-ink">
          ${stock.price.toFixed(2)}
        </span>
        <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-xs font-semibold text-violet">
          View
        </span>
      </div>
    </button>
  );
}
