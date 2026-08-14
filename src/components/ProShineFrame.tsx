"use client";

import type { ReactNode } from "react";

export function ProShineFrame({
  children,
  className = "",
  round = "card",
}: {
  children: ReactNode;
  className?: string;
  round?: "card" | "pill";
}) {
  return (
    <div
      className={`loop-motion pro-border-shine relative ${
        round === "pill" ? "rounded-full" : "rounded-2xl"
      } ${className}`}
    >
      {children}
    </div>
  );
}
