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
import { createPortal } from "react-dom";
import { BOGEN_TIPS, type BogenId } from "@/lib/bogen";

const STORAGE_KEY = "tvm-bogen-mode";

type BogenContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  openTip: (id: BogenId) => void;
  closeTip: () => void;
  activeId: BogenId | null;
};

const BogenContext = createContext<BogenContextValue | null>(null);

export function BogenProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [activeId, setActiveId] = useState<BogenId | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setEnabledState(window.localStorage.getItem(STORAGE_KEY) === "on");
    } catch {
      /* private mode */
    }
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    if (!value) setActiveId(null);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
    } catch {
      /* private mode */
    }
  }, []);

  const openTip = useCallback((id: BogenId) => {
    setActiveId(id);
  }, []);

  const closeTip = useCallback(() => {
    setActiveId(null);
  }, []);

  const value = useMemo(
    () => ({ enabled, setEnabled, openTip, closeTip, activeId }),
    [activeId, closeTip, enabled, openTip, setEnabled],
  );

  const tip = activeId ? BOGEN_TIPS[activeId] : null;

  useEffect(() => {
    if (!activeId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeTip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, closeTip]);

  return (
    <BogenContext.Provider value={value}>
      {children}
      {mounted && tip
        ? createPortal(
            <div className="fixed inset-0 z-[116] grid place-items-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
                aria-label="Close explanation"
                onClick={closeTip}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="bogen-tip-title"
                className="glass-strong relative z-10 w-full max-w-md rounded-[28px] p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-violet">
                  Bogen mode
                </p>
                <h2
                  id="bogen-tip-title"
                  className="mt-2 font-display text-2xl font-bold text-ink"
                >
                  {tip.title}
                </h2>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ink-soft">
                  What it is
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{tip.what}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ink-soft">
                  How to use it
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{tip.how}</p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={closeTip}
                    className="glass-violet rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>,
            document.documentElement,
          )
        : null}
    </BogenContext.Provider>
  );
}

export function useBogen() {
  const value = useContext(BogenContext);
  if (!value) {
    throw new Error("useBogen must be used within BogenProvider");
  }
  return value;
}

export function BogenTip({
  id,
  className = "",
  tone = "ink",
}: {
  id: BogenId;
  className?: string;
  tone?: "ink" | "onDark";
}) {
  const { enabled, openTip } = useBogen();
  if (!enabled) return null;
  const copy = BOGEN_TIPS[id];
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openTip(id);
      }}
      className={`bogen-tip ${tone === "onDark" ? "bogen-tip-on-dark" : ""} ${className}`}
      aria-label={`What is ${copy.title}?`}
      title={`What is ${copy.title}?`}
    >
      ?
    </button>
  );
}

export function BogenHeading({
  id,
  children,
  className = "",
  tone = "ink",
}: {
  id: BogenId;
  children: ReactNode;
  className?: string;
  tone?: "ink" | "onDark";
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {children}
      <BogenTip id={id} tone={tone} />
    </span>
  );
}
