import type { ScreenedStock, StrategyId } from "@/types";

export type DeskNote = {
  id: string;
  symbol: string;
  tag: string;
  body: string;
};

export type DeskRecipe = {
  id: string;
  name: string;
  builtin?: boolean;
  watchlistOnly: boolean;
  minScore: number;
  maxMove: number;
  sort: "score" | "change" | "volume";
};

export type DeskFilters = {
  watchlistOnly: boolean;
  minScore: number;
  maxMove: number;
  sort: DeskRecipe["sort"];
  activeRecipeId: string | null;
};

export type DeskState = {
  weights: Record<StrategyId, number>;
  notes: DeskNote[];
  recipes: DeskRecipe[];
  compare: string[];
  compact: boolean;
  filters: DeskFilters;
};

export const SHORT_WEIGHTS: StrategyId[] = [
  "dip_no_fundamental",
  "oversold_technical",
  "support_bounce",
  "gap_fill",
  "short_squeeze",
];

export const TAPE_WEIGHTS: StrategyId[] = ["volume_momentum"];

export const LONG_WEIGHTS: StrategyId[] = [
  "relative_strength",
  "catalyst_upside",
];

export const BUILTIN_RECIPES: DeskRecipe[] = [
  {
    id: "quiet-score",
    name: "High score quiet names",
    builtin: true,
    watchlistOnly: false,
    minScore: 72,
    maxMove: 1.5,
    sort: "score",
  },
  {
    id: "watchlist-only",
    name: "Watchlist only",
    builtin: true,
    watchlistOnly: true,
    minScore: 0,
    maxMove: 0,
    sort: "score",
  },
];

export function defaultWeights(): Record<StrategyId, number> {
  return {
    dip_no_fundamental: 1,
    oversold_technical: 1,
    volume_momentum: 1,
    support_bounce: 1,
    relative_strength: 1,
    catalyst_upside: 1,
    gap_fill: 1,
    short_squeeze: 1,
  };
}

export function defaultDesk(): DeskState {
  return {
    weights: defaultWeights(),
    notes: [],
    recipes: BUILTIN_RECIPES,
    compare: [],
    compact: false,
    filters: {
      watchlistOnly: false,
      minScore: 0,
      maxMove: 0,
      sort: "score",
      activeRecipeId: null,
    },
  };
}

function mean(ids: StrategyId[], weights: Record<StrategyId, number>) {
  const values = ids.map((id) => Number(weights[id] ?? 1));
  if (!values.length) return 1;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function rankScore(
  stock: ScreenedStock,
  weights: Record<StrategyId, number>,
) {
  const shortW = mean(SHORT_WEIGHTS, weights);
  const longW = mean(LONG_WEIGHTS, weights);
  const tapeW = mean(TAPE_WEIGHTS, weights);
  return (
    stock.compositeScore * (0.35 + 0.15 * tapeW) +
    (stock.shortTermScore ?? stock.compositeScore) * 0.25 * shortW +
    (stock.longTermScore ?? stock.compositeScore) * 0.25 * longW
  );
}

export function applyDeskTape(
  stocks: ScreenedStock[],
  filters: DeskFilters,
  weights: Record<StrategyId, number>,
  watchlist: string[],
) {
  const watch = new Set(watchlist);
  const filtered = stocks.filter((stock) => {
    if (filters.watchlistOnly && !watch.has(stock.symbol)) return false;
    if (stock.compositeScore < filters.minScore) return false;
    if (filters.maxMove > 0 && Math.abs(stock.changePercent) > filters.maxMove) {
      return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((left, right) => {
    if (filters.sort === "change") {
      return Math.abs(right.changePercent) - Math.abs(left.changePercent);
    }
    if (filters.sort === "volume") return right.volume - left.volume;
    return rankScore(right, weights) - rankScore(left, weights);
  });
  return sorted;
}

export function recipeToFilters(recipe: DeskRecipe): DeskFilters {
  return {
    watchlistOnly: recipe.watchlistOnly,
    minScore: recipe.minScore,
    maxMove: recipe.maxMove,
    sort: recipe.sort,
    activeRecipeId: recipe.id,
  };
}

function parseSavedRecipe(recipe: unknown): DeskRecipe | null {
  if (typeof recipe === "string") {
    if (BUILTIN_RECIPES.some((row) => row.name === recipe)) return null;
    return {
      id: `custom-${recipe}`,
      name: recipe,
      builtin: false,
      watchlistOnly: false,
      minScore: 0,
      maxMove: 0,
      sort: "score",
    };
  }
  if (!recipe || typeof recipe !== "object") return null;
  const row = recipe as Partial<DeskRecipe>;
  if (!row.name) return null;
  if (BUILTIN_RECIPES.some((item) => item.id === row.id)) return null;
  return {
    id: String(row.id || `custom-${row.name}`),
    name: String(row.name),
    builtin: false,
    watchlistOnly: Boolean(row.watchlistOnly),
    minScore: Number(row.minScore) || 0,
    maxMove: Number(row.maxMove) || 0,
    sort: row.sort === "change" || row.sort === "volume" ? row.sort : "score",
  };
}

export function hydrateDesk(raw: unknown): DeskState {
  const base = defaultDesk();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<DeskState> & {
    tags?: Record<string, string>;
    notes?: unknown;
    recipes?: unknown;
  };
  const notes: DeskNote[] = Array.isArray(data.notes)
    ? data.notes
        .map((note) => {
          if (!note || typeof note !== "object") return null;
          const row = note as DeskNote;
          if (!row.symbol || !row.body) return null;
          return {
            id: String(row.id || `${row.symbol}-${row.body.slice(0, 8)}`),
            symbol: String(row.symbol).toUpperCase(),
            tag: String(row.tag || ""),
            body: String(row.body || ""),
          };
        })
        .filter((note): note is DeskNote => Boolean(note))
    : Object.entries(data.tags || {}).length && !Array.isArray(data.notes)
      ? []
      : [];

  const extras: DeskRecipe[] = [];
  if (Array.isArray(data.recipes)) {
    for (const recipe of data.recipes) {
      const next = parseSavedRecipe(recipe);
      if (next) extras.push(next);
    }
  }
  const recipes: DeskRecipe[] = [...BUILTIN_RECIPES, ...extras];

  const seen = new Set<string>();
  const uniqueRecipes = recipes.filter((recipe) => {
    if (seen.has(recipe.id)) return false;
    seen.add(recipe.id);
    return true;
  });

  return {
    weights: { ...base.weights, ...(data.weights || {}) },
    notes,
    recipes: uniqueRecipes,
    compare: Array.isArray(data.compare)
      ? data.compare.map(String).map((symbol) => symbol.toUpperCase())
      : [],
    compact: Boolean(data.compact),
    filters: {
      ...base.filters,
      ...(data.filters || {}),
      sort:
        data.filters?.sort === "change" || data.filters?.sort === "volume"
          ? data.filters.sort
          : data.filters?.sort === "score"
            ? "score"
            : base.filters.sort,
    },
  };
}
