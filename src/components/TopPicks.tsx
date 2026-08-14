"use client";

import type { ReactNode } from "react";
import type { CompanyReport, StockCandidate } from "@/types";
import { YahooPriceChart } from "@/components/TimeSeriesChart";

interface TopPicksProps {
  picks: StockCandidate[];
  reports: CompanyReport[];
  title?: string;
  subtitle?: string;
  isPro?: boolean;
  compact?: boolean;
  sessionDate?: string;
}

export function TopPicks({
  picks,
  reports,
  title = "Today's Top 3 Flagged Picks",
  subtitle = "Ranked by composite score across all 8 strategies using live quotes, daily bars, and headlines.",
  isPro = false,
  compact = false,
  sessionDate,
}: TopPicksProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>

      <div className="mt-6 grid gap-5">
        {picks.map((pick, idx) => {
          const report = reports.find((item) => item.symbol === pick.symbol);

          return (
            <article
              key={pick.symbol}
              className="glass-strong rounded-[24px] p-5 shadow-[0_18px_40px_-24px_rgba(52,41,120,0.4)] sm:p-6"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet">
                Pick {idx + 1}
              </p>
              <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-bold text-ink sm:text-[1.35rem]">
                    {pick.name}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-display font-bold text-violet">{pick.symbol}</span>
                    {" · "}
                    {pick.industry} · {pick.sector}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Stat label="Score" value={`${pick.compositeScore.toFixed(0)}/100`} highlight />
                  <Stat
                    label="Short-term"
                    value={(pick.shortTermScore ?? pick.compositeScore).toFixed(0)}
                  />
                  <Stat
                    label="Long-term"
                    value={(pick.longTermScore ?? pick.compositeScore).toFixed(0)}
                  />
                  <Stat
                    label="Today"
                    value={`${pick.changePercent >= 0 ? "+" : ""}${pick.changePercent.toFixed(2)}%`}
                    positive={pick.changePercent >= 0}
                  />
                  {!compact && <Stat label="Price" value={`$${pick.price.toFixed(2)}`} />}
                </div>
              </div>

              {!compact && (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <div className="glass h-64 rounded-[22px] p-3 shadow-[0_16px_34px_-22px_rgba(52,41,120,0.4)]">
                    <YahooPriceChart
                      symbol={pick.symbol}
                      ohlcv={pick.ohlcv}
                      yearCloses={pick.yearCloses}
                      range="month"
                      sessionDate={sessionDate}
                      height={232}
                    />
                  </div>
                  <div className="glass rounded-[22px] p-4 shadow-[0_16px_34px_-22px_rgba(52,41,120,0.4)]">
                    <SignalGrid
                      signals={pick.signals.filter(
                        (signal) => signal.triggered || signal.score > 50,
                      )}
                    />
                  </div>
                </div>
              )}

              {report && (
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <NoteWidget title="Short-term" body={report.shortTermOutlook} />
                    <NoteWidget title="Long-term" body={report.longTermOutlook} />
                  </div>

                  {!compact && (
                    <>
                      <NoteWidget title="Research report">
                        <div
                          className="prose-tvm text-sm text-ink-soft"
                          dangerouslySetInnerHTML={{
                            __html: report.fullReport
                              .replace(/^## /gm, "<h3>")
                              .replace(/^### /gm, "<h4>")
                              .replace(/\n/g, "<br/>")
                              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                          }}
                        />
                      </NoteWidget>
                      <div className="grid gap-3 md:grid-cols-2">
                        <NoteWidget title="Upside drivers" tone="gain">
                          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
                            {report.upsideDrivers.map((driver) => (
                              <li key={driver}>{driver}</li>
                            ))}
                          </ul>
                        </NoteWidget>
                        <NoteWidget title="Downside risks" tone="loss">
                          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
                            {report.downsideRisks.map((risk) => (
                              <li key={risk}>{risk}</li>
                            ))}
                          </ul>
                        </NoteWidget>
                      </div>
                    </>
                  )}

                  <NoteWidget
                    title={isPro && report.cultureAndLongTermPro ? "Pro culture write-up" : "Culture note"}
                    body={
                      isPro && report.cultureAndLongTermPro
                        ? report.cultureAndLongTermPro
                        : report.cultureAndLongTerm
                    }
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="glass min-w-[6.5rem] rounded-2xl px-3 py-2.5 text-center shadow-[0_12px_24px_-18px_rgba(52,41,120,0.35)]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-violet">{label}</p>
      <p
        className={`mt-0.5 font-display text-lg font-bold ${
          highlight
            ? "text-violet"
            : positive === true
              ? "text-gain"
              : positive === false
                ? "text-loss"
                : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function NoteWidget({
  title,
  body,
  tone,
  children,
}: {
  title: string;
  body?: string;
  tone?: "gain" | "loss";
  children?: ReactNode;
}) {
  return (
    <div className="glass rounded-[22px] p-4 shadow-[0_16px_34px_-22px_rgba(52,41,120,0.4)]">
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
          tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-violet"
        }`}
      >
        {title}
      </p>
      {body ? (
        <p className="mt-2 text-sm leading-relaxed text-ink">{body}</p>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </div>
  );
}

function SignalGrid({
  signals,
}: {
  signals: StockCandidate["signals"];
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet">
        Active signals
      </p>
      <div className="mt-3 space-y-2">
        {signals.slice(0, 6).map((signal) => (
          <div
            key={signal.strategyId}
            className="flex items-start justify-between gap-2 rounded-xl bg-white/75 px-3 py-2.5"
          >
            <div>
              <p className="font-display text-sm font-bold text-ink">{signal.strategyName}</p>
              <p className="mt-1 text-xs text-ink-soft">{signal.detail}</p>
              {signal.unavailable && (
                <p className="mt-1 text-xs text-amber-600">Limited free-tier data</p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 font-display text-xs font-bold ${
                signal.triggered ? "bg-emerald-400/15 text-gain" : "bg-violet/10 text-violet"
              }`}
            >
              {signal.score.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
