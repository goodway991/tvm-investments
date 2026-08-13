"use client";

import { useState } from "react";
import type { SectorDive } from "@/types";
import { PaywallLock } from "@/components/PaywallLock";
import { FREE_SECTOR_DIVE_LIMIT } from "@/lib/plans";

function DiveBody({ body }: { body: string }) {
  const paragraphs = body.split("\n\n");
  return (
    <div className="prose-tvm space-y-4 text-sm">
      {paragraphs.map((paragraph, index) => {
        if (paragraph.startsWith("**") && paragraph.includes(":**")) {
          const [title, ...rest] = paragraph.split(":**");
          return (
            <div key={index}>
              <h3 className="font-medium text-ink">{title.replace(/\*\*/g, "")}</h3>
              <p className="mt-1 text-ink-soft">{rest.join(":**")}</p>
            </div>
          );
        }
        return (
          <p key={index} className="whitespace-pre-line text-ink-soft">
            {paragraph.replace(/\*\*/g, "")}
          </p>
        );
      })}
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
    <div className="glass flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">{current.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{current.subtitle}</p>
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
                  : "text-ink hover:bg-violet/10 hover:text-violet"
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
                  : "text-ink hover:bg-violet/10 hover:text-violet"
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
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-ink-soft">
            {index + 1} / {deck.length}
          </p>
        </div>
      </div>

      <div className="relative mt-5 min-h-[280px] flex-1 overflow-hidden rounded-2xl">
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
