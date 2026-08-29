"use client";

import { ArchiveCalendar } from "@/components/ArchiveCalendar";
import { useAuth } from "@/components/AuthProvider";
import { BogenHeading } from "@/components/BogenProvider";

export function ArchiveCalendarGate() {
  const { entitlement } = useAuth();
  if (entitlement.role !== "admin") {
    return (
      <div className="dashboard-research">
        <div className="glass-strong max-w-xl rounded-[24px] p-6">
          <h1 className="font-display text-3xl font-bold text-ink">
            Page not available
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Archive Calendar is not part of the live desk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-research">
      <div className="glass-strong mx-auto max-w-4xl rounded-[32px] p-6 text-center sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet">
          Admin
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">
          <BogenHeading id="archive">Archive Calendar</BogenHeading>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Pick a stored research day. Movers, screener, reports, and the brief
          rewind to that snapshot. Watchlist and portfolio stay live.
        </p>
        <div className="mt-8 rounded-[24px] border border-ink/[0.08] bg-white px-3 py-5 sm:px-6 sm:py-6">
          <ArchiveCalendar />
        </div>
      </div>
    </div>
  );
}
