"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DailySnapshot, ScreenedStock, StrategyId } from "@/types";
import { AdvancedPredictions } from "@/components/AdvancedPredictions";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { BogenHeading } from "@/components/BogenProvider";
import { NewBadge } from "@/components/NewBadge";
import { BogenTerms } from "@/components/BogenTerms";
import { showUltraDesk } from "@/lib/beta-labs";
import { authedFetch } from "@/lib/authed-fetch";
import { parseTicker } from "@/lib/ticker";
import { ProGlowText } from "@/components/ProGlowText";
import {
  applyDeskTape,
  defaultDesk,
  hydrateDesk,
  recipeToFilters,
  type DeskNote,
  type DeskRecipe,
  type DeskState,
} from "@/lib/ultra-desk";

const STRATEGIES: Array<{ id: StrategyId; label: string }> = [
  { id: "dip_no_fundamental", label: "Dip" },
  { id: "oversold_technical", label: "Oversold" },
  { id: "volume_momentum", label: "Volume" },
  { id: "support_bounce", label: "Support" },
  { id: "relative_strength", label: "RS" },
  { id: "catalyst_upside", label: "Catalyst" },
  { id: "gap_fill", label: "Gap" },
  { id: "short_squeeze", label: "Squeeze" },
];

type QuoteCard = {
  symbol: string;
  name?: string;
  price: number;
  changePercent: number;
  compositeScore?: number;
};

function deskKey(uid: string) {
  return `tvm-ultra-desk:${uid}`;
}

function heatColor(change: number) {
  if (change >= 3) return "bg-emerald-500/80 text-white";
  if (change >= 0.5) return "bg-emerald-500/30 text-ink";
  if (change <= -3) return "bg-coral/80 text-white";
  if (change <= -0.5) return "bg-coral/30 text-ink";
  return "bg-ink/[0.06] text-ink-soft";
}

function newNoteId() {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function WorkstationClient({ snapshot }: { snapshot: DailySnapshot }) {
  const { user, entitlement, watchlist } = useAuth();
  const router = useRouter();
  const [desk, setDesk] = useState<DeskState>(defaultDesk);
  const [help, setHelp] = useState(false);
  const [noteSymbol, setNoteSymbol] = useState(watchlist.symbols[0] || "");
  const [tapeSymbol, setTapeSymbol] = useState(watchlist.symbols[0] || "");
  const [noteTag, setNoteTag] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [recipeDraft, setRecipeDraft] = useState("");
  const [liveQuotes, setLiveQuotes] = useState<Record<string, QuoteCard>>({});
  const [quotesReady, setQuotesReady] = useState(true);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = window.localStorage.getItem(deskKey(user.uid));
      if (raw) setDesk(hydrateDesk(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, [user]);

  const persist = useCallback(
    (updater: (current: DeskState) => DeskState) => {
      setDesk((current) => {
        const next = updater(current);
        if (user) {
          try {
            window.localStorage.setItem(deskKey(user.uid), JSON.stringify(next));
          } catch {
            /* private mode */
          }
        }
        document.documentElement.dataset.desk = next.compact ? "terminal" : "";
        return next;
      });
    },
    [user],
  );

  useEffect(() => {
    document.documentElement.dataset.desk = desk.compact ? "terminal" : "";
  }, [desk.compact]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!showUltraDesk(entitlement.plan)) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setHelp((open) => !open);
      }
      if (event.key === "g") {
        const go = (path: string) => router.push(path);
        const once = (next: KeyboardEvent) => {
          if (next.key === "d") go("/dashboard");
          if (next.key === "w") go("/dashboard/workstation");
          if (next.key === "p") go("/dashboard/portfolio");
          window.removeEventListener("keydown", once);
        };
        window.addEventListener("keydown", once, { once: true });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entitlement.plan, router]);

  const cells = useMemo(
    () =>
      applyDeskTape(
        snapshot.screenedStocks,
        desk.filters,
        desk.weights,
        watchlist.symbols,
      ).slice(0, 80),
    [desk.filters, desk.weights, snapshot.screenedStocks, watchlist.symbols],
  );

  const compareKey = desk.compare.join(",");

  useEffect(() => {
    if (!compareKey) {
      setQuotesReady(true);
      return;
    }
    setQuotesReady(false);
    const params = compareKey;
    let cancelled = false;
    void authedFetch(`/api/yahoo/quotes?symbols=${encodeURIComponent(params)}`)
      .then((response) => response.json())
      .then((payload: { quotes?: QuoteCard[] }) => {
        if (cancelled || !payload.quotes) return;
        setLiveQuotes((current) => {
          const next = { ...current };
          for (const quote of payload.quotes || []) {
            next[quote.symbol] = quote;
          }
          return next;
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setQuotesReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [compareKey]);

  const compared = desk.compare
    .map((symbol) => {
      const row = snapshot.screenedStocks.find((stock) => stock.symbol === symbol);
      const quote = liveQuotes[symbol];
      if (row) {
        return quote
          ? {
              ...row,
              price: quote.price || row.price,
              changePercent: quote.changePercent ?? row.changePercent,
            }
          : row;
      }
      if (!quote) {
        return {
          symbol,
          name: symbol,
          sector: "",
          industry: "",
          price: 0,
          changePercent: 0,
          volume: 0,
          compositeScore: 0,
          shortTermScore: 0,
          longTermScore: 0,
          fundamentals: {
            peRatio: null,
            beta: null,
            eps: null,
            marketCap: null,
            avgVolume: null,
            shortInterestPct: null,
          },
        } satisfies ScreenedStock;
      }
      return {
        symbol: quote.symbol,
        name: quote.name || quote.symbol,
        sector: "",
        industry: "",
        price: quote.price,
        changePercent: quote.changePercent,
        volume: 0,
        compositeScore: quote.compositeScore ?? 0,
        shortTermScore: 0,
        longTermScore: 0,
        fundamentals: {
          peRatio: null,
          beta: null,
          eps: null,
          marketCap: null,
          avgVolume: null,
          shortInterestPct: null,
        },
      } satisfies ScreenedStock;
    })
    .filter((row): row is ScreenedStock => Boolean(row));

  if (!showUltraDesk(entitlement.plan)) {
    return (
      <div className="glass-strong max-w-lg rounded-[24px] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet">
          <ProGlowText>Ultra</ProGlowText>
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink">
          Workstation
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          <ProGlowText>
            Heatmap, compare, weights, tags, notes, recipes, and keyboard live on
            Ultra in TVM 1.0.
          </ProGlowText>
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-violet">
          Back to dashboard
        </Link>
      </div>
    );
  }

  function addNote() {
    const symbol = parseTicker(noteSymbol);
    const body = noteBody.trim();
    if (!symbol || body.length < 2) return;
    const note: DeskNote = {
      id: newNoteId(),
      symbol,
      tag: noteTag.trim(),
      body,
    };
    persist((current) => ({ ...current, notes: [note, ...current.notes] }));
    setNoteBody("");
    setNoteTag("");
  }

  function saveRecipe() {
    const name = recipeDraft.trim();
    if (!name) return;
    const recipe: DeskRecipe = {
      id: `custom-${Date.now()}`,
      name,
      watchlistOnly: desk.filters.watchlistOnly,
      minScore: desk.filters.minScore,
      maxMove: desk.filters.maxMove,
      sort: desk.filters.sort,
    };
    persist((current) => ({
      ...current,
      recipes: [...current.recipes, recipe],
      filters: { ...current.filters, activeRecipeId: recipe.id },
    }));
    setRecipeDraft("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            <ProGlowText>Ultra workstation</ProGlowText>
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 font-display text-3xl font-bold text-ink">
            <BogenHeading id="workstation">Your tape</BogenHeading>
            <NewBadge feature="workstation" />
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {cells.length} names after filters · session {snapshot.date}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={desk.compact}
            onChange={(event) =>
              persist((current) => ({ ...current, compact: event.target.checked }))
            }
          />
          Compact terminal
        </label>
      </div>

      <section className="glass-strong rounded-[24px] p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          <BogenHeading id="workstation-filters">Filters</BogenHeading>
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-ink-soft">
            Min composite {desk.filters.minScore}
            <input
              type="range"
              min={0}
              max={90}
              step={1}
              value={desk.filters.minScore}
              onChange={(event) =>
                persist((current) => ({
                  ...current,
                  filters: {
                    ...current.filters,
                    minScore: Number(event.target.value),
                    activeRecipeId: null,
                  },
                }))
              }
              className="mt-1 w-full"
            />
          </label>
          <label className="text-sm text-ink-soft">
            Quiet move ≤ {desk.filters.maxMove || "any"}%
            <input
              type="range"
              min={0}
              max={8}
              step={0.5}
              value={desk.filters.maxMove}
              onChange={(event) =>
                persist((current) => ({
                  ...current,
                  filters: {
                    ...current.filters,
                    maxMove: Number(event.target.value),
                    activeRecipeId: null,
                  },
                }))
              }
              className="mt-1 w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={desk.filters.watchlistOnly}
              onChange={(event) =>
                persist((current) => ({
                  ...current,
                  filters: {
                    ...current.filters,
                    watchlistOnly: event.target.checked,
                    activeRecipeId: null,
                  },
                }))
              }
            />
            Watchlist only
          </label>
          <label className="text-sm text-ink-soft">
            Sort
            <select
              className="field mt-1 w-full rounded-2xl px-3 py-2 text-sm text-ink"
              value={desk.filters.sort}
              onChange={(event) =>
                persist((current) => ({
                  ...current,
                  filters: {
                    ...current.filters,
                    sort: event.target.value as DeskState["filters"]["sort"],
                    activeRecipeId: null,
                  },
                }))
              }
            >
              <option value="score">Score</option>
              <option value="change">Biggest move</option>
              <option value="volume">Volume</option>
            </select>
          </label>
        </div>
      </section>

      <section className="glass-strong rounded-[24px] p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Heatmap</h2>
        {cells.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            No names match these filters. Lower min score or turn off Watchlist only.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-8">
            {cells.map((stock) => (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => {
                  setNoteSymbol(stock.symbol);
                  setTapeSymbol(stock.symbol);
                }}
                className={`rounded-lg px-1 py-2 text-center ${heatColor(stock.changePercent)}`}
                title={`${stock.symbol} ${stock.changePercent.toFixed(2)}%`}
              >
                <p className="text-[10px] font-bold">{stock.symbol}</p>
                <p className="text-[10px]">{stock.changePercent.toFixed(1)}%</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {user && showUltraDesk(entitlement.plan) ? (
        <AdvancedPredictions
          uid={user.uid}
          symbol={tapeSymbol || noteSymbol || watchlist.symbols[0] || ""}
          onSymbol={(next) => {
            setTapeSymbol(next);
            setNoteSymbol(next);
          }}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-strong rounded-[24px] p-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            <BogenHeading id="workstation-compare">Compare</BogenHeading>
          </h2>
          <input
            className="field mt-3 w-full rounded-2xl px-4 py-2.5 text-sm"
            placeholder="Add ticker, Enter"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const symbol = parseTicker(event.currentTarget.value);
              if (!symbol) return;
              persist((current) => ({
                ...current,
                compare: Array.from(new Set([...current.compare, symbol])).slice(0, 4),
              }));
              event.currentTarget.value = "";
            }}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {compared.map((stock) => (
              <article key={stock.symbol} className="glass rounded-2xl p-3">
                <p className="font-semibold text-ink">{stock.symbol}</p>
                <p className="text-xs text-ink-soft">{stock.name}</p>
                <p className="mt-1 font-display text-lg font-bold text-ink">
                  {stock.price
                    ? `$${stock.price.toFixed(2)} · ${stock.changePercent.toFixed(2)}%`
                    : quotesReady
                      ? "No live quote"
                      : "Quote loading…"}
                </p>
                {stock.compositeScore ? (
                  <p className="text-xs text-ink-soft">
                    Composite {stock.compositeScore.toFixed(0)}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold text-coral"
                  onClick={() =>
                    persist((current) => ({
                      ...current,
                      compare: current.compare.filter((row) => row !== stock.symbol),
                    }))
                  }
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-strong rounded-[24px] p-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            Signal weights
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            These re-rank the heatmap: short-term signals vs long-term vs volume.
          </p>
          <div className="mt-3 space-y-2">
            {STRATEGIES.map((strategy) => (
              <label key={strategy.id} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-ink-soft">{strategy.label}</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={desk.weights[strategy.id]}
                  onChange={(event) =>
                    persist((current) => ({
                      ...current,
                      weights: {
                        ...current.weights,
                        [strategy.id]: Number(event.target.value),
                      },
                    }))
                  }
                  className="flex-1"
                />
                <span className="w-8 text-right font-semibold text-ink">
                  {desk.weights[strategy.id].toFixed(1)}
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-strong rounded-[24px] p-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            <BogenHeading id="workstation-notes">Tags & notes</BogenHeading>
          </h2>
          <input
            className="field mt-3 w-full rounded-2xl px-4 py-2.5 text-sm"
            value={noteSymbol}
            onChange={(event) => setNoteSymbol(event.target.value.toUpperCase())}
            placeholder="Ticker"
          />
          <input
            className="field mt-2 w-full rounded-2xl px-4 py-2.5 text-sm"
            value={noteTag}
            onChange={(event) => setNoteTag(event.target.value)}
            placeholder="Tag (earnings, hold, trim…)"
          />
          <textarea
            className="field mt-2 min-h-24 w-full rounded-2xl px-4 py-2.5 text-sm"
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            placeholder="Private note"
          />
          <button
            type="button"
            onClick={addNote}
            className="glass-violet mt-3 rounded-full px-4 py-2 text-sm font-semibold text-white"
          >
            Add note
          </button>
          <ul className="mt-3 space-y-2">
            {desk.notes.map((note) => (
              <li key={note.id} className="glass rounded-2xl px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink">
                    {note.symbol}
                    {note.tag ? (
                      <span className="ml-2 font-normal text-ink-soft">{note.tag}</span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-coral"
                    onClick={() =>
                      persist((current) => ({
                        ...current,
                        notes: current.notes.filter((row) => row.id !== note.id),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
                <p className="mt-1 text-ink-soft">{note.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-strong rounded-[24px] p-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            <BogenHeading id="workstation-recipes">Recipes</BogenHeading>
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            <BogenTerms text="Tap High score quiet names for strong composites that barely moved, or Watchlist only to hide everything else. Save stores the filters you have set." />
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveRecipe();
            }}
          >
            <input
              className="field flex-1 rounded-2xl px-4 py-2.5 text-sm"
              value={recipeDraft}
              onChange={(event) => setRecipeDraft(event.target.value)}
              placeholder="Name for the current filters"
            />
            <button type="submit" className="glass-violet rounded-full px-4 py-2 text-sm font-semibold text-white">
              Save
            </button>
          </form>
          <ul className="mt-3 space-y-2">
            {desk.recipes.map((recipe) => {
              const active = desk.filters.activeRecipeId === recipe.id;
              return (
                <li key={recipe.id} className="glass flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm">
                  <button
                    type="button"
                    className={`text-left font-semibold ${active ? "text-violet" : "text-ink"}`}
                    onClick={() =>
                      persist((current) => ({
                        ...current,
                        filters: recipeToFilters(recipe),
                      }))
                    }
                  >
                    {recipe.name}
                    {active ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-violet">
                        on
                      </span>
                    ) : null}
                  </button>
                  {recipe.builtin ? null : (
                    <button
                      type="button"
                      className="text-xs font-semibold text-coral"
                      onClick={() =>
                        persist((current) => ({
                          ...current,
                          recipes: current.recipes.filter((row) => row.id !== recipe.id),
                          filters:
                            current.filters.activeRecipeId === recipe.id
                              ? { ...current.filters, activeRecipeId: null }
                              : current.filters,
                        }))
                      }
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-ink-soft">
            Keyboard: <kbd>?</kbd> help · <kbd>g</kbd> then <kbd>d</kbd> dashboard ·{" "}
            <kbd>g</kbd> then <kbd>w</kbd> workstation · <kbd>g</kbd> then <kbd>p</kbd>{" "}
            portfolio
          </p>
        </section>
      </div>

      {help ? (
        <div className="glass-strong rounded-[24px] p-5 text-sm text-ink-soft">
          <ProGlowText>
            Ultra shortcuts stay on this desk. Press ? again to hide.
          </ProGlowText>
        </div>
      ) : null}
    </div>
  );
}
