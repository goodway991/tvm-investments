"use client";

import { useState } from "react";
import type { SectorDive } from "@/types";
import { PaywallLock } from "@/components/PaywallLock";
import { FREE_SECTOR_DIVE_LIMIT } from "@/lib/plans";

type StockStat = {
  symbol: string;
  price: string;
  change: string;
  rsi?: string;
  volumeX?: string;
};

type ScoreChip = { symbol: string; score: string };

type DiveBlock = {
  title?: string;
  body: string;
  stats: StockStat[];
  scores: ScoreChip[];
  headlines: string[];
};

function scrubCopy(text: string) {
  return text
    .replace(/\bYahoo Finance\b/gi, "this session")
    .replace(/\bYahoo-scanned\b/gi, "scanned")
    .replace(/\bYahoo\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const STOCK_PATTERN =
  "([A-Z][A-Z0-9.\\-]{0,7})\\s+\\$([\\d,.]+)\\s+\\(([+-]?\\d+\\.\\d+%)\\)(?:\\s*,\\s*RSI\\s+(\\d+))?(?:\\s*,\\s*([\\d.]+)x avg volume)?";
const SCORE_PATTERN = "([A-Z][A-Z0-9.\\-]{0,7})\\s+\\((\\d+(?:\\.\\d+)?)\\/100\\)";

function parseStockStats(text: string): StockStat[] {
  return [...text.matchAll(new RegExp(STOCK_PATTERN, "g"))].map((match) => ({
    symbol: match[1],
    price: match[2],
    change: match[3],
    rsi: match[4],
    volumeX: match[5],
  }));
}

function parseScores(text: string): ScoreChip[] {
  return [...text.matchAll(new RegExp(SCORE_PATTERN, "g"))].map((match) => ({
    symbol: match[1],
    score: match[2],
  }));
}

function parseHeadlines(text: string) {
  const marker = /Latest headlines\s*[—–-]\s*/i;
  const split = text.split(marker);
  if (split.length < 2) return [];
  return split[1]
    .split(/\s*\|\s*/)
    .map((item) => item.replace(/\.$/, "").trim())
    .filter(Boolean);
}

function parseDiveBody(body: string): DiveBlock[] {
  return scrubCopy(body)
    .split(/\n\n+/)
    .map((paragraph) => {
      let title: string | undefined;
      let content = paragraph.replace(/\*\*/g, "").trim();
      if (paragraph.startsWith("**") && paragraph.includes(":**")) {
        const [rawTitle, ...rest] = paragraph.split(":**");
        title = rawTitle.replace(/\*\*/g, "").trim();
        content = rest.join(":**").trim();
      }
      return {
        title,
        body: content,
        stats: parseStockStats(content),
        scores: parseScores(content),
        headlines: parseHeadlines(content),
      } satisfies DiveBlock;
    })
    .filter((block) => block.body);
}

function changeTone(change: string) {
  if (change.startsWith("-")) return "text-loss";
  if (change.startsWith("+")) return "text-gain";
  return "text-ink-soft";
}

function DiveWidget({ block }: { block: DiveBlock }) {
  const hasStats = block.stats.length > 0;
  const hasScores = block.scores.length > 0;
  const leftover =
    hasStats || hasScores
      ? block.body
          .replace(new RegExp(STOCK_PATTERN, "g"), "")
          .replace(new RegExp(SCORE_PATTERN, "g"), "")
          .replace(/Highest composite scores:\s*/i, "")
          .replace(/Latest headlines\s*[—–-]\s*.*$/i, "")
          .replace(/[;,]?\s*$/, "")
          .replace(/\s{2,}/g, " ")
          .trim()
      : block.body;

  return (
    <article className="glass rounded-[22px] p-4 shadow-[0_16px_34px_-22px_rgba(52,41,120,0.4)]">
      {block.title ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet">
          {block.title}
        </p>
      ) : null}

      {hasStats ? (
        <div className={`grid gap-2 ${block.title ? "mt-3" : ""}`}>
          {block.stats.map((stat) => (
            <div
              key={`${stat.symbol}-${stat.price}`}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-white/75 px-3 py-2.5"
            >
              <span className="font-display text-sm font-bold text-ink">{stat.symbol}</span>
              <span className="font-display text-sm font-semibold text-ink">${stat.price}</span>
              <span className={`text-sm font-semibold ${changeTone(stat.change)}`}>
                {stat.change}
              </span>
              {stat.rsi ? (
                <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[11px] font-semibold text-violet">
                  RSI {stat.rsi}
                </span>
              ) : null}
              {stat.volumeX ? (
                <span className="text-[11px] font-semibold text-ink-soft">
                  {stat.volumeX}x vol
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {hasScores ? (
        <div className={`flex flex-wrap gap-2 ${block.title || hasStats ? "mt-3" : ""}`}>
          {block.scores.map((chip) => (
            <span
              key={`${chip.symbol}-${chip.score}`}
              className="rounded-full bg-violet/10 px-3 py-1 font-display text-sm font-bold text-violet"
            >
              {chip.symbol}
              <span className="ml-1.5 font-semibold text-ink">{chip.score}/100</span>
            </span>
          ))}
        </div>
      ) : null}

      {block.headlines.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {block.headlines.map((headline) => (
            <li
              key={headline}
              className="rounded-xl bg-white/70 px-3 py-2 text-sm leading-relaxed text-ink"
            >
              {headline}
            </li>
          ))}
        </ul>
      ) : null}

      {!hasStats && !hasScores && leftover ? (
        <p
          className={`whitespace-pre-line text-sm leading-relaxed text-ink ${
            block.title ? "mt-2" : "font-display text-[15px] font-semibold"
          }`}
        >
          {leftover}
        </p>
      ) : leftover && leftover.length > 12 ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{leftover}</p>
      ) : null}
    </article>
  );
}

function DiveBody({ body }: { body: string }) {
  const blocks = parseDiveBody(body);
  if (blocks.length === 0) {
    return (
      <article className="glass rounded-[22px] p-4 text-sm text-ink-soft">
        No notes for this sleeve yet.
      </article>
    );
  }
  return (
    <div className="grid gap-3">
      {blocks.map((block, index) => (
        <DiveWidget key={`${block.title ?? "lead"}-${index}`} block={block} />
      ))}
    </div>
  );
}

export function TechSector({
  dives,
  analysis,
  isPro,
}: {
  dives?: SectorDive[];
  analysis?: string;
  isPro: boolean;
}) {
  const deck =
    dives && dives.length > 0
      ? dives
      : [
          {
            id: "tech",
            sector: "Technology",
            title: "Tech Sector Deep Dive",
            subtitle: "Sector-specific analysis for technology names in today’s screener.",
            body: analysis ?? "",
          },
        ];
  const [index, setIndex] = useState(0);
  const current = deck[Math.min(index, deck.length - 1)] ?? deck[0];
  const locked = !isPro && index >= FREE_SECTOR_DIVE_LIMIT;
  const atStart = index <= 0;
  const atEnd = index >= deck.length - 1;

  return (
    <div className="glass-strong flex h-full flex-col rounded-[24px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            {current.sector}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink">{current.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{scrubCopy(current.subtitle)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={atStart}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className={`grid h-9 w-9 place-items-center rounded-full ${
                atStart
                  ? "cursor-default text-zinc-300"
                  : "glass text-violet hover:-translate-y-0.5 hover:text-violet"
              }`}
              aria-label="Previous sector"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M15 6 9 12l6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              disabled={atEnd}
              onClick={() => setIndex((value) => Math.min(deck.length - 1, value + 1))}
              className={`grid h-9 w-9 place-items-center rounded-full ${
                atEnd
                  ? "cursor-default text-zinc-300"
                  : "glass text-violet hover:-translate-y-0.5 hover:text-violet"
              }`}
              aria-label="Next sector"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-violet">
            {index + 1} / {deck.length}
          </p>
        </div>
      </div>

      <div className="relative mt-5 min-h-[280px] flex-1 overflow-y-auto overflow-x-hidden rounded-[22px] pr-0.5">
        {locked ? (
          <PaywallLock locked placeholder>
            <DiveBody body={current.body} />
          </PaywallLock>
        ) : (
          <DiveBody body={current.body} />
        )}
      </div>
    </div>
  );
}
