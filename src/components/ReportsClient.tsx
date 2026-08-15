"use client";

import { BacktestTrackRecord } from "@/components/BacktestTrackRecord";
import { PaywallLock } from "@/components/PaywallLock";
import { TopPicks } from "@/components/TopPicks";
import { useAuth } from "@/components/AuthProvider";
import { BogenHeading } from "@/components/BogenProvider";
import { ProGlowText } from "@/components/ProGlowText";
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
          <h2 className="font-display text-2xl font-bold text-ink">
            <BogenHeading id="reports-horizon">
              Separate short-term and long-term lists
            </BogenHeading>
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            <ProGlowText>
              Pro splits the screen into two ranked lists with scores and outlook notes.
            </ProGlowText>
          </p>
          <div className="mt-4">
            <PaywallLock locked intensity="soft" cta="Upgrade to Pro">
              <HorizonListsPreview />
            </PaywallLock>
          </div>
        </section>
      )}

      {isPro ? (
        <BacktestTrackRecord />
      ) : (
        <section>
          <h2 className="font-display text-2xl font-bold text-ink">Full backtest track record</h2>
          <p className="mt-1 text-sm text-ink-soft">
            <ProGlowText>
              Pro shows logged pick returns versus the S&P 500 across this desk.
            </ProGlowText>
          </p>
          <div className="mt-4">
            <PaywallLock locked intensity="soft" cta="Upgrade to Pro">
              <div className="glass rounded-2xl p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {["1-Day Avg Return", "1-Week Avg Return", "1-Month Avg Return"].map(
                    (label) => (
                      <div key={label} className="rounded-2xl bg-surface p-4">
                        <p className="text-xs text-ink-soft">{label}</p>
                        <p className="mt-1 font-display text-2xl font-bold text-ink">—</p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </PaywallLock>
          </div>
        </section>
      )}
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
    <article className="glass rounded-[22px] p-4 shadow-[0_16px_34px_-22px_rgba(30,70,160,0.4)]">
      <p className="glass inline-flex rounded-2xl px-3 py-1.5 font-display text-sm font-bold text-violet shadow-[0_12px_24px_-18px_rgba(30,70,160,0.35)]">
        Pick {rank}
      </p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold text-ink">{name}</p>
          <p className="mt-0.5 font-display text-sm font-bold text-violet">{symbol}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{note}</p>
        </div>
        <div className="glass shrink-0 rounded-2xl px-3 py-2 text-right">
          <p className="font-display text-xs font-bold text-ink">ST {st}</p>
          <p className="font-display text-xs font-bold text-ink">LT {lt}</p>
          <p className="mt-1 font-display text-sm font-bold text-violet">{change}</p>
        </div>
      </div>
    </article>
  );
}

function HorizonListsPreview() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="glass-strong rounded-[24px] p-5">
        <h3 className="font-display text-xl font-bold text-ink">Best short-term setups</h3>
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
      <div className="glass-strong rounded-[24px] p-5">
        <h3 className="font-display text-xl font-bold text-ink">Best long-term setups</h3>
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
