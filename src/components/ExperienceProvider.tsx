"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSiteEra } from "@/components/SiteEraProvider";
import { showBeta3Labs } from "@/lib/beta-labs";
import { LEGACY_CUSTOMIZE_KEY } from "@/lib/customize-prompt";

export type Density = "clean" | "normal";

const DENSITY_KEY = "tvm-density";
const CUSTOMIZE_KEY = LEGACY_CUSTOMIZE_KEY;
export const LOCAL_EXPERIMENT = "TVM 1.0 · local";

type ExperienceContextValue = {
  density: Density;
  setDensity: (value: Density) => void;
  customizeOpen: boolean;
  customizeSeen: boolean;
  openCustomize: () => void;
  finishCustomize: () => void;
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function readDensity(): Density {
  try {
    return window.localStorage.getItem(DENSITY_KEY) === "clean" ? "clean" : "normal";
  } catch {
    return "normal";
  }
}

function readCustomizeSeen() {
  try {
    return window.localStorage.getItem(CUSTOMIZE_KEY) === "1";
  } catch {
    return false;
  }
}

function applyDensity(density: Density) {
  document.documentElement.dataset.density = density;
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const { rewind } = useSiteEra();
  const [densityState, setDensityState] = useState<Density>("normal");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeSeen, setCustomizeSeen] = useState(true);
  const density: Density =
    rewind || !showBeta3Labs() ? "normal" : densityState;

  useEffect(() => {
    const next = readDensity();
    setDensityState(next);
    setCustomizeSeen(readCustomizeSeen());
  }, []);

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  const setDensity = useCallback((value: Density) => {
    if (!showBeta3Labs()) return;
    setDensityState(value);
    try {
      window.localStorage.setItem(DENSITY_KEY, value);
    } catch {
      /* private mode */
    }
  }, []);

  const openCustomize = useCallback(() => {
    setCustomizeOpen(true);
  }, []);

  const finishCustomize = useCallback(() => {
    setCustomizeOpen(false);
    setCustomizeSeen(true);
    try {
      window.localStorage.setItem(CUSTOMIZE_KEY, "1");
    } catch {
      /* private mode */
    }
  }, []);

  const value = useMemo(
    () => ({
      density,
      setDensity,
      customizeOpen,
      customizeSeen,
      openCustomize,
      finishCustomize,
    }),
    [customizeOpen, customizeSeen, density, finishCustomize, openCustomize, setDensity],
  );

  return (
    <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>
  );
}

export function useExperience() {
  const value = useContext(ExperienceContext);
  if (!value) {
    throw new Error("useExperience must be used within ExperienceProvider");
  }
  return value;
}
