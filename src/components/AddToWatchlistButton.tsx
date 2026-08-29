"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { parseTicker } from "@/lib/ticker";

export function AddToWatchlistButton({ symbol }: { symbol: string }) {
  const { watchlist, updateWatchlist, entitlement } = useAuth();
  const ticker = parseTicker(symbol) || symbol.toUpperCase();
  const watching = watchlist.symbols.includes(ticker);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (watching || busy) return;
    setError("");
    setBusy(true);
    try {
      await updateWatchlist([...watchlist.symbols, ticker]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add that name.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-[14rem] flex-col items-end">
      <button
        type="button"
        onClick={() => void add()}
        disabled={watching || busy}
        className="inline-flex shrink-0 items-center rounded-full px-3 py-2 text-sm font-semibold text-violet hover:bg-violet/10 disabled:cursor-default disabled:text-ink-soft"
      >
        {watching ? "On watchlist" : busy ? "Adding…" : "Add to watchlist"}
      </button>
      {error ? (
        <p className="mt-1 text-right text-[11px] leading-snug text-coral">{error}</p>
      ) : !watching ? (
        <p className="mt-0.5 text-[10px] text-ink-soft">
          {entitlement.plan === "free"
            ? `Free keeps ${entitlement.watchlistLimit}`
            : `${entitlement.watchlistLimit} slot cap`}
        </p>
      ) : null}
    </div>
  );
}
