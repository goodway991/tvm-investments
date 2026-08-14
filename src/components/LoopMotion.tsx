"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MotionPauseRoot() {
  useEffect(() => {
    const sync = () => {
      document.documentElement.classList.toggle("motion-paused", document.hidden);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return null;
}

export function LoopMotion({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        el.classList.toggle("is-paused", !entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`loop-motion ${className}`}>
      {children}
    </div>
  );
}
