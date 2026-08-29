"use client";

import { useEffect, useMemo, useState } from "react";
import { OverlaySheet } from "@/components/OverlaySheet";
import { MorningBriefView } from "@/components/MorningBriefView";
import { TVMIcon } from "@/components/TVMBrand";
import { BogenHeading } from "@/components/BogenProvider";
import { authedFetch } from "@/lib/authed-fetch";
import { formatSessionLabel } from "@/lib/archive-window";
import type { MorningBrief } from "@/lib/morning-brief";

export function MorningBriefArchive() {
  const [dates, setDates] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void authedFetch("/api/snapshot/dates")
      .then((response) => response.json())
      .then((payload: { dates?: string[] }) => {
        if (cancelled) return;
        const next = (payload.dates ?? [])
          .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
          .sort()
          .reverse();
        setDates(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return dates;
    return dates.filter((date) => {
      const label = formatSessionLabel(date).toLowerCase();
      return date.includes(needle) || label.includes(needle);
    });
  }, [dates, query]);

  useEffect(() => {
    if (!selected) return;
    const date = selected;
    const controller = new AbortController();
    let cancelled = false;
    setBrief(null);
    setFailed(false);

    async function load() {
      try {
        const response = await authedFetch(
          `/api/morning-brief?date=${encodeURIComponent(date)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("brief");
        const payload = (await response.json()) as MorningBrief;
        if (cancelled) return;
        setBrief(payload);
      } catch (error: unknown) {
        if (cancelled) return;
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return;
        }
        setFailed(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selected]);

  return (
    <>
      <section className="glass-strong rounded-[24px] p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          <BogenHeading id="morning-brief-archive">Morning Brief Archive</BogenHeading>
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          Past Ultra 6:00am recaps. Latest sessions sit at the top. Search a date,
          then select it.
        </p>
        <input
          className="field mt-3 w-full rounded-2xl px-4 py-2.5 text-sm"
          placeholder="Search a date, e.g. 2026-08-28"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-3 max-h-56 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="px-1 py-3 text-sm text-ink-soft">
              {dates.length === 0 ? "Loading sessions…" : "No dates match that search."}
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((date) => (
                <li key={date}>
                  <button
                    type="button"
                    onClick={() => setSelected(date)}
                    className="flex w-full items-baseline justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm hover:bg-ink/[0.04]"
                  >
                    <span className="font-semibold text-ink">{date}</span>
                    <span className="text-xs text-ink-soft">{formatSessionLabel(date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {selected ? (
        <OverlaySheet
          labelledBy="morning-brief-archive-title"
          onClose={() => {
            setSelected(null);
            setBrief(null);
            setFailed(false);
          }}
          variant="card"
          zIndexClass="z-[107]"
          header={
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  Morning Brief Archive
                </p>
                <h2
                  id="morning-brief-archive-title"
                  className="mt-2 font-display text-3xl font-bold text-ink"
                >
                  {formatSessionLabel(selected)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setBrief(null);
                  setFailed(false);
                }}
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
                onClick={() => {
                  setSelected(null);
                  setBrief(null);
                  setFailed(false);
                }}
                className="glass-violet rounded-full px-6 py-3 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          }
        >
          <MorningBriefView brief={brief} failed={failed} />
        </OverlaySheet>
      ) : null}
    </>
  );
}
