"use client";

import { BogenTerms } from "@/components/BogenTerms";
import { formatMorningPct, type MorningBrief } from "@/lib/morning-brief";

const impactClass = {
  bullish: "text-gain",
  bearish: "text-loss",
  mixed: "text-amber-600",
};

export function MorningBriefView({
  brief,
  failed,
}: {
  brief: MorningBrief | null;
  failed: boolean;
}) {
  if (failed && !brief) {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        The last session didn’t load. Daily Brief on the desk has the same tape,
        headlines, and sector notes.
      </p>
    );
  }
  if (!brief) {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        Loading the last session’s tape, headlines, and trends…
      </p>
    );
  }

  const { tape, events, trends, analysis, picks, today = [] } = brief;
  const hasTape = tape.leader || tape.scanned > 0;
  const empty =
    !hasTape &&
    events.length === 0 &&
    trends.length === 0 &&
    !analysis &&
    picks.length === 0 &&
    today.length === 0;

  if (empty) {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        That session’s brief isn’t on the desk yet. Open Daily Brief after the
        snapshot lands.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        {brief.eyebrow} · {brief.sessionLabel}
      </p>

      {hasTape ? (
        <section>
          <h3 className="font-display text-sm font-bold text-ink">Market behavior</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {tape.scanned
              ? `${tape.scanned.toLocaleString()} names in the last scan. `
              : ""}
            {tape.gainers || tape.losers
              ? `${tape.gainers} advancers, ${tape.losers} decliners in the mover list.`
              : null}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {tape.leader ? (
              <div className="rounded-2xl border border-ink/[0.08] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Leader
                </p>
                <p className="mt-0.5 font-display text-sm font-bold text-ink">
                  {tape.leader.symbol}
                  <span className="ml-2 text-gain">{formatMorningPct(tape.leader.changePercent)}</span>
                </p>
                <p className="text-xs text-ink-soft">{tape.leader.name}</p>
              </div>
            ) : null}
            {tape.laggard ? (
              <div className="rounded-2xl border border-ink/[0.08] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  Laggard
                </p>
                <p className="mt-0.5 font-display text-sm font-bold text-ink">
                  {tape.laggard.symbol}
                  <span className="ml-2 text-loss">{formatMorningPct(tape.laggard.changePercent)}</span>
                </p>
                <p className="text-xs text-ink-soft">{tape.laggard.name}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {events.length ? (
        <section>
          <h3 className="font-display text-sm font-bold text-ink">Important events</h3>
          <ul className="mt-2 space-y-2.5">
            {events.map((event) => (
              <li key={event.title}>
                <p className="text-sm font-semibold text-ink">
                  <span className={`mr-2 text-[10px] font-bold uppercase ${impactClass[event.impact]}`}>
                    {event.impact}
                  </span>
                  <BogenTerms text={event.title} />
                </p>
                {event.summary ? (
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                    <BogenTerms text={event.summary} />
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {trends.length || analysis ? (
        <section>
          <h3 className="font-display text-sm font-bold text-ink">Trends</h3>
          {analysis ? (
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              <BogenTerms text={analysis} />
            </p>
          ) : null}
          {trends.length ? (
            <ul className="mt-2 space-y-2">
              {trends.map((trend) => (
                <li key={trend.title}>
                  <p className="text-sm font-semibold text-ink">
                    {trend.sector ? `${trend.sector}: ` : ""}
                    {trend.title}
                  </p>
                  {trend.blurb ? (
                    <p className="text-sm leading-relaxed text-ink-soft">
                      <BogenTerms text={trend.blurb} />
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {picks.length ? (
        <section>
          <h3 className="font-display text-sm font-bold text-ink">Flagged from that session</h3>
          <ul className="mt-2 space-y-1.5">
            {picks.map((pick) => (
              <li key={pick.symbol} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-ink">
                  {pick.symbol}
                  <span className="ml-2 font-normal text-ink-soft">{pick.name}</span>
                </span>
                <span
                  className={pick.changePercent >= 0 ? "text-gain" : "text-loss"}
                >
                  {formatMorningPct(pick.changePercent)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {today.length ? (
        <section>
          <h3 className="font-display text-sm font-bold text-ink">
            Predictions for today
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Short-term names the screen is watching into this session.
          </p>
          <ul className="mt-2 space-y-1.5">
            {today.map((pick) => (
              <li key={pick.symbol} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-ink">
                  {pick.symbol}
                  <span className="ml-2 font-normal text-ink-soft">{pick.name}</span>
                </span>
                <span
                  className={pick.changePercent >= 0 ? "text-gain" : "text-loss"}
                >
                  {formatMorningPct(pick.changePercent)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
