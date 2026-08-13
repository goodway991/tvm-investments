export type StrategyId =
  | "dip_no_fundamental"
  | "oversold_technical"
  | "volume_momentum"
  | "support_bounce"
  | "relative_strength"
  | "catalyst_upside"
  | "gap_fill"
  | "short_squeeze";

export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockFundamentals {
  peRatio: number | null;
  beta: number | null;
  eps: number | null;
  marketCap: number | null;
  avgVolume: number | null;
  shortInterestPct: number | null;
}

export interface NewsHeadline {
  headline: string;
  source: string;
  datetime: string;
  url?: string;
}

export interface NewsClassification {
  cause: "company_specific" | "sector_market_wide" | "no_clear_cause";
  confidence: "high" | "medium" | "low";
  summary: string;
}

export interface StrategySignal {
  strategyId: StrategyId;
  strategyName: string;
  triggered: boolean;
  score: number;
  maxScore: number;
  detail: string;
  unavailable?: boolean;
}

export interface StockCandidate {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  fundamentals: StockFundamentals;
  ohlcv: OHLCVBar[];
  yearCloses?: OHLCVBar[];
  businessSummary?: string;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  headlines: NewsHeadline[];
  newsClassification?: NewsClassification;
  signals: StrategySignal[];
  compositeScore: number;
  maxCompositeScore: number;
  shortTermScore?: number;
  longTermScore?: number;
  indexMembership?: ("sp500" | "dow30")[];
  rank?: number;
}

export interface MarketMover extends StockCandidate {
  direction: "gainer" | "loser";
}

export interface MarketEvent {
  title: string;
  region: "US" | "Global" | "Tech";
  impact: "bullish" | "bearish" | "mixed";
  summary: string;
  date: string;
}

export interface CompanyReport {
  symbol: string;
  name: string;
  shortTermOutlook: string;
  longTermOutlook: string;
  recentEvents: string[];
  upsideDrivers: string[];
  downsideRisks: string[];
  cultureAndLongTerm: string;
  cultureAndLongTermPro?: string;
  fullReport: string;
}

export interface ScreenedStock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  changePercent: number;
  volume: number;
  compositeScore: number;
  shortTermScore: number;
  longTermScore: number;
  fundamentals: StockFundamentals;
  indexMembership?: ("sp500" | "dow30")[];
}

export interface SectorDive {
  id: string;
  sector: string;
  title: string;
  subtitle: string;
  body: string;
}

export interface DailySnapshot {
  id: string;
  date: string;
  generatedAt: string;
  dataMode: "demo" | "live";
  scanUniverse: { sp500: number; dow30: number; combined: number };
  screenedStocks: ScreenedStock[];
  topMovers: MarketMover[];
  topPicks: StockCandidate[];
  shortTermPicks: StockCandidate[];
  longTermPicks: StockCandidate[];
  reports: CompanyReport[];
  shortTermReports: CompanyReport[];
  longTermReports: CompanyReport[];
  marketEvents: MarketEvent[];
  sectorDives: SectorDive[];
  techSectorAnalysis: string;
  methodologyNote: string;
  disclaimer: string;
}

export interface BacktestEntry {
  date: string;
  symbol: string;
  pickRank: number;
  entryPrice: number;
  compositeScore: number;
  return1d: number | null;
  return1w: number | null;
  return1m: number | null;
  spReturn1d: number | null;
  spReturn1w: number | null;
  spReturn1m: number | null;
}

export interface BacktestSummary {
  totalDays: number;
  avgReturn1d: number;
  avgReturn1w: number;
  avgReturn1m: number;
  spAvgReturn1d: number;
  spAvgReturn1w: number;
  spAvgReturn1m: number;
  entries: BacktestEntry[];
}

export interface FilterCriteria {
  peMin?: number;
  peMax?: number;
  betaMin?: number;
  betaMax?: number;
  volumeMin?: number;
  epsMin?: number;
  marketCapMin?: number;
  marketCapMax?: number;
}

export const STRATEGY_WEIGHTS: Record<StrategyId, number> = {
  dip_no_fundamental: 0.18,
  oversold_technical: 0.14,
  volume_momentum: 0.12,
  support_bounce: 0.14,
  relative_strength: 0.12,
  catalyst_upside: 0.12,
  gap_fill: 0.1,
  short_squeeze: 0.08,
};

/** Short-term horizon: 0–5 days — technical & mean-reversion signals */
export const SHORT_TERM_WEIGHTS: Record<StrategyId, number> = {
  dip_no_fundamental: 0.22,
  oversold_technical: 0.2,
  volume_momentum: 0.16,
  support_bounce: 0.18,
  relative_strength: 0.08,
  catalyst_upside: 0.06,
  gap_fill: 0.08,
  short_squeeze: 0.02,
};

/** Long-term horizon: months — fundamentals, catalysts, relative strength */
export const LONG_TERM_WEIGHTS: Record<StrategyId, number> = {
  dip_no_fundamental: 0.06,
  oversold_technical: 0.08,
  volume_momentum: 0.06,
  support_bounce: 0.1,
  relative_strength: 0.22,
  catalyst_upside: 0.24,
  gap_fill: 0.04,
  short_squeeze: 0.04,
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastLoginAt: string;
  role: "client" | "admin";
}

export interface SavedInvestment {
  id?: string;
  userId: string;
  userEmail: string;
  symbol: string;
  amountUsd: number;
  entryPrice: number;
  scenarios: Record<string, unknown>;
  createdAt: string;
}

export const STRATEGY_NAMES: Record<StrategyId, string> = {
  dip_no_fundamental: "Dip with no fundamental cause",
  oversold_technical: "Oversold technical indicators",
  volume_momentum: "Volume & momentum confirmation",
  support_bounce: "Support level bounces",
  relative_strength: "Relative strength vs sector/market",
  catalyst_upside: "Catalyst-driven upside",
  gap_fill: "Gap fills",
  short_squeeze: "Short interest / squeeze setups",
};

export const STRATEGY_DETAILS: Record<StrategyId, string> = {
  dip_no_fundamental:
    "A stock drops on sector-wide news, a market-wide selloff, index rebalancing, or a sympathy move rather than its own earnings or business problems. If nothing about the company itself changed, the drop is often noise, and mean reversion is the bet. Company-specific problems (missed earnings, guidance cuts, lawsuits) are real repricing, not noise.",
  oversold_technical:
    "RSI dropping below 30, or price hitting the lower Bollinger Band, can mean a stock was sold off faster than its fundamentals justify, making a bounce more likely.",
  volume_momentum:
    "A drop on unusually low volume suggests weak conviction (easier to reverse). A drop on huge volume suggests real conviction, and possibly informed selling. Reversals often show volume drying up, then a fresh buying spike.",
  support_bounce:
    "Stocks often have price levels from past trading where buyers historically stepped in. Falling toward a well-established support level, especially one it has bounced off before, is a common setup.",
  relative_strength:
    "If the market or sector is down 2% but a stock is down 5%, it is underperforming and worth investigating. If a stock is down 2% while its sector is down 5%, it is outperforming and may be the stronger name once the sector turns.",
  catalyst_upside:
    "Rather than reacting to a drop, look for a scheduled or just-reported catalyst: earnings beat, FDA approval, contract win, analyst upgrade, or insider buying. Unusual options activity is limited on the free data tier, so this signal uses headline scanning.",
  gap_fill:
    "When a stock gaps down at the open without new negative news overnight, there is a common pattern of it filling the gap — drifting back toward the previous close during the session.",
  short_squeeze:
    "Stocks with high short interest that start moving up can trigger short covering, forcing more buying. Live short-interest and options-flow feeds are paid (Ortex, Unusual Whales) or biweekly (FINRA), so this signal stays visible but is marked limited on the free tier.",
};
