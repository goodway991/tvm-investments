"use client";

import { HorizonSuiteClient, type HorizonQuote } from "@/components/HorizonSuiteClient";
import { TestingSuiteLock } from "@/components/TestingSuiteLock";
import { useAuth } from "@/components/AuthProvider";
import { canUsePreviewFeature } from "@/lib/plans";
import { BogenHeading } from "@/components/BogenProvider";

export function HorizonGate({ quotes }: { quotes: HorizonQuote[] }) {
  const { entitlement } = useAuth();
  if (!canUsePreviewFeature(entitlement.role, "horizonSuite")) {
    return (
      <div className="dashboard-research">
        <div className="glass-strong max-w-xl rounded-[24px] p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            Coming soon
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">
            <BogenHeading id="horizon">Horizon Suite</BogenHeading>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Horizon Suite is still being built.
          </p>
          <div className="mt-5 max-w-xs">
            <TestingSuiteLock />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-research">
      <HorizonSuiteClient quotes={quotes} />
    </div>
  );
}
