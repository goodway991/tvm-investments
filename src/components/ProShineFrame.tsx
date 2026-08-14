"use client";

import { useId, type ReactNode } from "react";

export function ProShineFrame({
  children,
  className = "",
  round = "card",
}: {
  children: ReactNode;
  className?: string;
  round?: "card" | "pill";
}) {
  const uid = useId().replace(/:/g, "");
  const rx = round === "pill" ? 999 : 16;

  return (
    <div className={`relative ${className}`}>
      {children}
      <svg className="pro-shine-svg" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="42%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="62%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <rect className="pro-shine-outer" x="0" y="0" width="100%" height="100%" rx={rx} pathLength={100} />
        <rect className="pro-shine-inner" x="0.75" y="0.75" width="calc(100% - 1.5px)" height="calc(100% - 1.5px)" rx={rx} pathLength={100} />
        <rect
          className="pro-shine-tail"
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx={rx}
          pathLength={100}
        />
        <rect
          className="pro-shine-head"
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx={rx}
          pathLength={100}
          stroke={`url(#${uid}-g)`}
        />
      </svg>
    </div>
  );
}
