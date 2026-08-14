import { DOW_30, SP500 } from "@/lib/indices/constituents";

/** Household names shown in the Watchlist available-stocks grid. */
export const POPULAR_WATCHLIST = [
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "NFLX", name: "Netflix, Inc." },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "CRM", name: "Salesforce, Inc." },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "QCOM", name: "Qualcomm Inc." },
  { symbol: "AMAT", name: "Applied Materials" },
  { symbol: "PLTR", name: "Palantir Technologies" },
  { symbol: "UBER", name: "Uber Technologies" },
  { symbol: "COIN", name: "Coinbase Global" },
  { symbol: "HOOD", name: "Robinhood Markets" },
  { symbol: "SOFI", name: "SoFi Technologies" },
  { symbol: "RIVN", name: "Rivian Automotive" },
  { symbol: "ARM", name: "Arm Holdings" },
  { symbol: "MSTR", name: "Strategy Inc." },
  { symbol: "SHOP", name: "Shopify Inc." },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "BAC", name: "Bank of America" },
  { symbol: "GS", name: "Goldman Sachs" },
  { symbol: "BRK-B", name: "Berkshire Hathaway" },
  { symbol: "LLY", name: "Eli Lilly" },
  { symbol: "UNH", name: "UnitedHealth Group" },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "COST", name: "Costco Wholesale" },
  { symbol: "HD", name: "Home Depot" },
  { symbol: "PG", name: "Procter & Gamble" },
  { symbol: "KO", name: "Coca-Cola" },
  { symbol: "PEP", name: "PepsiCo, Inc." },
  { symbol: "NKE", name: "Nike, Inc." },
  { symbol: "DIS", name: "Walt Disney" },
  { symbol: "XOM", name: "Exxon Mobil" },
  { symbol: "CVX", name: "Chevron Corporation" },
  { symbol: "BA", name: "Boeing Company" },
  { symbol: "CAT", name: "Caterpillar Inc." },
] as const;

export const POPULAR_WATCHLIST_SYMBOLS = POPULAR_WATCHLIST.map(
  (stock) => stock.symbol,
);

/** Popular liquid names that are not always in the S&P 500 snapshot list. */
export const WATCHLIST_EXTRA_SYMBOLS = [
  "ARM",
  "COIN",
  "HOOD",
  "MSTR",
  "RIVN",
  "SHOP",
  "SOFI",
] as const;

/** Target size for the weekday research scan. */
export const SCAN_UNIVERSE_LIMIT = 1500;

/** Fallback research scan: S&P 500 + Dow 30 + extras. */
export const YAHOO_SCAN_UNIVERSE: string[] = Array.from(
  new Set([...SP500, ...DOW_30, ...WATCHLIST_EXTRA_SYMBOLS]),
).sort();

export const WATCHLIST_ALLOWED_SYMBOLS = YAHOO_SCAN_UNIVERSE;
