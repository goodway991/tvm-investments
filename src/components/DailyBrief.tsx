"use client";

import { useMemo, useState } from "react";
import { MarketEvents } from "@/components/MarketEvents";
import { TechSector } from "@/components/TechSector";
import { useAuth } from "@/components/AuthProvider";
import { BogenHeading } from "@/components/BogenProvider";
import {
  StockDetailModal,
  screenedToCandidate,
} from "@/components/StockDetailModal";
import { useSiteEra } from "@/components/SiteEraProvider";
import { formatSessionLabel } from "@/lib/archive-window";
import { planHasPro } from "@/lib/plans";
import type { DailySnapshot, StockCandidate } from "@/types";

function candidateFromSnapshot(
  snapshot: DailySnapshot,
  symbol: string,
): StockCandidate {
  const pick = snapshot.topPicks.find((row) => row.symbol === symbol);
  if (pick) return pick;
  const mover = snapshot.topMovers.find((row) => row.symbol === symbol);
  if (mover) return mover;
  const screened = snapshot.screenedStocks.find((row) => row.symbol === symbol);
  if (screened) return screenedToCandidate(screened);
  return screenedToCandidate({
    symbol,
    name: symbol,
    sector: "",
    industry: "",
    price: 0,
    changePercent: 0,
    volume: 0,
    compositeScore: 0,
    shortTermScore: 0,
    longTermScore: 0,
    fundamentals: {
      peRatio: null,
      beta: null,
      eps: null,
      marketCap: null,
      avgVolume: null,
      shortInterestPct: null,
    },
  });
}

export function DailyBrief({ snapshot }: { snapshot: DailySnapshot }) {
  const { entitlement } = useAuth();
  const { rewind, archiveDate } = useSiteEra();
  const isPro = planHasPro(entitlement.plan);
  const sessionLabel = formatSessionLabel(snapshot.date);
  const [openSymbol, setOpenSymbol] = useState<string | null>(null);
  const selected = useMemo(
    () => (openSymbol ? candidateFromSnapshot(snapshot, openSymbol) : null),
    [openSymbol, snapshot],
  );

  return (
    <div className="dashboard-research space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet">
          Session · {sessionLabel}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink">
          <BogenHeading id="brief">Daily Brief</BogenHeading>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Headlines and sector notes from this session
          {snapshot.scanUniverse.combined
            ? ` — about ${snapshot.scanUniverse.combined.toLocaleString()} screened names`
            : ""}
          .
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <MarketEvents events={snapshot.marketEvents} onOpenSymbol={setOpenSymbol} />
        <TechSector
          dives={snapshot.sectorDives}
          analysis={snapshot.techSectorAnalysis}
          isPro={isPro}
          onOpenSymbol={setOpenSymbol}
        />
      </div>
      {selected ? (
        <StockDetailModal
          stock={selected}
          sessionDate={rewind ? archiveDate ?? snapshot.date : undefined}
          onClose={() => setOpenSymbol(null)}
        />
      ) : null}
    </div>
  );
}
