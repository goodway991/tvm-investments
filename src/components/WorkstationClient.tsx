"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DailySnapshot, ScreenedStock, StrategyId } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { showUltraDesk } from "@/lib/beta-labs";

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

type DeskState = {
  weights: Record<StrategyId, number>;
  tags: Record<string, string>;
  notes: Record<string, string>;
  recipes: string[];
  compare: string[];
  compact: boolean;
};

function deskKey(uid: string) {
  return `tvm-ultra-desk:${uid}`;
}

function defaultDesk(): DeskState {
  return {
    weights: {
      dip_no_fundamental: 1,
      oversold_technical: 1,
      volume_momentum: 1,
      support_bounce: 1,
      relative_strength: 1,
      catalyst_upside: 1,
      gap_fill: 1,
      short_squeeze: 1,
    },
    tags: {},
    notes: {},
    recipes: ["High score quiet names", "Watchlist only"],
    compare: [],
    compact: false,
  };
}

function heatColor(change: number) {
  if (change >= 3) return "bg-emerald-500/80 text-white";
  if (change >= 0.5) return "bg-emerald-500/30 text-ink";
  if (change <= -3) return "bg-coral/80 text-white";
  if (change <= -0.5) return "bg-coral/30 text-ink";
  return "bg-ink/[0.06] text-ink-soft";
}

export function WorkstationClient({ snapshot }: { snapshot: DailySnapshot }) {
  const { user, entitlement, watchlist } = useAuth();
  const router = useRouter();
  const [desk, setDesk] = useState<DeskState>(defaultDesk);
  const [help, setHelp] = useState(false);
  const [noteSymbol, setNoteSymbol] = useState(watchlist.symbols[0] || "");
  const [recipeDraft, setRecipeDraft] = useState("");

  useEffect(() => {
    if (!user) return;
    try {
      const raw = window.localStorage.getItem(deskKey(user.uid));
      if (raw) setDesk({ ...defaultDesk(), ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, [user]);

  const persist = useCallback(
    (next: DeskState) => {
      setDesk(next);
      if (!user) return;
      try {
        window.localStorage.setItem(deskKey(user.uid), JSON.stringify(next));
      } catch {
        /* private mode */
      }
      document.documentElement.dataset.desk = next.compact ? "terminal" : "";
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

  const cells = useMemo(() => {
    const rows = snapshot.screenedStocks.slice(0, 80);
    return rows;
  }, [snapshot.screenedStocks]);

  const compared = desk.compare
    .map((symbol) =>
      snapshot.screenedStocks.find((row) => row.symbol === symbol),
    )
    .filter((row): row is ScreenedStock => Boolean(row));

  if (!showUltraDesk(entitlement.plan)) {
    return (
      <div className="glass-strong max-w-lg rounded-[24px] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet">
          Ultra
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink">
          Workstation
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Heatmap, compare, weights, tags, notes, recipes, and keyboard live on
          Ultra in TVM 1.0.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-violet">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            Ultra workstation
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">
            Your tape
          </h1>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={desk.compact}
            onChange={(event) =>
              persist({ ...desk, compact: event.target.checked })
            }
          />
          Compact terminal
        </label>
      </div>

      <section className="glass-strong rounded-[24px] p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Heatmap</h2>
        <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-8">
          {cells.map((stock) => (
            <button
              key={stock.symbol}
              type="button"
              onClick={() => setNoteSymbol(stock.symbol)}
              className={`rounded-lg px-1 py-2 text-center ${heatColor(stock.changePercent)}`}
              title={`${stock.symbol} ${stock.changePercent.toFixed(2)}%`}
            >
              <p className="text-[10px] font-bold">{stock.symbol}</p>
              <p className="text-[10px]">{stock.changePercent.toFixed(1)}%</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-strong rounded-[24px] p-5">
          <h2 className="font-display text-lg font-semibold text-ink">Compare</h2>
          <input
            className="field mt-3 w-full rounded-2xl px-4 py-2.5 text-sm"
            placeholder="Add ticker, Enter"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const symbol = event.currentTarget.value.trim().toUpperCase();
              if (!symbol) return;
              persist({
                ...desk,
                compare: Array.from(new Set([...desk.compare, symbol])).slice(0, 4),
              });
              event.currentTarget.value = "";
            }}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {compared.map((stock) => (
              <article key={stock.symbol} className="glass rounded-2xl p-3">
                <p className="font-semibold text-ink">{stock.symbol}</p>
                <p className="text-xs text-ink-soft">{stock.name}</p>
                <p className="mt-1 font-display text-lg font-bold text-ink">
                  {stock.compositeScore.toFixed(0)} · {stock.changePercent.toFixed(2)}%
                </p>
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold text-coral"
                  onClick={() =>
                    persist({
                      ...desk,
                      compare: desk.compare.filter((row) => row !== stock.symbol),
                    })
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
                    persist({
                      ...desk,
                      weights: {
                        ...desk.weights,
                        [strategy.id]: Number(event.target.value),
                      },
                    })
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
            Tags & notes
          </h2>
          <input
            className="field mt-3 w-full rounded-2xl px-4 py-2.5 text-sm"
            value={noteSymbol}
            onChange={(event) => setNoteSymbol(event.target.value.toUpperCase())}
            placeholder="Ticker"
          />
          <input
            className="field mt-2 w-full rounded-2xl px-4 py-2.5 text-sm"
            value={desk.tags[noteSymbol] || ""}
            onChange={(event) =>
              persist({
                ...desk,
                tags: { ...desk.tags, [noteSymbol]: event.target.value },
              })
            }
            placeholder="Tag (earnings, hold, trim…)"
          />
          <textarea
            className="field mt-2 min-h-24 w-full rounded-2xl px-4 py-2.5 text-sm"
            value={desk.notes[noteSymbol] || ""}
            onChange={(event) =>
              persist({
                ...desk,
                notes: { ...desk.notes, [noteSymbol]: event.target.value },
              })
            }
            placeholder="Private note"
          />
        </section>

        <section className="glass-strong rounded-[24px] p-5">
          <h2 className="font-display text-lg font-semibold text-ink">Recipes</h2>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = recipeDraft.trim();
              if (!name) return;
              persist({ ...desk, recipes: [...desk.recipes, name] });
              setRecipeDraft("");
            }}
          >
            <input
              className="field flex-1 rounded-2xl px-4 py-2.5 text-sm"
              value={recipeDraft}
              onChange={(event) => setRecipeDraft(event.target.value)}
              placeholder="Named screener recipe"
            />
            <button type="submit" className="glass-violet rounded-full px-4 py-2 text-sm font-semibold text-white">
              Save
            </button>
          </form>
          <ul className="mt-3 space-y-2">
            {desk.recipes.map((recipe) => (
              <li key={recipe} className="glass flex items-center justify-between rounded-2xl px-3 py-2 text-sm">
                <span className="text-ink">{recipe}</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-coral"
                  onClick={() =>
                    persist({
                      ...desk,
                      recipes: desk.recipes.filter((row) => row !== recipe),
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
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
          Ultra shortcuts stay on this desk. Press ? again to hide.
        </div>
      ) : null}
    </div>
  );
}
