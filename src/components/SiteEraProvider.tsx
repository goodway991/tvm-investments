"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { eraForDate, LIVE_ERA, type SiteEra } from "@/lib/site-era";

type SiteEraContextValue = {
  era: SiteEra;
  rewind: boolean;
  archiveDate: string | null;
};

const SiteEraContext = createContext<SiteEraContextValue>({
  era: LIVE_ERA,
  rewind: false,
  archiveDate: null,
});

export function SiteEraProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const archiveDate = searchParams.get("archive");
  const rewind = Boolean(archiveDate);
  const era = useMemo(() => eraForDate(rewind ? archiveDate : null), [archiveDate, rewind]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.siteEra = rewind ? era.id : "live";
    root.classList.toggle("archive-rewind", rewind);
    return () => {
      root.dataset.siteEra = "live";
      root.classList.remove("archive-rewind");
    };
  }, [era.id, rewind]);

  const value = useMemo(
    () => ({ era, rewind, archiveDate }),
    [archiveDate, era, rewind],
  );

  return <SiteEraContext.Provider value={value}>{children}</SiteEraContext.Provider>;
}

export function useSiteEra() {
  return useContext(SiteEraContext);
}
