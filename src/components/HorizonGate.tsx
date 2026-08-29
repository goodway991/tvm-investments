"use client";

import { HorizonSuiteClient, type HorizonQuote } from "@/components/HorizonSuiteClient";
import { PaidDeskUpgrade } from "@/components/PaidDeskUpgrade";
import { useAuth } from "@/components/AuthProvider";
import { planHasPro } from "@/lib/plans";

export function HorizonGate({ quotes }: { quotes: HorizonQuote[] }) {
  const { entitlement } = useAuth();
  if (!planHasPro(entitlement.plan)) {
    return <PaidDeskUpgrade title="Horizon Suite" bogenId="horizon" />;
  }

  return (
    <div className="dashboard-research">
      <HorizonSuiteClient quotes={quotes} />
    </div>
  );
}
