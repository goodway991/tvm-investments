export const PLAN_PRICES = {
  monthly: { perMonth: 8, billed: 8, periodLabel: "billed monthly" },
  yearly: { perMonth: 5, billed: 60, periodLabel: "billed $60 yearly" },
} as const;

export type BillingInterval = keyof typeof PLAN_PRICES;

export function yearlySavingsPercent() {
  const monthlyAnnual = PLAN_PRICES.monthly.perMonth * 12;
  return Math.round((1 - PLAN_PRICES.yearly.billed / monthlyAnnual) * 100);
}

export const FREE_SECTOR_DIVE_LIMIT = 2;
export const FREE_MOVER_LIMIT = 10;
export const PRO_MOVER_LIMIT = 20;
export const FREE_ARCHIVE_LOOKBACK_DAYS = 3;
export const ARCHIVE_KEEP_DAYS = 60;

/** Flip these to true when a coming-soon feature ships for everyone. */
export const PREVIEW_UNLOCK = {
  archiveCalendar: false,
  horizonSuite: false,
  portfolio: false,
} as const;

export type PreviewFeature = keyof typeof PREVIEW_UNLOCK;

export function canUsePreviewFeature(
  role: "client" | "admin",
  feature: PreviewFeature,
) {
  return role === "admin" || PREVIEW_UNLOCK[feature];
}

export const PLAN_FEATURES: Array<{
  name: string;
  free: boolean;
  pro: boolean;
}> = [
  { name: "8-signal screener", free: true, pro: true },
  { name: "Top 10 daily movers", free: true, pro: true },
  { name: "Top 20 daily movers", free: false, pro: true },
  { name: "Archive Calendar", free: false, pro: true },
  { name: "Flagged-pick research reports", free: true, pro: true },
  { name: "Short-term and long-term scores on each pick", free: true, pro: true },
  { name: "Two sector deep dives", free: true, pro: true },
  { name: "Full sector deep-dive deck", free: false, pro: true },
  { name: "Ticker news on watched names", free: true, pro: true },
  { name: "Portfolio tracker and scenario calculator", free: true, pro: true },
  { name: "Portfolio book review", free: false, pro: true },
  { name: "Short-term path prediction", free: false, pro: true },
  { name: "Horizon Suite (coming soon)", free: false, pro: true },
  { name: "Watchlist of 10 symbols", free: true, pro: true },
  { name: "Watchlist of 100 symbols", free: false, pro: true },
  { name: "Edit watchlist anytime (no 7-day lock)", free: false, pro: true },
  { name: "Separate short-term and long-term pick lists", free: false, pro: true },
  { name: "Gemini culture and long-term write-up", free: false, pro: true },
  { name: "Live weekday news-scored snapshot", free: false, pro: true },
  { name: "Full backtest track record", free: false, pro: true },
];
