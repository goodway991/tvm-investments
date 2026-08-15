"use client";

import { MarketEvents } from "@/components/MarketEvents";
import { TechSector } from "@/components/TechSector";
import { useAuth } from "@/components/AuthProvider";
import { BogenHeading } from "@/components/BogenProvider";
import { formatSessionLabel } from "@/lib/archive-window";
import type { DailySnapshot } from "@/types";

export function DailyBrief({ snapshot }: { snapshot: DailySnapshot }) {
  const { entitlement } = useAuth();
  const isPro = entitlement.plan === "pro";
  const sessionLabel = formatSessionLabel(snapshot.date);

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
        <MarketEvents events={snapshot.marketEvents} />
        <TechSector
          dives={snapshot.sectorDives}
          analysis={snapshot.techSectorAnalysis}
          isPro={isPro}
        />
      </div>
    </div>
  );
}
