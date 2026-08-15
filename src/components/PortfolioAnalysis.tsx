"use client";

import { useMemo, useState } from "react";
import type { ScreenedStock, StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { useUpgrade } from "@/components/UpgradeProvider";
import { TVMIcon } from "@/components/TVMBrand";
import { ProGlowPhrase, ProGlowText } from "@/components/ProGlowText";
import { NewBadge } from "@/components/NewBadge";
import {
  analyzePortfolio,
  type AnalysisQuote,
} from "@/lib/portfolio-analysis";

function AspectCard({
  title,
  score,
  summary,
  detail,
}: {
  title: string;
  score: number;
  summary: string;
  detail: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="glass rounded-[22px] shadow-[0_16px_34px_-22px_rgba(30,70,160,0.4)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full rounded-[22px] p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-base font-bold text-ink">{title}</p>
            <p className="mt-1 text-sm text-ink-soft">{summary}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-bold text-ink">{score}</p>
            <p className="text-[11px] font-semibold text-violet">
              {open ? "Close" : "More"}
            </p>
          </div>
        </div>
        {open ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail}</p>
        ) : null}
      </button>
    </article>
  );
}

export function PortfolioAnalysis({
  stocks,
  screened = [],
  cash,
}: {
  stocks: StockCandidate[];
  screened?: ScreenedStock[];
  cash: number;
}) {
  const { entitlement, positions } = useAuth();
  const { openUpgrade } = useUpgrade();
  const [open, setOpen] = useState(false);
  const isPro = entitlement.plan === "pro";

  const quotes = useMemo(() => {
    const map = new Map<string, AnalysisQuote>();
    for (const stock of screened) {
      map.set(stock.symbol, {
        name: stock.name,
        price: stock.price,
        sector: stock.sector,
        industry: stock.industry,
        composite: stock.compositeScore,
        peRatio: stock.fundamentals?.peRatio ?? null,
      });
    }
    for (const stock of stocks) {
      map.set(stock.symbol, {
        name: stock.name,
        price: stock.price,
        sector: stock.sector,
        industry: stock.industry,
        composite: stock.compositeScore,
        peRatio: stock.fundamentals?.peRatio ?? null,
      });
    }
    return map;
  }, [screened, stocks]);

  const review = useMemo(
    () =>
      analyzePortfolio({
        cash,
        positions,
        quotes,
      }),
    [cash, positions, quotes],
  );

  function onAnalyze() {
    if (!isPro) {
      openUpgrade();
      return;
    }
    setOpen((value) => !value);
  }

  return (
    <section className="glass-strong rounded-[24px] p-6">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet">
          Book review
          <NewBadge feature="portfolio" />
        </p>
        <h3 className="mt-1 font-display text-2xl font-bold text-ink">
          Analyze your portfolio
        </h3>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">
          A Pro read of mix, concentration, scan quality, and cash — with
          next steps under each score.
        </p>
      </div>
      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={onAnalyze}
          className="pro-profile-glow inline-flex items-center gap-2 rounded-full bg-transparent px-5 py-2.5 text-sm font-semibold"
        >
          {!isPro ? <TVMIcon name="lock" size={16} /> : null}
          {isPro ? (
            open ? (
              "Hide review"
            ) : (
              <ProGlowText>Analyze book</ProGlowText>
            )
          ) : (
            <ProGlowText>Analyze book</ProGlowText>
          )}
        </button>
      </div>

      {open && isPro ? (
        <div className="mt-6 space-y-4">
          <article className="glass rounded-[22px] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">
              Overall score
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <p className="font-display text-4xl font-bold text-ink">
                {review.overall == null ? "—" : review.overall}
                <span className="ml-2 text-lg font-semibold text-ink-soft">/ 100</span>
              </p>
              <p className="text-sm font-semibold text-ink">{review.strength}</p>
            </div>
            <div className="book-strength mt-4">
              <div className="book-strength-track" aria-hidden>
                <span
                  className="book-strength-dot"
                  style={{
                    left: `${review.overall == null ? 0 : review.overall}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-soft">
                <span>Fragile</span>
                <span>Mixed</span>
                <span>Strong</span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {review.counted
                ? `Built from ${review.counted} holding${review.counted === 1 ? "" : "s"} plus cash. Educational snapshot — not advice.`
                : "Save at least one holding to fill this score."}
            </p>
          </article>

          {review.aspects.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {review.aspects.map((aspect) => (
                <AspectCard key={aspect.id} {...aspect} />
              ))}
            </div>
          ) : null}

          <article className="glass rounded-[22px] p-5">
            <p className="font-display text-base font-bold text-ink">
              {review.improve.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {review.improve.body}
            </p>
          </article>

          <div className="grid gap-3 sm:grid-cols-3">
            {review.nextSteps.map((step) => (
              <article key={step.title} className="glass rounded-[22px] p-4">
                <p className="font-display text-sm font-bold text-ink">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!isPro ? (
        <p className="mt-4 text-sm text-ink-soft">
          <ProGlowPhrase>Pro</ProGlowPhrase> unlocks the full review. Free can
          still log holdings above.
        </p>
      ) : null}
    </section>
  );
}
