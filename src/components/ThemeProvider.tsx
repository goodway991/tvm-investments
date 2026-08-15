"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useSiteEra } from "@/components/SiteEraProvider";

export type Appearance = "light" | "dark" | "system";

const STORAGE_KEY = "tvm-appearance";

type ThemeContextValue = {
  appearance: Appearance;
  resolved: "light" | "dark";
  setAppearance: (value: Appearance) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredAppearance(): Appearance {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light" || stored === "system") return stored;
  return "dark";
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveAppearance(appearance: Appearance): "light" | "dark" {
  if (appearance === "system") return systemPrefersDark() ? "dark" : "light";
  return appearance;
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { era, rewind } = useSiteEra();
  const [appearance, setAppearanceState] = useState<Appearance>("dark");
  const [ready, setReady] = useState(false);
  const lockLight = rewind && !era.features.darkMode;

  useEffect(() => {
    const stored = readStoredAppearance();
    setAppearanceState(stored);
    applyTheme(lockLight ? "light" : resolveAppearance(stored));
    setReady(true);
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-animated");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lockLight]);

  useEffect(() => {
    if (!ready) return;
    applyTheme(lockLight ? "light" : resolveAppearance(appearance));
  }, [appearance, lockLight, ready]);

  useEffect(() => {
    if (appearance !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (lockLight) return;
      applyTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance, lockLight]);

  const resolved = lockLight
    ? "light"
    : appearance === "dark" || (appearance === "system" && ready && systemPrefersDark())
      ? "dark"
      : "light";

  const setAppearance = useCallback((value: Appearance) => {
    setAppearanceState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  }, []);

  return (
    <ThemeContext.Provider value={{ appearance, resolved, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}
