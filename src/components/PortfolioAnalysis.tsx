"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScreenedStock, StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { useUpgrade } from "@/components/UpgradeProvider";
import { TVMIcon } from "@/components/TVMBrand";
import { ProGlowPhrase, ProGlowText } from "@/components/ProGlowText";
import { NewBadge } from "@/components/NewBadge";
import {
  analyzePortfolio,
  withConsidering,
  type AnalysisPosition,
  type AnalysisQuote,
  type PortfolioReview,
} from "@/lib/portfolio-analysis";
import { BogenHeading, BogenTip } from "@/components/BogenProvider";
import { planHasPro } from "@/lib/plans";
import type { BogenId } from "@/lib/bogen";

const ASPECT_BOGEN: Record<string, BogenId> = {
  diversity: "portfolio-diversity",
  concentration: "portfolio-concentration",
  quality: "portfolio-quality",
  value: "portfolio-value",
  cash: "portfolio-buffer",
  breadth: "portfolio-breadth",
};

function AspectCard({
  id,
  title,
  score,
  summary,
  detail,
}: {
  id: string;
  title: string;
  score: number;
  summary: string;
  detail: string;
}) {
  const [open, setOpen] = useState(false);
  const bogenId = ASPECT_BOGEN[id] ?? "portfolio-review";
  return (
    <article className="relative glass rounded-[22px] shadow-[0_16px_34px_-22px_rgba(30,70,160,0.4)]">
      <div className="flex items-start">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="min-w-0 flex-1 rounded-[22px] p-4 text-left"
        >
          <p className="font-display text-base font-bold text-ink">{title}</p>
          <p className="mt-1 text-sm text-ink-soft">{summary}</p>
          <p className="mt-2 text-[11px] font-semibold text-violet">
            {open ? "Close" : "More"}
          </p>
          {open ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail}</p>
          ) : null}
        </button>
        <div className="flex shrink-0 items-start gap-1.5 p-4 pl-0">
          <BogenTip id={bogenId} className="relative z-[3] mt-1" />
          <p className="font-display text-xl font-bold text-ink">{score}</p>
        </div>
      </div>
    </article>
  );
}

function ScoreBar({
  title,
  bogenId,
  review,
  caption,
  delta = null,
}: {
  title: string;
  bogenId: BogenId;
  review: PortfolioReview;
  caption: string;
  delta?: number | null;
}) {
  return (
    <article className="relative glass rounded-[22px] p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        <BogenHeading id={bogenId}>{title}</BogenHeading>
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <p className="font-display text-4xl font-bold text-ink">
            {review.overall == null ? "—" : review.overall}
            <span className="ml-2 text-lg font-semibold text-ink-soft">/ 100</span>
          </p>
          {delta != null ? (
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                delta > 0
                  ? "bg-emerald-400/20 text-emerald-600"
                  : delta < 0
                    ? "bg-coral/20 text-coral"
                    : "bg-ink/10 text-ink-soft"
              }`}
            >
              {delta > 0 ? `+${delta}` : `${delta}`}
            </button>
          ) : null}
        </div>
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
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{caption}</p>
    </article>
  );
}

export function BookScoreCard({
  stocks,
  screened = [],
  cash,
  considering = [],
}: {
  stocks: StockCandidate[];
  screened?: ScreenedStock[];
  cash: number;
  considering?: AnalysisPosition[];
}) {
  const { entitlement, positions } = useAuth();
  const { openUpgrade } = useUpgrade();
  const isPro = planHasPro(entitlement.plan);
  const [predicted, setPredicted] = useState(false);

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

  const current = useMemo(
    () => analyzePortfolio({ cash, positions, quotes }),
    [cash, positions, quotes],
  );
  const possible = useMemo(
    () =>
      analyzePortfolio({
        cash,
        positions: withConsidering(positions, considering),
        quotes,
      }),
    [cash, considering, positions, quotes],
  );

  const consideringKey = considering
    .map((row) => `${row.symbol}:${row.shares}:${row.averageCost}`)
    .join("|");

  useEffect(() => {
    setPredicted(false);
  }, [consideringKey, cash, positions]);

  const showingPossible = predicted && considering.some((row) => row.shares > 0);
  const added = considering.filter((row) => row.shares > 0).length;
  const delta =
    current.overall != null && possible.overall != null
      ? possible.overall - current.overall
      : null;

  function onPredict() {
    if (!isPro) {
      openUpgrade();
      return;
    }
    setPredicted(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onPredict}
          className="pro-profile-glow inline-flex items-center gap-2 rounded-full bg-transparent px-5 py-2.5 text-sm font-semibold"
        >
          {!isPro ? <TVMIcon name="lock" size={16} /> : null}
          <ProGlowText>Predict score</ProGlowText>
        </button>
        <BogenTip id="portfolio-predict" />
      </div>
      {showingPossible ? (
        <ScoreBar
          title="Possible score"
          bogenId="portfolio-score"
          review={possible}
          delta={delta}
          caption={`If you added ${added} considering name${added === 1 ? "" : "s"} to the book. Current book is ${current.overall ?? "—"}. Educational snapshot — not advice.`}
        />
      ) : null}
    </div>
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
  const isPro = planHasPro(entitlement.plan);

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
          <BogenHeading id="portfolio-review">Analyze your portfolio</BogenHeading>
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
          <ScoreBar
            title="Overall score"
            bogenId="portfolio-score"
            review={review}
            caption={
              review.counted
                ? `Built from ${review.counted} holding${review.counted === 1 ? "" : "s"} plus cash. Educational snapshot — not advice.`
                : "Save at least one holding to fill the overall score."
            }
          />

          {review.aspects.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {review.aspects.map((aspect) => (
                <AspectCard key={aspect.id} {...aspect} />
              ))}
            </div>
          ) : null}

          <article className="relative glass rounded-[22px] p-5">
            <p className="font-display text-base font-bold text-ink">
              <BogenHeading id="portfolio-improve">{review.improve.title}</BogenHeading>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {review.improve.body}
            </p>
          </article>

          <div className="grid gap-3 sm:grid-cols-3">
            {review.nextSteps.map((step) => (
              <article key={step.title} className="relative glass rounded-[22px] p-4">
                <p className="font-display text-sm font-bold text-ink">
                  <BogenHeading id="portfolio-next">{step.title}</BogenHeading>
                </p>
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
