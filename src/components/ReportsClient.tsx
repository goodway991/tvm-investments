"use client";

import { BacktestTrackRecord } from "@/components/BacktestTrackRecord";
import { PaywallLock } from "@/components/PaywallLock";
import { TopPicks } from "@/components/TopPicks";
import { useAuth } from "@/components/AuthProvider";
import type { DailySnapshot } from "@/types";

export function ReportsClient({ snapshot }: { snapshot: DailySnapshot }) {
  const { entitlement } = useAuth();
  const isPro = entitlement.plan === "pro";

  return (
    <div className="dashboard-research space-y-8">
      <TopPicks
        picks={snapshot.topPicks}
        reports={snapshot.reports}
        isPro={isPro}
        sessionDate={snapshot.date}
      />

      {isPro ? (
        <>
          <TopPicks
            compact
            isPro
            picks={snapshot.shortTermPicks}
            reports={snapshot.shortTermReports}
            sessionDate={snapshot.date}
            title="Best short-term setups"
            subtitle="Pro list ranked by short-term weights: dips, oversold RSI, volume, and support."
          />
          <TopPicks
            compact
            isPro
            picks={snapshot.longTermPicks}
            reports={snapshot.longTermReports}
            sessionDate={snapshot.date}
            title="Best long-term setups"
            subtitle="Pro list ranked by long-term weights: relative strength, catalysts, and fundamentals."
          />
        </>
      ) : (
        <section>
          <h2 className="font-display text-2xl text-ink">
            Separate short-term and long-term lists
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Pro splits the screen into two ranked lists with scores and outlook notes.
          </p>
          <div className="mt-4">
            <PaywallLock locked intensity="soft" cta="Upgrade to Pro">
              <HorizonListsPreview />
            </PaywallLock>
          </div>
        </section>
      )}

      <BacktestTrackRecord />
    </div>
  );
}

function PreviewPick({
  rank,
  name,
  symbol,
  st,
  lt,
  change,
  note,
}: {
  rank: number;
  name: string;
  symbol: string;
  st: string;
  lt: string;
  change: string;
  note: string;
}) {
  return (
    <article className="rounded-2xl border border-ink/[0.06] bg-white/70 p-4">
      <p className="text-xs font-medium text-violet">Pick #{rank}</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg text-ink">
            {name} <span className="text-ink-soft">({symbol})</span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">{note}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-ink-soft">
          <p>ST {st}</p>
          <p>LT {lt}</p>
          <p className="font-semibold text-ink">{change}</p>
        </div>
      </div>
    </article>
  );
}

function HorizonListsPreview() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-xl text-ink">Best short-term setups</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Ranked by dips, oversold RSI, volume, and support.
        </p>
        <div className="mt-4 space-y-3">
          <PreviewPick
            rank={1}
            name="Example Corp"
            symbol="EXC"
            st="82"
            lt="61"
            change="-3.4%"
            note="Last close and RSI flag an oversold bounce setup after a sector-wide drop."
          />
          <PreviewPick
            rank={2}
            name="Sample Works"
            symbol="SMW"
            st="76"
            lt="58"
            change="-2.1%"
            note="Volume confirmation vs the 3-month average with no company-specific headline."
          />
          <PreviewPick
            rank={3}
            name="Demo Systems"
            symbol="DMS"
            st="71"
            lt="64"
            change="+1.8%"
            note="Relative strength held up while the group sold off."
          />
        </div>
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-xl text-ink">Best long-term setups</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Ranked by relative strength, catalysts, and fundamentals.
        </p>
        <div className="mt-4 space-y-3">
          <PreviewPick
            rank={1}
            name="Horizon Group"
            symbol="HRZ"
            st="54"
            lt="84"
            change="+0.6%"
            note="Trailing P/E and 12-month return screen as a longer holding candidate."
          />
          <PreviewPick
            rank={2}
            name="Northline Inc"
            symbol="NLI"
            st="49"
            lt="79"
            change="-0.9%"
            note="52-week range and earnings trend support the long-horizon composite."
          />
          <PreviewPick
            rank={3}
            name="Cedar Path"
            symbol="CDP"
            st="57"
            lt="73"
            change="+1.2%"
            note="Company profile plus catalyst headlines keep it on the long list."
          />
        </div>
      </div>
    </div>
  );
}
