"use client";

import Link from "next/link";

interface HeaderProps {
  dataMode: "demo" | "live";
  date: string;
}

export function Header({ dataMode, date }: HeaderProps) {
  return (
    <header className="border-b border-white/10 bg-tvm-navy/80 backdrop-blur sticky top-[var(--site-notice,0px)] z-50">
      <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-tvm-gold tracking-tight">
            TVM Investments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            End-of-day research snapshot · {date || "Today"}
            {dataMode === "demo" && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                Demo data — add API keys for live
              </span>
            )}
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["Movers", "#movers"],
            ["Events", "#events"],
            ["Top Picks", "#picks"],
            ["Filter", "#filter"],
            ["Calculator", "#calculator"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-slate-300 hover:text-tvm-gold transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
