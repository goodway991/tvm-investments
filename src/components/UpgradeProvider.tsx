"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { UpgradeModal } from "@/components/UpgradeModal";

interface UpgradeContextValue {
  openUpgrade: () => void;
}

const UpgradeContext = createContext<UpgradeContextValue>({
  openUpgrade: () => {},
});

export function useUpgrade() {
  return useContext(UpgradeContext);
}

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openUpgrade = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      {open ? <UpgradeModal onClose={() => setOpen(false)} /> : null}
    </UpgradeContext.Provider>
  );
}
