import { showTvm10Labs } from "@/lib/beta-labs";

export const PLAN_PRICES = {
  pro: {
    monthly: { perMonth: 12, billed: 12 },
    yearly: { perMonth: 8, billed: 96 },
  },
  ultra: {
    monthly: { perMonth: 35, billed: 35 },
    yearly: { perMonth: 25, billed: 300 },
  },
} as const;

export type PaidPlanId = keyof typeof PLAN_PRICES;
export type BillingInterval = "monthly" | "yearly";

export function priceFor(plan: PaidPlanId, interval: BillingInterval) {
  const prices = PLAN_PRICES[plan] ?? PLAN_PRICES.pro;
  return prices[interval] ?? prices.monthly;
}

export function yearlySavingsPercent(plan: PaidPlanId = "pro") {
  const prices = PLAN_PRICES[plan] ?? PLAN_PRICES.pro;
  const monthlyAnnual = prices.monthly.perMonth * 12;
  return Math.round((1 - prices.yearly.billed / monthlyAnnual) * 100);
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
export const FREE_WEEKLY_PULSE_PREDICT_LIMIT = 2;
export const PRO_WEEKLY_PULSE_PREDICT_LIMIT = 5;
export const PRO_WEEKLY_SCORE_PREDICT_LIMIT = 3;
export const PRO_WEEKLY_ADDITION_PREDICT_LIMIT = 1;
export const PRO_WEEKLY_HORIZON_PREDICT_LIMIT = 5;

export function watchlistLimitForPlan(plan: PlanId) {
  if (plan === "ultra") return ULTRA_WATCHLIST_LIMIT;
  if (plan === "pro") return PRO_WATCHLIST_LIMIT;
  return FREE_WATCHLIST_LIMIT;
}

export function planHasPro(plan: PlanId) {
  return plan === "pro" || plan === "ultra";
}

export function sectorDiveLimit(plan: PlanId) {
  if (showTvm10Labs() || planHasPro(plan)) {
    return Number.POSITIVE_INFINITY;
  }
  return FREE_SECTOR_DIVE_LIMIT;
}

export function overlayLabsPlan(
  role: "client" | "admin",
  stored: string | undefined,
): PlanId {
  const base: PlanId = stored === "pro" || stored === "ultra" ? stored : "free";
  if (!showTvm10Labs()) return base === "ultra" ? "pro" : base;
  if (role === "admin") return "ultra";
  return base;
}

/** Flip these to true when a coming-soon feature ships for everyone. */
export const PREVIEW_UNLOCK = {
  archiveCalendar: false,
  horizonSuite: true,
  portfolio: true,
} as const;

export type PreviewFeature = keyof typeof PREVIEW_UNLOCK;

export function canUsePreviewFeature(
  role: "client" | "admin",
  feature: PreviewFeature,
) {
  return role === "admin" || PREVIEW_UNLOCK[feature];
}

export type FeatureFamily =
  | "movers"
  | "sectors"
  | "pulse"
  | "score_predicts"
  | "addition_predicts"
  | "horizon_predicts"
  | "watchlist"
  | "prediction_quality";

export type PlanFeature = {
  name: string;
  free: boolean;
  pro: boolean;
  ultra?: boolean;
  labsOnly?: boolean;
  hideInLabs?: boolean;
  family?: FeatureFamily;
  rank?: number;
};

export const PLAN_FEATURES: PlanFeature[] = [
  { name: "8-signal screener", free: true, pro: true },
  { name: "Top 10 daily movers", free: true, pro: true, family: "movers", rank: 1 },
  { name: "Top 20 daily movers", free: false, pro: true, family: "movers", rank: 2 },
  { name: "Archive Calendar", free: false, pro: true, hideInLabs: true },
  { name: "Flagged-pick research reports", free: true, pro: true },
  { name: "Short-term and long-term scores on each pick", free: true, pro: true },
  {
    name: "Two sector deep dives",
    free: true,
    pro: true,
    hideInLabs: true,
    family: "sectors",
    rank: 1,
  },
  {
    name: "Full sector deep-dive deck",
    free: false,
    pro: true,
    hideInLabs: true,
    family: "sectors",
    rank: 2,
  },
  {
    name: "All 11 sector deep dives (cyclical & defensive)",
    free: true,
    pro: true,
    ultra: true,
    labsOnly: true,
    family: "sectors",
    rank: 3,
  },
  { name: "Ticker news on watched names", free: true, pro: true },
  { name: "Portfolio", free: false, pro: true },
  {
    name: "Portfolio book review",
    free: false,
    pro: true,
    hideInLabs: true,
  },
  {
    name: "2 Pulse Predicts / week (watchlist)",
    free: true,
    pro: true,
    ultra: true,
    labsOnly: true,
    family: "pulse",
    rank: 1,
  },
  {
    name: "5 Pulse Predicts / week",
    free: false,
    pro: true,
    ultra: true,
    labsOnly: true,
    family: "pulse",
    rank: 2,
  },
  {
    name: "Unlimited Pulse Predicts",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
    family: "pulse",
    rank: 3,
  },
  {
    name: "3 Portfolio Score Predictions / week",
    free: false,
    pro: true,
    ultra: true,
    labsOnly: true,
    family: "score_predicts",
    rank: 1,
  },
  {
    name: "Unlimited Portfolio Score Predictions",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
    family: "score_predicts",
    rank: 2,
  },
  {
    name: "1 Portfolio Addition Prediction / week",
    free: false,
    pro: true,
    ultra: true,
    labsOnly: true,
    family: "addition_predicts",
    rank: 1,
  },
  {
    name: "Unlimited Portfolio Addition Predictions",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
    family: "addition_predicts",
    rank: 2,
  },
  {
    name: "Short-term path prediction",
    free: false,
    pro: true,
    hideInLabs: true,
  },
  { name: "Horizon Suite", free: false, pro: true },
  {
    name: "5 Horizon Suite predictions / week",
    free: false,
    pro: true,
    ultra: true,
    labsOnly: true,
    family: "horizon_predicts",
    rank: 1,
  },
  {
    name: "Unlimited Horizon Suite predictions",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
    family: "horizon_predicts",
    rank: 2,
  },
  {
    name: "Advanced Predictions (workstation)",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
  },
  { name: "Watchlist of 10 symbols", free: true, pro: true, family: "watchlist", rank: 1 },
  { name: "Watchlist of 100 symbols", free: false, pro: true, family: "watchlist", rank: 2 },
  {
    name: "Watchlist of 500 symbols",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
    family: "watchlist",
    rank: 3,
  },
  { name: "Edit watchlist anytime (no 7-day lock)", free: false, pro: true },
  { name: "Separate short-term and long-term pick lists", free: false, pro: true },
  { name: "Gemini culture and long-term write-up", free: false, pro: true },
  { name: "Live weekday news-scored snapshot", free: false, pro: true },
  { name: "Full backtest track record", free: false, pro: true },
  {
    name: "Decent short-term predictions",
    free: true,
    pro: false,
    ultra: false,
    labsOnly: true,
    family: "prediction_quality",
    rank: 1,
  },
  {
    name: "Non-algorithm based predictions",
    free: false,
    pro: true,
    ultra: false,
    labsOnly: true,
    family: "prediction_quality",
    rank: 2,
  },
  {
    name: "Algorithm-based 99%* accuracy predictions",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
    family: "prediction_quality",
    rank: 3,
  },
  {
    name: "Beta tester (features before public release)",
    free: false,
    pro: false,
    ultra: true,
    labsOnly: true,
  },
];

export function planIncludesFeature(feature: PlanFeature, plan: PlanId) {
  if (plan === "ultra") return feature.ultra ?? feature.pro;
  if (plan === "pro") return feature.pro;
  return feature.free;
}

export function planFeatureMark(
  feature: PlanFeature,
  plan: PlanId,
  catalog: PlanFeature[] = PLAN_FEATURES,
): "yes" | "better" | "no" {
  if (planIncludesFeature(feature, plan)) return "yes";
  if (!feature.family || feature.rank == null) return "no";
  const best = catalog
    .filter((row) => row.family === feature.family && planIncludesFeature(row, plan))
    .reduce((max, row) => Math.max(max, row.rank ?? 0), 0);
  return best > feature.rank ? "better" : "no";
}
