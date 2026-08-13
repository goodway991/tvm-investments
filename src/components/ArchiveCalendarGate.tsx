"use client";

import { ArchiveCalendar } from "@/components/ArchiveCalendar";
import { ArchiveCalendarLock } from "@/components/TestingSuiteLock";
import { useAuth } from "@/components/AuthProvider";
import { canUsePreviewFeature } from "@/lib/plans";

export function ArchiveCalendarGate() {
  const { entitlement } = useAuth();
  if (!canUsePreviewFeature(entitlement.role, "archiveCalendar")) {
    return (
      <div className="dashboard-research">
        <div className="glass-strong mx-auto max-w-4xl rounded-[28px] p-6 text-center sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            Coming soon
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">
            Archive Calendar
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Archive Calendar is still being built.
          </p>
          <div className="mx-auto mt-5 max-w-xs">
            <ArchiveCalendarLock />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-research">
      <div className="glass-strong mx-auto max-w-4xl rounded-[32px] p-6 text-center sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet">
          Research rewind
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">
          Archive Calendar
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
