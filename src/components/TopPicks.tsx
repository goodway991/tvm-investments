"use client";

import type { ReactNode } from "react";
import type { CompanyReport, StockCandidate, StrategyId } from "@/types";
import { STRATEGY_NAMES } from "@/types";
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

const STRATEGY_ORDER = Object.keys(STRATEGY_NAMES) as StrategyId[];

function padLines(items: string[] | undefined, count: number, empty: string) {
  const next = (items ?? []).map((item) => item.trim()).filter(Boolean).slice(0, count);
  while (next.length < count) next.push(empty);
  return next;
}

function splitSentences(text: string | undefined, count: number, empty: string) {
  const parts = (text ?? "")
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return padLines(parts, count, empty);
}

function tapeRead(fullReport?: string) {
  const match = fullReport?.match(/News classification:\s*(.+)/i);
  const line = match?.[1]?.replace(/\s+/g, " ").trim();
  return line || "No tape read this session.";
}

function fundamentalRows(pick?: StockCandidate) {
  if (!pick) {
    return [
      ["P/E", "—"],
      ["Beta", "—"],
      ["EPS", "—"],
      ["Market cap", "—"],
      ["52-week", "—"],
    ];
  }
  const { peRatio, beta, eps, marketCap } = pick.fundamentals;
  const low = pick.fiftyTwoWeekLow;
  const high = pick.fiftyTwoWeekHigh;
  return [
    ["P/E", peRatio != null ? peRatio.toFixed(1) : "—"],
    ["Beta", beta != null ? beta.toFixed(2) : "—"],
    ["EPS", eps != null ? `$${eps.toFixed(2)}` : "—"],
    ["Market cap", marketCap != null ? `$${(marketCap / 1e9).toFixed(1)}B` : "—"],
    [
      "52-week",
      low != null && high != null ? `$${low.toFixed(2)} – $${high.toFixed(2)}` : "—",
    ],
  ];
}

function signalsForLayout(signals: StockCandidate["signals"] | undefined) {
  const byId = new Map((signals ?? []).map((signal) => [signal.strategyId, signal]));
  return STRATEGY_ORDER.map((id) => {
    const signal = byId.get(id);
    return (
      signal ?? {
        strategyId: id,
        strategyName: STRATEGY_NAMES[id],
        triggered: false,
        score: 0,
        maxScore: 100,
        detail: "No reading this session.",
      }
    );
  });
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
        {[0, 1, 2].map((idx) => {
          const pick = picks[idx];
          const report = pick
            ? reports.find((item) => item.symbol === pick.symbol)
            : undefined;

          return (
            <article
              key={pick?.symbol ?? `empty-pick-${idx}`}
              className="glass-strong rounded-[24px] p-5 shadow-[0_18px_40px_-24px_rgba(52,41,120,0.4)] sm:p-6"
            >
              <p className="glass inline-flex rounded-2xl px-3 py-1.5 font-display text-sm font-bold text-violet shadow-[0_12px_24px_-18px_rgba(52,41,120,0.35)]">
                Pick {idx + 1}
              </p>
              <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-bold text-ink sm:text-[1.35rem]">
                    {pick?.name ?? "No flagged name"}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-display font-bold text-violet">
                      {pick?.symbol ?? "—"}
                    </span>
                    {" · "}
                    {pick ? `${pick.industry} · ${pick.sector}` : "This slot fills when the session screens another pick."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Stat
                    label="Score"
                    value={pick ? `${pick.compositeScore.toFixed(0)}/100` : "—"}
                    highlight
                  />
                  <Stat
                    label="Short-term"
                    value={
                      pick
                        ? (pick.shortTermScore ?? pick.compositeScore).toFixed(0)
                        : "—"
                    }
                  />
                  <Stat
                    label="Long-term"
                    value={
                      pick
                        ? (pick.longTermScore ?? pick.compositeScore).toFixed(0)
                        : "—"
                    }
                  />
                  <Stat
                    label="Today"
                    value={
                      pick
                        ? `${pick.changePercent >= 0 ? "+" : ""}${pick.changePercent.toFixed(2)}%`
                        : "—"
                    }
                    positive={pick ? pick.changePercent >= 0 : undefined}
                  />
                  {!compact && (
                    <Stat
                      label="Price"
                      value={pick ? `$${pick.price.toFixed(2)}` : "—"}
                    />
                  )}
                </div>
              </div>

              {!compact && (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <div className="glass h-64 rounded-[22px] p-3 shadow-[0_16px_34px_-22px_rgba(52,41,120,0.4)]">
                    {pick ? (
                      <YahooPriceChart
                        symbol={pick.symbol}
                        ohlcv={pick.ohlcv}
                        yearCloses={pick.yearCloses}
                        range="month"
                        sessionDate={sessionDate}
                        height={232}
                      />
                    ) : (
                      <p className="grid h-full place-items-center text-sm text-ink-soft">
                        Chart fills when this slot has a pick.
                      </p>
                    )}
                  </div>
                  <div className="glass rounded-[22px] p-4 shadow-[0_16px_34px_-22px_rgba(52,41,120,0.4)]">
                    <SignalGrid signals={signalsForLayout(pick?.signals)} />
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <NoteWidget title="Short-term">
                    <TextRows
                      lines={splitSentences(
                        report?.shortTermOutlook,
                        4,
                        "No short-term note this slot.",
                      )}
                    />
                  </NoteWidget>
                  <NoteWidget title="Long-term">
                    <TextRows
                      lines={splitSentences(
                        report?.longTermOutlook,
                        4,
                        "No long-term note this slot.",
                      )}
                    />
                  </NoteWidget>
                </div>

                {!compact && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <NoteWidget title="Session headlines">
                        <TextRows
                          lines={padLines(
                            report?.recentEvents,
                            3,
                            "No headline this slot.",
                          )}
                        />
                      </NoteWidget>
                      <NoteWidget title="Tape read">
                        <TextRows lines={[tapeRead(report?.fullReport)]} />
                      </NoteWidget>
                    </div>
                    <NoteWidget title="Fundamentals">
                      <div className="mt-3 grid gap-2">
                        {fundamentalRows(pick).map(([label, value]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between gap-3 rounded-xl bg-white/75 px-3 py-2.5"
                          >
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet">
                              {label}
                            </span>
                            <span className="font-display text-sm font-bold text-ink">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </NoteWidget>
                    <div className="grid gap-3 md:grid-cols-2">
                      <NoteWidget title="Upside drivers" tone="gain">
                        <TextRows
                          lines={padLines(report?.upsideDrivers, 3, "—")}
                        />
                      </NoteWidget>
                      <NoteWidget title="Downside risks" tone="loss">
                        <TextRows
                          lines={padLines(report?.downsideRisks, 3, "—")}
                        />
                      </NoteWidget>
                    </div>
                  </>
                )}

                <NoteWidget
                  title={
                    isPro && report?.cultureAndLongTermPro
                      ? "Pro culture write-up"
                      : "Culture note"
                  }
                >
                  <TextRows
                    lines={splitSentences(
                      isPro && report?.cultureAndLongTermPro
                        ? report.cultureAndLongTermPro
                        : report?.cultureAndLongTerm,
                      3,
                      "No culture note this slot.",
                    )}
                  />
                </NoteWidget>
              </div>
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
  tone,
  children,
}: {
  title: string;
  tone?: "gain" | "loss";
  children: ReactNode;
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
      {children}
    </div>
  );
}

function TextRows({ lines }: { lines: string[] }) {
  return (
    <div className="mt-3 grid gap-2">
      {lines.map((line, index) => (
        <p
          key={`${line}-${index}`}
          className="rounded-xl bg-white/75 px-3 py-2.5 text-sm leading-relaxed text-ink"
        >
          {line}
        </p>
      ))}
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
        Strategy signals
      </p>
      <div className="mt-3 space-y-2">
        {signals.map((signal) => (
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
              {signal.score > 0 ? signal.score.toFixed(0) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
