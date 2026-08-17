"use client";

import { useState } from "react";
import type { BriefArticleBlock, MarketEvent } from "@/types";
import { BogenHeading } from "@/components/BogenProvider";
import { OverlaySheet } from "@/components/OverlaySheet";
import { useSiteEra } from "@/components/SiteEraProvider";
import { TVMIcon } from "@/components/TVMBrand";
import { showTvm10Labs } from "@/lib/beta-labs";

const impactColors = {
  bullish: "text-gain bg-green-500/10 border-green-500/20",
  bearish: "text-loss bg-red-500/10 border-red-500/20",
  mixed: "text-amber-700 bg-amber-500/10 border-amber-500/20",
};

const regionLabels = {
  US: "🇺🇸 US",
  Global: "🌍 Global",
  Tech: "💻 Tech",
};

const EMPTY_EVENT: MarketEvent = {
  title: "No headline this slot",
  region: "US",
  impact: "mixed",
  summary: "This slot fills when the session snapshot has another headline.",
  date: "",
};

function stripPublishedDate(text: string) {
  return text
    .replace(/\bPublished\s+\d{4}-\d{2}-\d{2}\.?/gi, "")
    .replace(/\s*Reported by .+ in Morning Brew\.?/gi, "")
    .replace(/\s*Reported by Morning Brew\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatDate(isoDate: string) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fallbackBlocks(event: MarketEvent): BriefArticleBlock[] {
  if (event.blocks?.length) return event.blocks;
  const text = stripPublishedDate(event.detail || event.summary);
  return text
    .split(/\n{2,}/)
    .map((part) => stripPublishedDate(part))
    .filter(Boolean)
    .map((part) => ({ type: "paragraph" as const, text: part }));
}

function ArticleBlocks({ blocks }: { blocks: BriefArticleBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3 key={index} className="font-display text-xl font-bold text-ink">
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink sm:text-base">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="text-sm leading-relaxed text-ink sm:text-base">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-lg font-bold capitalize text-ink">{value}</p>
    </div>
  );
}

function EventSheet({ event, onClose }: { event: MarketEvent; onClose: () => void }) {
  const blocks = fallbackBlocks(event);
  const read = event.readMinutes ?? Math.max(1, Math.round(blocks.length / 2));
  return (
    <OverlaySheet
      labelledBy="brief-headline-dialog"
      onClose={onClose}
      variant="card"
      panelClassName="glass-strong relative z-10 mx-auto flex max-h-[calc(100svh-2rem)] w-full max-w-[920px] flex-col overflow-hidden rounded-[32px]"
      headerClassName="shrink-0 px-5 pt-6 sm:px-8 sm:pt-8"
      footerClassName="shrink-0 px-5 pb-5 sm:px-8 sm:pb-7"
      header={
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">
              {event.category || event.region} · {event.impact}
            </p>
            <h2
              id="brief-headline-dialog"
              className="mt-1 font-display text-3xl font-bold text-ink"
            >
              {event.title}
            </h2>
            {event.author ? (
              <p className="mt-1 truncate text-sm text-ink-soft">By {event.author}</p>
            ) : null}
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
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Region" value={event.region} />
          <Stat label="Tone" value={event.impact} />
          <Stat label="Published" value={formatDate(event.date) || "—"} />
          <Stat label="Desk" value={event.category || event.region} />
          <Stat label="Byline" value={event.author || "Desk"} />
          <Stat label="Read" value={`${read} min`} />
        </div>

        {event.imageUrl ? (
          <figure className="overflow-hidden rounded-[22px]">
            <img
              src={event.imageUrl}
              alt={event.imageCaption || event.title}
              className="h-56 w-full object-cover sm:h-72"
            />
            {event.imageCaption ? (
              <figcaption className="sheet-well px-4 py-2 text-xs text-ink-soft">
                {event.imageCaption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <ArticleBlocks blocks={blocks} />

        {event.tickers?.length ? (
          <div className="flex flex-wrap gap-2">
            {event.tickers.map((ticker) => (
              <span
                key={ticker}
                className="rounded-full bg-violet/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet"
              >
                {ticker}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </OverlaySheet>
  );
}

function EventCard({
  event,
  index,
  open,
  onToggle,
  expandable,
  articleSheet,
}: {
  event: MarketEvent;
  index: number;
  open: boolean;
  onToggle: () => void;
  expandable: boolean;
  articleSheet: boolean;
}) {
  const empty = !event.date && event.title === EMPTY_EVENT.title;
  const teaser = stripPublishedDate(event.summary);
  const fuller = stripPublishedDate(event.detail || "");
  const extra =
    fuller && fuller !== teaser
      ? fuller.startsWith(teaser)
        ? fuller.slice(teaser.length).trim()
        : fuller
      : "";

  if (empty) {
    return (
      <article className="glass rounded-[22px] p-4 shadow-[0_16px_34px_-22px_rgba(30,70,160,0.4)]">
        <h3 className="font-medium text-ink">{event.title}</h3>
        <p className="mt-2 text-sm text-ink-soft">{event.summary}</p>
      </article>
    );
  }

  if (articleSheet) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="glass w-full rounded-[22px] p-4 text-left shadow-[0_16px_34px_-22px_rgba(30,70,160,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgba(30,70,160,0.45)] active:scale-[0.98]"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-soft">{regionLabels[event.region]}</span>
          <span className={`rounded-full border px-2 py-0.5 text-xs ${impactColors[event.impact]}`}>
            {event.impact}
          </span>
        </div>
        <h3 className="font-medium text-ink">{event.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{teaser}</p>
        <p className="mt-2 text-[11px] font-medium text-violet">Tap to open</p>
      </button>
    );
  }

  if (!expandable) {
    return (
      <article className="glass rounded-[22px] p-4 shadow-[0_16px_34px_-22px_rgba(30,70,160,0.4)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-soft">{regionLabels[event.region]}</span>
          <span className={`rounded-full border px-2 py-0.5 text-xs ${impactColors[event.impact]}`}>
            {event.impact}
          </span>
        </div>
        <h3 className="font-medium text-ink">{event.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{teaser}</p>
      </article>
    );
  }

  return (
    <article className="glass rounded-[22px] shadow-[0_16px_34px_-22px_rgba(30,70,160,0.4)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full rounded-[22px] p-4 text-left"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-soft">{regionLabels[event.region]}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${impactColors[event.impact]}`}
            >
              {event.impact}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-violet">
            {open ? "Close" : "More"}
          </span>
        </div>
        <h3 className="font-medium text-ink">{event.title}</h3>
        <p className={`mt-2 text-sm leading-relaxed text-ink-soft ${open ? "" : "line-clamp-2"}`}>
          {teaser}
        </p>
        {open && extra ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{extra}</p>
        ) : null}
        {open && (event.source || event.tickers?.length) ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {event.source ? (
              <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet">
                {event.source}
              </span>
            ) : null}
            {event.tickers?.map((ticker) => (
              <span
                key={`${index}-${ticker}`}
                className="rounded-full bg-violet/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet"
              >
                {ticker}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-[11px] font-medium text-violet">
          {open ? "Tap to collapse" : "Tap for more detail"}
        </p>
      </button>
    </article>
  );
}

export function MarketEvents({ events }: { events: MarketEvent[] }) {
  const { era } = useSiteEra();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const slots = [0, 1, 2, 3].map((index) => events[index] ?? EMPTY_EVENT);
  const articleSheet = showTvm10Labs();
  const expandable = !articleSheet && era.features.eventExpand;
  const openEvent =
    articleSheet && openIndex != null && slots[openIndex]?.date
      ? slots[openIndex]
      : null;

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-6">
      <h2 className="font-display text-2xl text-ink">
        <BogenHeading id="market-events">Market-Moving Events</BogenHeading>
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Headlines from this session&apos;s snapshot
        {articleSheet
          ? ". Tap a card to open the article."
          : expandable
            ? ". Tap a card to read more, tap again to fold it back."
            : "."}
      </p>
      <div className="mt-6 grid gap-3">
        {slots.map((event, index) => (
          <EventCard
            key={`${event.title}-${index}`}
            event={event}
            index={index}
            open={!articleSheet && openIndex === index}
            expandable={expandable}
            articleSheet={articleSheet}
            onToggle={() =>
              setOpenIndex((current) => (current === index ? null : index))
            }
          />
        ))}
      </div>
      {openEvent ? (
        <EventSheet event={openEvent} onClose={() => setOpenIndex(null)} />
      ) : null}
    </div>
  );
}
