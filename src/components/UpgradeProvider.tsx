"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { UpgradeModal } from "@/components/UpgradeModal";
import type { PaidPlanId } from "@/lib/plans";

interface UpgradeContextValue {
  openUpgrade: (plan?: PaidPlanId) => void;
}

const UpgradeContext = createContext<UpgradeContextValue>({
  openUpgrade: () => {},
});

export function useUpgrade() {
  return useContext(UpgradeContext);
}

function paidPlan(value: unknown): PaidPlanId | undefined {
  return value === "pro" || value === "ultra" ? value : undefined;
}

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialPlan, setInitialPlan] = useState<PaidPlanId | undefined>();
  const openUpgrade = useCallback((plan?: PaidPlanId) => {
    setInitialPlan(paidPlan(plan));
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      {open ? (
        <UpgradeModal
          onClose={() => setOpen(false)}
          initialPlan={initialPlan}
        />
      ) : null}
    </UpgradeContext.Provider>
  );
}
