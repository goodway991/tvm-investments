"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Changes when you open a page so chart draw animations play again. */
export function useChartDrawKey(seed = "") {
  const pathname = usePathname();
  const [visit, setVisit] = useState(0);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setVisit((n) => n + 1);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return `${pathname}:${seed}:${visit}`;
}
