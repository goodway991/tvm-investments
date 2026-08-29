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

/** Liquid index, sector, and theme funds people actually look up. */
export const CORE_ETFS = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF" },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF" },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF" },
  { symbol: "VTV", name: "Vanguard Value ETF" },
  { symbol: "IWF", name: "iShares Russell 1000 Growth ETF" },
  { symbol: "XLK", name: "Technology Select Sector SPDR" },
  { symbol: "XLF", name: "Financial Select Sector SPDR" },
  { symbol: "XLE", name: "Energy Select Sector SPDR" },
  { symbol: "XLV", name: "Health Care Select Sector SPDR" },
  { symbol: "XLI", name: "Industrial Select Sector SPDR" },
  { symbol: "XLY", name: "Consumer Discretionary Select Sector SPDR" },
  { symbol: "XLP", name: "Consumer Staples Select Sector SPDR" },
  { symbol: "XLU", name: "Utilities Select Sector SPDR" },
  { symbol: "XLB", name: "Materials Select Sector SPDR" },
  { symbol: "XLRE", name: "Real Estate Select Sector SPDR" },
  { symbol: "XLC", name: "Communication Services Select Sector SPDR" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF" },
  { symbol: "SOXX", name: "iShares Semiconductor ETF" },
  { symbol: "ARKK", name: "ARK Innovation ETF" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF" },
  { symbol: "HYG", name: "iShares iBoxx High Yield Corporate Bond ETF" },
  { symbol: "GLD", name: "SPDR Gold Trust" },
  { symbol: "SLV", name: "iShares Silver Trust" },
  { symbol: "USO", name: "United States Oil Fund" },
  { symbol: "UNG", name: "United States Natural Gas Fund" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets ETF" },
  { symbol: "EWZ", name: "iShares MSCI Brazil ETF" },
  { symbol: "FXI", name: "iShares China Large-Cap ETF" },
  { symbol: "KWEB", name: "KraneShares CSI China Internet ETF" },
  { symbol: "IBIT", name: "iShares Bitcoin Trust" },
  { symbol: "BITO", name: "ProShares Bitcoin Strategy ETF" },
  { symbol: "TQQQ", name: "ProShares UltraPro QQQ" },
  { symbol: "SQQQ", name: "ProShares UltraPro Short QQQ" },
] as const;

/** Smaller and higher-beta names that the large-cap scan used to drop. */
export const LIBRARY_EXTRA = [
  { symbol: "RANI", name: "Rani Therapeutics" },
  { symbol: "OPEN", name: "Opendoor Technologies" },
  { symbol: "PLUG", name: "Plug Power" },
  { symbol: "NIO", name: "NIO Inc." },
  { symbol: "LCID", name: "Lucid Group" },
  { symbol: "RIVN", name: "Rivian Automotive" },
  { symbol: "SNAP", name: "Snap Inc." },
  { symbol: "AMC", name: "AMC Entertainment" },
  { symbol: "GME", name: "GameStop" },
  { symbol: "BB", name: "BlackBerry" },
  { symbol: "NOK", name: "Nokia" },
  { symbol: "SIRI", name: "Sirius XM" },
  { symbol: "SOUN", name: "SoundHound AI" },
  { symbol: "BBAI", name: "BigBear.ai" },
  { symbol: "IONQ", name: "IonQ" },
  { symbol: "RKLB", name: "Rocket Lab" },
  { symbol: "JOBY", name: "Joby Aviation" },
  { symbol: "ASTS", name: "AST SpaceMobile" },
  { symbol: "LUNR", name: "Intuitive Machines" },
  { symbol: "MARA", name: "MARA Holdings" },
  { symbol: "RIOT", name: "Riot Platforms" },
  { symbol: "CLSK", name: "CleanSpark" },
  { symbol: "HUT", name: "Hut 8" },
  { symbol: "CIFR", name: "Cipher Mining" },
  { symbol: "ACHR", name: "Archer Aviation" },
  { symbol: "UAMY", name: "United States Antimony" },
  { symbol: "SERV", name: "Serve Robotics" },
  { symbol: "RR", name: "Richtech Robotics" },
  { symbol: "NU", name: "Nu Holdings" },
  { symbol: "GRAB", name: "Grab Holdings" },
  { symbol: "PFE", name: "Pfizer" },
  { symbol: "INTC", name: "Intel Corporation" },
] as const;

/** Names shown in the Watchlist grid beyond today’s scan. */
export const LIBRARY_BROWSE = [
  ...POPULAR_WATCHLIST,
  ...CORE_ETFS,
  ...LIBRARY_EXTRA,
].filter(
  (row, index, list) =>
    list.findIndex((item) => item.symbol === row.symbol) === index,
);

export const LIBRARY_SEED_SYMBOLS = LIBRARY_BROWSE.map((row) => row.symbol);

/** Target size for the weekday research scan. */
export const SCAN_UNIVERSE_LIMIT = 2800;
export const SCAN_LARGE_CAP = 1400;
export const SCAN_SMALL_CAP = 700;
export const SCAN_ETF_LIMIT = 400;

/** Fallback research scan: S&P 500 + Dow 30 + extras + ETFs. */
export const YAHOO_SCAN_UNIVERSE: string[] = Array.from(
  new Set([
    ...SP500,
    ...DOW_30,
    ...WATCHLIST_EXTRA_SYMBOLS,
    ...LIBRARY_SEED_SYMBOLS,
  ]),
).sort();

export const WATCHLIST_ALLOWED_SYMBOLS = YAHOO_SCAN_UNIVERSE;
