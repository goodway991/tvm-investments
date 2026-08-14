"use client";

import { useState } from "react";
import type { MarketEvent } from "@/types";
import { BogenHeading } from "@/components/BogenProvider";

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
    .replace(/\s{2,}/g, " ")
    .trim();
}

function EventCard({
  event,
  index,
  open,
  onToggle,
}: {
  event: MarketEvent;
  index: number;
  open: boolean;
  onToggle: () => void;
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
      {open && event.url ? (
        <div className="px-4 pb-4">
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-violet hover:underline"
          >
            Open headline
          </a>
        </div>
      ) : null}
    </article>
  );
}

export function MarketEvents({ events }: { events: MarketEvent[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const slots = [0, 1, 2, 3].map((index) => events[index] ?? EMPTY_EVENT);

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-6">
      <h2 className="font-display text-2xl text-ink">
        <BogenHeading id="market-events">Market-Moving Events</BogenHeading>
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Headlines from this session&apos;s snapshot. Tap a card to read more, tap again to fold it back.
      </p>
      <div className="mt-6 grid gap-3">
        {slots.map((event, index) => (
          <EventCard
            key={`${event.title}-${index}`}
            event={event}
            index={index}
            open={openIndex === index}
            onToggle={() =>
              setOpenIndex((current) => (current === index ? null : index))
            }
          />
        ))}
      </div>
    </div>
  );
}
