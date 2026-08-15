import { showBeta3Labs } from "@/lib/beta-labs";

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

export type PlanId = "free" | "pro" | "ultra";

export const FREE_WATCHLIST_LIMIT = 10;
export const PRO_WATCHLIST_LIMIT = 100;
export const ULTRA_WATCHLIST_LIMIT = 500;
export const PRO_WEEKLY_PORTFOLIO_REVIEW_LIMIT = 5;
export const PRO_WEEKLY_HORIZON_PREDICT_LIMIT = 5;

export function watchlistLimitForPlan(plan: PlanId) {
  if (plan === "ultra") return ULTRA_WATCHLIST_LIMIT;
  if (plan === "pro") return PRO_WATCHLIST_LIMIT;
  return FREE_WATCHLIST_LIMIT;
}

export function planHasPro(plan: PlanId) {
  return plan === "pro" || plan === "ultra";
}

export function overlayLabsPlan(
  role: "client" | "admin",
  stored: string | undefined,
): PlanId {
  const base: PlanId = stored === "pro" || stored === "ultra" ? stored : "free";
  if (!showBeta3Labs()) return base === "ultra" ? "pro" : base;
  if (role === "admin") return "ultra";
  return base === "ultra" ? "pro" : base;
}

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
  ultra?: boolean;
  labsOnly?: boolean;
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
  { name: "Portfolio (under construction)", free: true, pro: true },
  { name: "Portfolio book review", free: false, pro: true },
  {
    name: "5 portfolio reviews & prediction scores / week",
    free: false,
    pro: true,
    ultra: true,
    labsOnly: true,
  },
  {
    name: "Unlimited portfolio reviews & prediction scores",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
  },
  { name: "Short-term path prediction", free: false, pro: true },
  { name: "Horizon Suite (coming soon)", free: false, pro: true },
  {
    name: "5 Horizon Suite predictions / week",
    free: false,
    pro: true,
    ultra: true,
    labsOnly: true,
  },
  {
    name: "Unlimited Horizon Suite predictions",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
  },
  { name: "Watchlist of 10 symbols", free: true, pro: true },
  { name: "Watchlist of 100 symbols", free: false, pro: true },
  {
    name: "Watchlist of 500 symbols",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
  },
  { name: "Edit watchlist anytime (no 7-day lock)", free: false, pro: true },
  { name: "Separate short-term and long-term pick lists", free: false, pro: true },
  { name: "Gemini culture and long-term write-up", free: false, pro: true },
  { name: "Live weekday news-scored snapshot", free: false, pro: true },
  { name: "Full backtest track record", free: false, pro: true },
  {
    name: "99%* accurate readings",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
  },
  {
    name: "Beta tester (features before public release)",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
  },
];
