"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { OverlaySheet } from "@/components/OverlaySheet";
import { PlanComparisonTable } from "@/components/PlanComparisonTable";
import { useTour } from "@/components/TourProvider";
import { useSiteEra } from "@/components/SiteEraProvider";

export function GiftedProModal() {
  const { giftPending, acknowledgeGift } = useAuth();
  const { isOpen: tourOpen } = useTour();
  const { rewind } = useSiteEra();
  const [busy, setBusy] = useState(false);

  if (!giftPending || tourOpen || rewind) return null;

  async function continueOn() {
    if (busy) return;
    setBusy(true);
    try {
      await acknowledgeGift();
    } finally {
      setBusy(false);
    }
  }

  return (
    <OverlaySheet
      labelledBy="gifted-pro-title"
      onClose={() => void continueOn()}
      closeOnBackdrop={false}
      variant="card"
      zIndexClass="z-[110]"
      header={
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            Complimentary Pro
          </p>
          <h2
            id="gifted-pro-title"
            className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl"
          >
            You have been gifted Pro by ADMIN!
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            Your account now includes the full Pro desk. Here is what that
            unlocks:
          </p>
        </div>
      }
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void continueOn()}
            disabled={busy}
            className="glass-violet rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Okay, continue!"}
          </button>
        </div>
      }
    >
      <PlanComparisonTable currentPlan="pro" />
    </OverlaySheet>
  );
}
