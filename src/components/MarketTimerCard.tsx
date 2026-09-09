"use client";

import { useEffect, useState } from "react";
import { BogenTip } from "@/components/BogenProvider";
import {
  formatCountdownHms,
  getMarketCountdown,
} from "@/lib/market-calendar";

export function MarketTimerCard() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const countdown = getMarketCountdown(new Date(now));
  const label =
    countdown.phase === "opens" ? "Market opens in" : "Market closes in";
  const badge = countdown.phase === "opens" ? "pre-market" : "session";

  return (
    <article className="relative rounded-[22px] p-5 text-left glass-strong">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-soft">{label}</span>
        <span className="text-[11px] font-semibold text-emerald-600">{badge}</span>
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums tracking-tight text-ink">
        {formatCountdownHms(countdown.remainingSec)}
      </div>
      <p className="mt-1 text-[11px] text-ink-soft">US cash hours · 9:30–4:00 ET</p>
      <BogenTip id="market-timer" tone="ink" className="absolute right-3 top-3" />
    </article>
  );
}
